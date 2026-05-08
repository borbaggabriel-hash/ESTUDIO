import type { Express, Request, Response } from "express";

declare module "express" {
  interface Request {
    params: Record<string, string>;
  }
}
import type { Server } from "http";
import { storage } from "./storage";
import { rooms, broadcast } from "./video-sync";
import { z } from "zod";
import { db } from "./db";
import { eq, and, ne } from "drizzle-orm";
import {
  productions, characters, takes, users, studios, sessions, studioMemberships, userStudioRoles,
  notifications, sessionParticipants,
  hubBanners, hubModules, hubTeachers, hubLearnings, hubTestimonials, hubFaqs, hubSettings,
  hubEnrollments, studentProfiles, studentEnrollments, studentMessages, studentInvoices,
  studentSupport, studentAgenda, studentActivity,
  type Production, type Session,
  insertProductionSchema, insertCharacterSchema, insertTakeSchema, insertSessionSchema,
} from "@shared/schema";
import { normalizePlatformRole } from "@shared/roles";
import { sanitizeUser, sanitizeUsers } from "./lib/sanitize";
import { requireAuth, requireAdmin, requireStudioAccess, requireStudioRole } from "./middleware/auth";
import { hashPassword } from "./replit_integrations/auth/replitAuth";
import { logger } from "./lib/logger";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import {
  checkSupabaseConnection,
  configureSupabase,
  deleteFromSupabaseStorage,
  downloadFromSupabaseStorageUrl,
  isSupabaseConfigured,
  parseSupabaseStorageUrl,
  uploadToSupabaseStorage,
} from "./lib/supabase";
import { trimWavBuffer } from "./lib/audio-trim";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const mediaJobsDir = path.join(process.cwd(), "public", "media-jobs");
fs.mkdirSync(mediaJobsDir, { recursive: true });

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const original = file.originalname || "media";
      const safe = original.replace(/[^a-zA-Z0-9_.\-]/g, "");
      const ext = path.extname(safe);
      const base = safe.slice(0, Math.max(0, safe.length - ext.length));
      cb(null, `${base || "media"}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 },
});

function safeAudioPath(audioUrl: string): string | null {
  const normalized = audioUrl.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", normalized);
  const uploadsBase = path.resolve(process.cwd(), "public", "uploads");
  if (!resolved.startsWith(uploadsBase)) return null;
  return resolved;
}

function isHttpUrl(input: string) {
  return /^https?:\/\//i.test(String(input || ""));
}

function filenameFromAudioUrl(audioUrl: string, fallback = "take.wav") {
  const raw = String(audioUrl || "").trim();
  if (!raw) return fallback;
  if (!isHttpUrl(raw)) {
    const base = path.basename(raw);
    return base || fallback;
  }
  try {
    const u = new URL(raw);
    const base = path.basename(u.pathname);
    return base || fallback;
  } catch {
    const parts = raw.split("/");
    return parts[parts.length - 1] || fallback;
  }
}

function toNodeReadable(body: any) {
  if (!body) return null;
  try {
    return Readable.fromWeb(body);
  } catch {
    return null;
  }
}

function sendFileWithRange(req: Request, res: Response, filePath: string, contentType = "audio/wav") {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = String(req.headers.range || "");
  res.setHeader("Accept-Ranges", "bytes");

  if (!range) {
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(total));
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const m = range.match(/bytes=(\d+)-(\d+)?/);
  if (!m) {
    res.status(416);
    res.setHeader("Content-Range", `bytes */${total}`);
    res.end();
    return;
  }

  const start = Math.min(total - 1, Math.max(0, Number(m[1] || 0)));
  const endRaw = m[2] ? Number(m[2]) : total - 1;
  const end = Math.min(total - 1, Math.max(start, endRaw));
  const chunkSize = end - start + 1;

  res.status(206);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
  res.setHeader("Content-Length", String(chunkSize));
  fs.createReadStream(filePath, { start, end }).pipe(res);
}

async function fetchAudioResponse(audioUrl: string, range?: string) {
  if (isSupabaseConfigured() && parseSupabaseStorageUrl(audioUrl)) {
    return await downloadFromSupabaseStorageUrl(audioUrl, { range });
  }
  const res = await fetch(audioUrl, { headers: range ? { range } : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text}`.trim());
  }
  return res;
}

function safeJobId(jobId: string): string | null {
  const cleaned = jobId.replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!cleaned || cleaned.length < 8) return null;
  return cleaned;
}

function normalizeSegment(input: string) {
  const raw = (input || "").trim() || "sem_nome";
  const noAccents = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const snake = noAccents
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return snake || "sem_nome";
}

function normalizeTokenUpper(input: string) {
  const raw = (input || "").trim() || "SEM_NOME";
  const noAccents = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const token = noAccents
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return token || "SEM_NOME";
}

function normalizeTimecodeToken(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  return digits || "000000000";
}

function secondsToTimecodeToken(seconds: number) {
  const totalMs = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const hh = String(Math.floor(totalMs / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0");
  const ms = String(totalMs % 1000).padStart(3, "0");
  return `${hh}${mm}${ss}${ms}`;
}

function jobStatusPath(jobId: string): string {
  return path.join(mediaJobsDir, jobId, "status.json");
}

function ensureJobDir(jobId: string): string {
  const dir = path.join(mediaJobsDir, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function logAdminAction(req: Request, action: string, details?: string) {
  try {
    const userId = (req as any).user?.id;
    await storage.createAuditLog({ userId, action, details });
  } catch (err) {
    logger.warn("Failed to write audit log", { action, error: String(err) });
  }
}

async function verifyProductionAccess(req: Request, res: Response, productionId: string): Promise<Production | null> {
  const prod = await storage.getProduction(productionId);
  if (!prod) { res.status(404).json({ message: "Producao nao encontrada" }); return null; }
  const user = (req as any).user!;
  const userRole = normalizePlatformRole(user.role);
  if (userRole === "platform_owner" || userRole === "diretor" || (prod as any).isPublic) return prod;
  const hasAccess = await storage.verifyUserStudioAccess(user.id, prod.studioId);
  if (!hasAccess) { res.status(403).json({ message: "Acesso negado" }); return null; }
  return prod;
}

async function verifySessionAccess(req: Request, res: Response, sessionId: string): Promise<Session | null> {
  const session = await storage.getSession(sessionId);
  if (!session) { res.status(404).json({ message: "Sessao nao encontrada" }); return null; }
  const user = (req as any).user!;
  const userRole = normalizePlatformRole(user.role);
  if (userRole === "platform_owner" || userRole === "diretor") return session;
  const hasAccess = await storage.verifyUserStudioAccess(user.id, session.studioId);
  if (!hasAccess) { res.status(403).json({ message: "Acesso negado" }); return null; }
  return session;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // NOTIFICATIONS
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const userId = (req as any).user!.id;
    const notifs = await storage.getNotifications(userId);
    res.status(200).json(notifs);
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const userId = (req as any).user!.id;
    const count = await storage.getUnreadNotificationCount(userId);
    res.status(200).json({ count });
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.status(200).json({ ok: true });
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    const userId = (req as any).user!.id;
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    res.status(200).json({ ok: true });
  });

  // PROFILE
  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      const allowed = ["firstName", "lastName", "displayName", "artistName", "phone", "city", "state", "bio", "experience", "specialty", "mainLanguage", "portfolioUrl"];
      const updates: Record<string, any> = {};
      for (const field of allowed) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const updated = await storage.updateUser(userId, updates);
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Falha ao atualizar perfil" });
    }
  });

  app.post("/api/media-jobs", mediaUpload.single("media"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Arquivo não enviado" });

      const filename = path.basename(req.file.path);
      const publicRel = `/uploads/${filename}`;
      const inputPath = safeAudioPath(publicRel);
      if (!inputPath || !fs.existsSync(inputPath)) {
        return res.status(400).json({ message: "Falha ao salvar arquivo" });
      }

      const jobId = randomUUID();
      ensureJobDir(jobId);

      const initialStatus = {
        job_id: jobId,
        status: "queued",
        step: "queued",
        progress: 0,
        message: null,
        error: null,
        outputs: null,
      };
      fs.writeFileSync(jobStatusPath(jobId), JSON.stringify(initialStatus, null, 2));

      const workerScript = path.join(process.cwd(), "services", "media-pipeline", "worker.py");
      const venvPython = path.join(process.cwd(), "services", "media-pipeline", ".venv", "bin", "python");
      const python = process.env.PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : "python3");
      const bundledFfmpeg = path.join(process.cwd(), "services", "media-pipeline", "bin", "ffmpeg");
      const ffmpegPath = process.env.FFMPEG_PATH || (fs.existsSync(bundledFfmpeg) ? bundledFfmpeg : "ffmpeg");
      const jobDir = ensureJobDir(jobId);
      const outLogPath = path.join(jobDir, "worker.log");
      const errLogPath = path.join(jobDir, "worker.err.log");
      const outFd = fs.openSync(outLogPath, "a");
      const errFd = fs.openSync(errLogPath, "a");
      const child = spawn(
        python,
        [workerScript, "--job-id", jobId, "--input", publicRel],
        {
          detached: true,
          stdio: ["ignore", outFd, errFd],
          env: {
            ...process.env,
            VHUB_REPO_ROOT: process.cwd(),
            VHUB_PUBLIC_DIR: path.join(process.cwd(), "public"),
            VHUB_MEDIA_JOBS_DIR: path.join(process.cwd(), "public", "media-jobs"),
            VHUB_UPLOADS_DIR: path.join(process.cwd(), "public", "uploads"),
            VHUB_PIPELINE_STRICT: "1",
            FFMPEG_PATH: ffmpegPath,
          },
        },
      );
      try { fs.closeSync(outFd); } catch {}
      try { fs.closeSync(errFd); } catch {}
      child.on("error", (e: any) => {
        try {
          const failed = {
            job_id: jobId,
            status: "failed",
            step: "error",
            progress: 1,
            message: null,
            error: e?.message || "Falha ao iniciar worker",
            outputs: null,
          };
          fs.writeFileSync(jobStatusPath(jobId), JSON.stringify(failed, null, 2));
        } catch {}
      });
      child.unref();

      res.status(201).json({ jobId, input: publicRel, statusUrl: `/api/media-jobs/${jobId}` });
    } catch (err: any) {
      logger.error("[Media Pipeline] Create job error", { message: err?.message });
      res.status(500).json({ message: err?.message || "Erro ao criar job" });
    }
  });

  app.get("/api/media-jobs/:jobId", async (req, res) => {
    try {
      const jobId = safeJobId(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Job inválido" });
      const p = jobStatusPath(jobId);
      if (!fs.existsSync(p)) return res.status(404).json({ message: "Job não encontrado" });
      const raw = fs.readFileSync(p, "utf-8");
      res.status(200).json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao consultar job" });
    }
  });

  // STUDIOS
  app.get("/api/studios", requireAuth, async (req, res) => {
    const user = (req as any).user!;
    const userRole = normalizePlatformRole(user.role);
    if (userRole === "platform_owner") {
      const allStudios = await storage.getStudios();
      const studiosWithRoles = await Promise.all(
        allStudios.map(async (s) => ({ ...s, userRoles: [userRole] }))
      );
      return res.status(200).json(studiosWithRoles);
    }
    const userStudios = await storage.getStudiosForUser(user.id);
    const studiosWithRoles = await Promise.all(
      userStudios.map(async (s) => {
        const roles = await storage.getUserRolesInStudio(user.id, s.id);
        return { ...s, userRoles: roles };
      })
    );
    res.status(200).json(studiosWithRoles);
  });

  app.get("/api/studios/:studioId", requireAuth, requireStudioAccess, async (req, res) => {
    const studio = await storage.getStudio(req.params.studioId);
    if (!studio) return res.status(404).json({ message: "Estudio nao encontrado" });
    res.status(200).json(studio);
  });

  const studioProfilePatchSchema = z.object({
    data: z.record(z.any()),
  }).strict();

  app.get("/api/studios/:studioId/profile", requireAuth, requireStudioAccess, async (req, res) => {
    try {
      const profile = await storage.getStudioProfile(req.params.studioId);
      return res.status(200).json({ profile });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Erro ao buscar perfil do estudio" });
    }
  });

  app.patch("/api/studios/:studioId/profile", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const parsed = studioProfilePatchSchema.parse(req.body || {});
      const profile = await storage.upsertStudioProfile(req.params.studioId, parsed.data || {});
      return res.status(200).json({ profile });
    } catch (err: any) {
      if (err?.errors) {
        return res.status(400).json({ message: err.errors?.[0]?.message || "Dados invalidos" });
      }
      return res.status(500).json({ message: err?.message || "Erro ao atualizar perfil do estudio" });
    }
  });

  app.post("/api/studios", requireAuth, requireAdmin, async (req, res) => {
    try {
      const body = req.body;
      const name = body.name;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Nome do estudio e obrigatorio" });
      }
      const studioAdminUserId = body.studioAdminUserId || null;
      if (studioAdminUserId) {
        const adminUser = await storage.getUser(studioAdminUserId);
        if (!adminUser) return res.status(400).json({ message: "Usuario admin nao encontrado" });
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
      const ownerId = (req as any).user.id;
      const studioData: any = { name, slug, ownerId };
      const studio = await storage.createStudio(studioData, ownerId, studioAdminUserId || undefined);

      const profileKeys = [
        "tradeName",
        "cnpj",
        "legalRepresentative",
        "email",
        "phone",
        "altPhone",
        "street",
        "addressNumber",
        "complement",
        "neighborhood",
        "city",
        "state",
        "zipCode",
        "country",
        "recordingRooms",
        "studioType",
        "website",
        "instagram",
        "linkedin",
        "description",
        "foundedYear",
        "employeeCount",
      ] as const;

      const profilePatch: Record<string, any> = {};
      for (const k of profileKeys) {
        const v = (body as any)[k];
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed) profilePatch[k] = trimmed;
        } else if (typeof v === "number" && Number.isFinite(v)) {
          profilePatch[k] = v;
        } else if (v !== null && v !== undefined && v !== "") {
          profilePatch[k] = v;
        }
      }
      if (Object.keys(profilePatch).length) {
        await storage.upsertStudioProfile(studio.id, profilePatch);
      }
      if (studioAdminUserId) {
        await storage.createNotification({
          userId: studioAdminUserId,
          type: "membership_approved",
          title: "Novo Estudio",
          message: `Voce foi designado como Admin do estudio "${name}".`,
          isRead: false,
          relatedId: studio.id,
        });
      }
      await logAdminAction(req, "CREATE_STUDIO", `Criou estudio "${name}"`);
      res.status(201).json(studio);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.get("/api/studios/:studioId/my-role", requireAuth, requireStudioAccess, async (req, res) => {
    res.status(200).json({ role: req.studioRole || null, roles: req.studioRoles || [] });
  });

  // STUDIO MEMBERS
  app.get("/api/studios/:studioId/members", requireAuth, requireStudioAccess, async (req, res) => {
    const members = await storage.getStudioMemberships(req.params.studioId);
    res.status(200).json(members);
  });

  app.post("/api/studios/:studioId/members/:membershipId/approve", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const validRoles = z.enum(["studio_admin", "diretor", "dublador"]);
      const body = z.object({
        role: validRoles.optional(),
        roles: z.array(validRoles).optional(),
      }).parse(req.body);
      const roles = body.roles || (body.role ? [body.role] : []);
      if (roles.length === 0) return res.status(400).json({ message: "Pelo menos um papel e obrigatorio" });
      const membership = await storage.getMembership(req.params.membershipId);
      if (!membership || membership.studioId !== req.params.studioId) {
        return res.status(404).json({ message: "Membro nao encontrado" });
      }
      const updated = await db.transaction(async (tx) => {
        const [upd] = await tx.update(studioMemberships)
          .set({ status: "approved", role: roles[0] })
          .where(eq(studioMemberships.id, req.params.membershipId))
          .returning();
        await tx.delete(userStudioRoles).where(eq(userStudioRoles.membershipId, req.params.membershipId));
        if (roles.length > 0) {
          await tx.insert(userStudioRoles).values(roles.map(role => ({ membershipId: req.params.membershipId, role })));
        }
        await tx.update(users).set({ status: "approved" }).where(eq(users.id, membership.userId));
        await tx.insert(notifications).values({
          userId: membership.userId,
          type: "membership_approved",
          title: "Membro aprovado",
          message: `Sua solicitacao de adesao ao estudio foi aprovada com papeis: ${roles.join(", ")}.`,
          isRead: false,
          relatedId: req.params.studioId,
        });
        return upd;
      });
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.post("/api/studios/:studioId/members/:membershipId/reject", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    const membership = await storage.getMembership(req.params.membershipId);
    if (!membership || membership.studioId !== req.params.studioId) {
      return res.status(404).json({ message: "Membro nao encontrado" });
    }
    const updated = await storage.updateMembershipStatus(req.params.membershipId, "rejected");
    await storage.updateUserStatus(membership.userId, "rejected");
    await storage.createNotification({
      userId: membership.userId,
      type: "membership_rejected",
      title: "Solicitacao rejeitada",
      message: "Sua solicitacao de adesao ao estudio foi rejeitada.",
      isRead: false,
      relatedId: req.params.studioId,
    });
    res.status(200).json(updated);
  });

  // MEMBERS - UPDATE ROLES
  app.put("/api/studios/:studioId/members/:membershipId/roles", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const { roles } = req.body;
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: "Papeis invalidos" });
      }
      const membership = await storage.getMembership(req.params.membershipId);
      if (!membership || membership.studioId !== req.params.studioId) {
        return res.status(404).json({ message: "Membro nao encontrado" });
      }
      await storage.setUserStudioRoles(req.params.membershipId, roles);
      await storage.updateMembershipStatus(req.params.membershipId, "approved", roles[0]);
      
      // Note: diretor is a studio-level role only — no global role promotion
      
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao atualizar papeis" });
    }
  });

  // MEMBERS - CREATE USER & ENROLL
  app.post("/api/studios/:studioId/members/create-user", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const { fullName, email, password, phone, roles } = z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        roles: z.array(z.enum(["studio_admin", "diretor", "dublador"])).min(1),
      }).parse(req.body);

      const { hashPassword } = await import("./replit_integrations/auth/replitAuth");
      const { authStorage } = await import("./replit_integrations/auth/storage");

      const existing = await authStorage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email ja em uso" });

      const newUser = await authStorage.createUser({
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        fullName,
        displayName: fullName,
        phone: phone || null,
        role: "dublador",
        status: "approved",
      });

      const membership = await storage.createMembership({
        userId: newUser.id,
        studioId: req.params.studioId,
        role: roles[0],
        status: "approved",
      });

      await storage.setUserStudioRoles(membership.id, roles);

      res.status(201).json({ user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName }, membership });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro ao criar usuario" });
    }
  });

  // MEMBERS - REMOVE
  app.delete("/api/studios/:studioId/members/:membershipId", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const membership = await storage.getMembership(req.params.membershipId);
      if (!membership || membership.studioId !== req.params.studioId) {
        return res.status(404).json({ message: "Membro nao encontrado" });
      }
      await db.delete(userStudioRoles).where(eq(userStudioRoles.membershipId, req.params.membershipId));
      await db.delete(studioMemberships).where(eq(studioMemberships.id, req.params.membershipId));
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao remover membro" });
    }
  });

  app.post("/api/studios/:studioId/join", requireAuth, async (req, res) => {
    const user = (req as any).user!;
    const existing = await storage.getMembershipsByUser(user.id);
    const alreadyMember = existing.some(m => m.studioId === req.params.studioId);
    if (alreadyMember) return res.status(409).json({ message: "Voce ja e membro deste estudio" });
    const membership = await storage.createMembership({
      userId: user.id,
      studioId: req.params.studioId,
      role: "pending",
      status: "pending",
    });
    const studioAdmins = await storage.getStudioMemberships(req.params.studioId);
    for (const m of studioAdmins) {
      if (m.role === "diretor" || (req.studioRoles || []).includes("diretor")) {
        await storage.createNotification({
          userId: m.userId,
          type: "join_request",
          title: "Nova solicitacao de membro",
          message: `Um usuario solicitou adesao ao estudio.`,
          isRead: false,
          relatedId: req.params.studioId,
        });
      }
    }
    res.status(201).json(membership);
  });

  // STUDIO STATS
  app.get("/api/studios/:studioId/stats", requireAuth, requireStudioAccess, async (req, res) => {
    try {
      const stats = await storage.getStudioStats(req.params.studioId);
      res.status(200).json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao buscar stats" });
    }
  });

  // STUDIO PENDING MEMBERS
  app.get("/api/studios/:studioId/pending-members", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const pending = await storage.getPendingMembersForStudio(req.params.studioId);
      res.status(200).json(pending);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao buscar membros pendentes" });
    }
  });

  // PRODUCTIONS
  app.get("/api/productions/public", requireAuth, async (req, res) => {
    const publicProds = await storage.getPublicProductions();
    res.status(200).json(publicProds);
  });

  app.get("/api/studios/:studioId/productions", requireAuth, requireStudioAccess, async (req, res) => {
    const studioProds = await storage.getProductions(req.params.studioId);
    const publicProds = await storage.getPublicProductions();
    const seen = new Set(studioProds.map((p) => p.id));
    const merged = [...studioProds, ...publicProds.filter((p) => !seen.has(p.id))];
    res.status(200).json(merged);
  });

  app.get("/api/studios/:studioId/productions/:id", requireAuth, requireStudioAccess, async (req, res) => {
    const prod = await storage.getProduction(req.params.id);
    if (!prod) return res.status(404).json({ message: "Production not found" });

    if (prod.studioId !== req.params.studioId && !(prod as any).isPublic) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    res.status(200).json(prod);
  });

  app.post("/api/studios/:studioId/productions", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const input = insertProductionSchema.parse({ ...req.body, studioId: req.params.studioId });
      const prod = await storage.createProduction(input);
      res.status(201).json(prod);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.patch("/api/studios/:studioId/productions/:id", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const prod = await storage.getProduction(req.params.id);
      if (!prod) return res.status(404).json({ message: "Producao nao encontrada" });
      if (prod.studioId !== req.params.studioId) return res.status(403).json({ message: "Acesso negado" });
      const allowedFields = z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        videoUrl: z.string().nullable().optional(),
        scriptJson: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
      }).parse(req.body);
      const [updated] = await db.update(productions).set(allowedFields).where(eq(productions.id, req.params.id)).returning();
      res.status(200).json(updated);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.delete("/api/studios/:studioId/productions/:id", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const prod = await storage.getProduction(req.params.id);
      if (!prod) return res.status(404).json({ message: "Producao nao encontrada" });
      if (prod.studioId !== req.params.studioId) return res.status(403).json({ message: "Acesso negado" });
      await storage.deleteProduction(req.params.id);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir producao" });
    }
  });

  // CHARACTERS
  app.get("/api/productions/:productionId/characters", requireAuth, async (req, res) => {
    const prod = await verifyProductionAccess(req, res, req.params.productionId);
    if (!prod) return;
    const chars = await storage.getCharacters(req.params.productionId);
    res.status(200).json(chars);
  });

  app.post("/api/productions/:productionId/characters", requireAuth, async (req, res) => {
    try {
      const prod = await verifyProductionAccess(req, res, req.params.productionId);
      if (!prod) return;
      const input = insertCharacterSchema.parse({ ...req.body, productionId: req.params.productionId });
      const char = await storage.createCharacter(input);
      res.status(201).json(char);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.patch("/api/productions/:productionId/characters/:id", requireAuth, async (req, res) => {
    try {
      const charId = String(req.params.id);
      const [charRecord] = await db.select().from(characters).where(eq(characters.id, charId));
      if (!charRecord) return res.status(404).json({ message: "Personagem nao encontrado" });
      const prod = await verifyProductionAccess(req, res, charRecord.productionId);
      if (!prod) return;
      const allowedFields = z.object({
        name: z.string().optional(),
        voiceActorId: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        gender: z.string().nullable().optional(),
        ageRange: z.string().nullable().optional(),
      }).parse(req.body);
      const [updated] = await db.update(characters).set(allowedFields).where(eq(characters.id, charId)).returning();
      res.status(200).json(updated);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  // SESSIONS
  app.get("/api/studios/:studioId/sessions", requireAuth, requireStudioAccess, async (req, res) => {
    const sessionsList = await storage.getSessions(req.params.studioId);
    res.status(200).json(sessionsList);
  });

  app.get("/api/studios/:studioId/sessions/:id", requireAuth, requireStudioAccess, async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Sessao nao encontrada" });
    if (session.studioId !== req.params.studioId) return res.status(403).json({ message: "Acesso negado" });
    res.status(200).json(session);
  });

  app.post("/api/studios/:studioId/sessions", requireAuth, requireStudioRole("studio_admin", "diretor"), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const settings = await storage.getAllSettings();
      const storageProvider = "supabase";
      const takesPath = String(req.body.takesPath || settings.DEFAULT_TAKES_PATH || "uploads");

      const allowedPaths: string[] = (() => {
        try {
          const raw = settings.TAKES_SAVE_PATHS || "[]";
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
          return [];
        } catch {
          return [];
        }
      })();

      if (allowedPaths.length > 0 && !allowedPaths.includes(takesPath)) {
        return res.status(400).json({ message: "Caminho de salvamento invalido" });
      }

      const status = await checkSupabaseConnection(false);
      if (!isSupabaseConfigured() || !status.ok) {
        return res.status(400).json({ message: "Supabase indisponivel" });
      }

      const input = insertSessionSchema.parse({
        title: req.body.title,
        productionId: req.body.productionId,
        studioId: req.params.studioId,
        scheduledAt: new Date(req.body.scheduledAt),
        durationMinutes: req.body.durationMinutes ?? 60,
        status: req.body.status ?? "scheduled",
        storageProvider,
        takesPath,
        createdBy: userId,
      });
      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.delete("/api/studios/:studioId/sessions/:id", requireAuth, requireStudioRole("studio_admin", "diretor"), async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session || session.studioId !== req.params.studioId) return res.status(404).json({ message: "Sessao nao encontrada" });
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      const studioRole = (req as any).studioRole;
      const normalizedUserRole = normalizePlatformRole(userRole);
      const isAdmin = normalizedUserRole === "platform_owner" || normalizedUserRole === "diretor" || studioRole === "studio_admin" || studioRole === "diretor";
      if (!isAdmin && session.createdBy !== userId) {
        return res.status(403).json({ message: "Voce so pode excluir sessoes criadas por voce" });
      }
      await storage.deleteSession(req.params.id);
      res.status(200).json({ message: "Sessao excluida" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir sessao" });
    }
  });

  app.patch("/api/studios/:studioId/sessions/:id", requireAuth, requireStudioRole("studio_admin", "diretor"), async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session || session.studioId !== req.params.studioId) return res.status(404).json({ message: "Sessao nao encontrada" });
      const { title, scheduledAt, durationMinutes, status } = req.body;
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (scheduledAt !== undefined && scheduledAt !== "") updateData.scheduledAt = new Date(scheduledAt);
      if (durationMinutes !== undefined) updateData.durationMinutes = Number(durationMinutes);
      if (status !== undefined) updateData.status = status;
      const updated = await storage.updateSession(req.params.id, updateData as any);
      res.status(200).json(updated);
    } catch (err: any) {
      console.error("[Session PATCH]", err?.message || err);
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  // SESSION PARTICIPANTS
  app.get("/api/sessions/:sessionId/participants", requireAuth, async (req, res) => {
    const session = await verifySessionAccess(req, res, req.params.sessionId);
    if (!session) return;
    const participants = await storage.getSessionParticipants(req.params.sessionId);
    res.status(200).json(participants);
  });

  app.post("/api/sessions/:sessionId/participants", requireAuth, async (req, res) => {
    try {
      const session = await verifySessionAccess(req, res, req.params.sessionId);
      if (!session) return;
      const participant = await storage.addSessionParticipant({
        sessionId: req.params.sessionId,
        userId: req.body.userId || (req as any).user!.id,
        role: req.body.role || "dublador",
      });
      res.status(201).json(participant);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  // TAKES
  app.post("/api/sessions/:sessionId/takes", requireAuth, upload.single("audio"), async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const body = z.object({
        characterId: z.string().min(1),
        voiceActorId: z.string().min(1),
        lineIndex: z.coerce.number().int().min(0),
        durationSeconds: z.coerce.number().min(0).optional(),
        qualityScore: z.coerce.number().min(0).max(100).nullable().optional(),
        audioUrl: z.string().optional(),
        timecode: z.string().optional(),
        startTimeSeconds: z.coerce.number().min(0).optional(),
        voiceActorName: z.string().optional(),
        characterName: z.string().optional(),
      }).parse(req.body);

      const sessionCheck = await verifySessionAccess(req, res, sessionId);
      if (!sessionCheck) return;

      const settings = await storage.getAllSettings();
      const storageProvider = (sessionCheck as any).storageProvider || settings.DEFAULT_STORAGE_PROVIDER || "supabase";
      const takesPath = (sessionCheck as any).takesPath || settings.DEFAULT_TAKES_PATH || "uploads";
      const supabaseBucket = settings.SUPABASE_BUCKET || "uploads";

      let audioUrl = body.audioUrl || "";
      let contentType = "audio/wav";

      if (req.file) {
        const originalName = req.file.originalname || "";
        const safeName = originalName.replace(/[^a-zA-Z0-9_.\-]/g, "");
        const ext = path.extname(safeName || "") || ".wav";
        const filename = `take_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        audioUrl = `/uploads/${filename}`;
        contentType = req.file.mimetype || contentType;
      }

      if (!audioUrl) {
        return res.status(400).json({ message: "Audio nao enviado" });
      }

      const takeInput = insertTakeSchema.parse({
        sessionId,
        characterId: body.characterId,
        voiceActorId: body.voiceActorId,
        lineIndex: body.lineIndex,
        audioUrl,
        durationSeconds: body.durationSeconds ?? 0,
        qualityScore: body.qualityScore ?? null,
        voiceActorName: body.voiceActorName || null,
      });
      const take = await storage.createTake(takeInput);

      if (req.file && storageProvider === "supabase" && isSupabaseConfigured()) {
        try {
          const status = await checkSupabaseConnection(false);
          if (!status.ok) throw new Error(status.reason || "Supabase indisponivel");
          const timecodeToken =
            normalizeTimecodeToken(body.timecode || "") !== "000000000"
              ? normalizeTimecodeToken(body.timecode || "")
              : secondsToTimecodeToken(body.startTimeSeconds || 0);

          const studioId = String((sessionCheck as any).studioId || "");
          const productionId = String((sessionCheck as any).productionId || "");

          const [[studioRow], [productionRow], [characterRow], [actorRow]] = await Promise.all([
            studioId
              ? db.select({ name: studios.name }).from(studios).where(eq(studios.id, studioId))
              : Promise.resolve([]),
            productionId
              ? db.select({ name: productions.name }).from(productions).where(eq(productions.id, productionId))
              : Promise.resolve([]),
            db.select({ name: characters.name }).from(characters).where(eq(characters.id, String(body.characterId))),
            db.select({ artistName: users.artistName, displayName: users.displayName, fullName: users.fullName, firstName: users.firstName, lastName: users.lastName, email: users.email })
              .from(users)
              .where(eq(users.id, String(body.voiceActorId))),
          ]);

          const studioName = normalizeSegment(studioRow?.name || "");
          const productionName = normalizeSegment(productionRow?.name || "");
          const actorNameRaw =
            actorRow?.artistName ||
            actorRow?.displayName ||
            actorRow?.fullName ||
            `${actorRow?.firstName || ""} ${actorRow?.lastName || ""}`.trim() ||
            actorRow?.email ||
            "";

          const profileActorName = String(body.voiceActorName || "").trim();
          const profileCharName = String(body.characterName || "").trim();

          const resolvedActorName = profileActorName || actorNameRaw;
          const resolvedCharName = profileCharName || characterRow?.name || "";

          const actorFolder = normalizeSegment(resolvedActorName);
          const characterFolder = normalizeSegment(resolvedCharName);

          const actorToken = normalizeTokenUpper(resolvedActorName);
          const characterToken = normalizeTokenUpper(resolvedCharName);
          const filename = `${characterToken}_${actorToken}_${timecodeToken}.wav`;

          const baseFolder = normalizeSegment(String(takesPath || "uploads"));
          const pathSegments =
            String(supabaseBucket || "").trim().toLowerCase() === baseFolder
              ? [studioName, productionName, actorFolder, characterFolder, filename]
              : [baseFolder, studioName, productionName, actorFolder, characterFolder, filename];
          const objectPath = pathSegments.filter(Boolean).join("/");
          const publicUrl = await uploadToSupabaseStorage({
            bucket: supabaseBucket,
            path: objectPath,
            buffer: req.file.buffer,
            contentType,
          });
          await storage.updateTakeAudioUrl(take.id, publicUrl);
          (take as any).audioUrl = publicUrl;
        } catch (e: any) {
          logger.error("[Take Upload] Supabase upload failed", { takeId: take.id, message: e?.message });
        }
      }

      res.status(201).json(take);
    } catch (err: any) {
      logger.error("[Take Upload] Create error", { message: err?.message });
      res.status(400).json({ message: err?.message || "Dados invalidos" });
    }
  });

  app.get("/api/sessions/:sessionId/takes", requireAuth, async (req, res) => {
    const session = await verifySessionAccess(req, res, req.params.sessionId);
    if (!session) return;
    const takesList = await storage.getSessionTakesWithDetails(req.params.sessionId);
    res.status(200).json(takesList);
  });

  app.post("/api/takes/:id/prefer", requireAuth, async (req, res) => {
    try {
      const [takeRecord] = await db.select().from(takes).where(eq(takes.id, req.params.id));
      if (!takeRecord) return res.status(404).json({ message: "Take nao encontrado" });
      const session = await verifySessionAccess(req, res, takeRecord.sessionId);
      if (!session) return;
      const take = await storage.setPreferredTake(req.params.id);
      res.status(200).json(take);
    } catch (err) {
      res.status(404).json({ message: "Take nao encontrado" });
    }
  });

  app.post("/api/takes/:id/trim", requireAuth, async (req, res) => {
    try {
      const { startSeconds, endSeconds } = req.body;
      logger.info("[Take Trim] Request", { takeId: req.params.id, startSeconds, endSeconds });
      
      if (typeof startSeconds !== "number" || typeof endSeconds !== "number") {
        return res.status(400).json({ message: "startSeconds e endSeconds sao obrigatorios" });
      }
      if (startSeconds < 0 || endSeconds <= startSeconds) {
        return res.status(400).json({ message: "Range invalido" });
      }

      const [takeRecord] = await db.select().from(takes).where(eq(takes.id, req.params.id));
      if (!takeRecord) return res.status(404).json({ message: "Take nao encontrado" });

      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      const isAdmin = await checkTakeAdminAccess(userId, userRole, takeRecord.sessionId);
      if (!isAdmin && takeRecord.voiceActorId !== userId) {
        return res.status(403).json({ message: "Voce so pode editar seus proprios takes" });
      }

      const audioUrl = (takeRecord as any).audioUrl || "";
      logger.info("[Take Trim] Audio URL", { audioUrl });
      if (!audioUrl) return res.status(400).json({ message: "Take nao tem audio" });

      let audioBuffer: Buffer;
      const supabaseParsed = parseSupabaseStorageUrl(audioUrl);
      logger.info("[Take Trim] Supabase parsed", { supabaseParsed, isSupabaseConfigured: isSupabaseConfigured() });
      
      if (supabaseParsed && isSupabaseConfigured()) {
        const downloaded = await downloadFromSupabaseStorageUrl(audioUrl);
        audioBuffer = Buffer.from(await downloaded.arrayBuffer());
      } else if (audioUrl.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), "public", audioUrl);
        logger.info("[Take Trim] Local path", { localPath });
        audioBuffer = fs.readFileSync(localPath);
      } else {
        return res.status(400).json({ message: "Audio nao suportado" });
      }

      logger.info("[Take Trim] Buffer size", { size: audioBuffer.length });
      const trimmedBuffer = trimWavBuffer(audioBuffer, startSeconds, endSeconds);
      const newDuration = endSeconds - startSeconds;
      logger.info("[Take Trim] Trimmed buffer", { trimmedSize: trimmedBuffer.length, newDuration });

      let newAudioUrl = audioUrl;

      // Persistir baseado em onde o arquivo está (não na config DEFAULT_STORAGE_PROVIDER)
      if (supabaseParsed && isSupabaseConfigured()) {
        const publicUrl = await uploadToSupabaseStorage({
          bucket: supabaseParsed.bucket,
          path: supabaseParsed.path,
          buffer: trimmedBuffer,
          contentType: "audio/wav",
        });
        newAudioUrl = publicUrl;
        logger.info("[Take Trim] Uploaded to Supabase (same path, replaced)", { publicUrl });
      } else if (audioUrl.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), "public", audioUrl);
        logger.info("[Take Trim] Writing to local path", { localPath });
        fs.writeFileSync(localPath, trimmedBuffer);
      }

      await storage.updateTakeDuration(takeRecord.id, newDuration);
      await storage.updateTakeAudioUrl(takeRecord.id, newAudioUrl);
      // When trimming the beginning, shift startTimeSeconds so in-video position stays correct
      let newStartTimeSeconds = (takeRecord as any).startTimeSeconds ?? 0;
      if (startSeconds > 0) {
        newStartTimeSeconds += startSeconds;
        await storage.updateTakeStartTime(takeRecord.id, newStartTimeSeconds);
      }
      logger.info("[Take Trim] Updated duration and audioUrl", { takeId: takeRecord.id, newDuration, newAudioUrl, newStartTimeSeconds });

      res.status(200).json({ audioUrl: newAudioUrl, durationSeconds: newDuration, startTimeSeconds: newStartTimeSeconds });
    } catch (err: any) {
      logger.error("[Take Trim] Error", { message: err?.message, stack: err?.stack });
      res.status(500).json({ message: err?.message || "Erro ao cortar take" });
    }
  });

  app.post("/api/takes/:id/split", requireAuth, async (req, res) => {
    try {
      const { splitAtSeconds } = req.body;
      if (typeof splitAtSeconds !== "number" || splitAtSeconds <= 0) {
        return res.status(400).json({ message: "splitAtSeconds deve ser um numero positivo" });
      }

      const [takeRecord] = await db.select().from(takes).where(eq(takes.id, req.params.id));
      if (!takeRecord) return res.status(404).json({ message: "Take nao encontrado" });

      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      const isAdmin = await checkTakeAdminAccess(userId, userRole, takeRecord.sessionId);
      if (!isAdmin && takeRecord.voiceActorId !== userId) {
        return res.status(403).json({ message: "Voce so pode editar seus proprios takes" });
      }

      const audioUrl = (takeRecord as any).audioUrl || "";
      const totalDuration = (takeRecord as any).durationSeconds ?? 0;
      if (!audioUrl) return res.status(400).json({ message: "Take nao tem audio" });

      // Download audio
      let audioBuffer: Buffer;
      const supabaseParsed = parseSupabaseStorageUrl(audioUrl);
      if (supabaseParsed && isSupabaseConfigured()) {
        const downloaded = await downloadFromSupabaseStorageUrl(audioUrl);
        audioBuffer = Buffer.from(await downloaded.arrayBuffer());
      } else if (audioUrl.startsWith("/uploads/")) {
        audioBuffer = fs.readFileSync(path.join(process.cwd(), "public", audioUrl));
      } else {
        return res.status(400).json({ message: "Audio nao suportado" });
      }

      // Build two buffers
      const part1Buffer = trimWavBuffer(audioBuffer, 0, splitAtSeconds);
      const part2Buffer = trimWavBuffer(audioBuffer, splitAtSeconds, totalDuration);

      // Save part1 over original
      if (supabaseParsed && isSupabaseConfigured()) {
        await uploadToSupabaseStorage({ bucket: supabaseParsed.bucket, path: supabaseParsed.path, buffer: part1Buffer, contentType: "audio/wav" });
      } else if (audioUrl.startsWith("/uploads/")) {
        fs.writeFileSync(path.join(process.cwd(), "public", audioUrl), part1Buffer);
      }
      await storage.updateTakeDuration(takeRecord.id, splitAtSeconds);

      // Save part2 as new file
      const ext = path.extname(audioUrl) || ".wav";
      const part2Filename = `take_split_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      let part2AudioUrl: string;
      if (supabaseParsed && isSupabaseConfigured()) {
        const splitPath = supabaseParsed.path.replace(/(\.[^.]+)$/, `_split_${Date.now()}$1`);
        part2AudioUrl = await uploadToSupabaseStorage({ bucket: supabaseParsed.bucket, path: splitPath, buffer: part2Buffer, contentType: "audio/wav" });
      } else {
        const localPart2 = path.join(uploadsDir, part2Filename);
        fs.writeFileSync(localPart2, part2Buffer);
        part2AudioUrl = `/uploads/${part2Filename}`;
      }

      // Create take for part2 with startTimeSeconds = original + splitAtSeconds
      const origStartTime = (takeRecord as any).startTimeSeconds ?? 0;
      const part2Take = await storage.createTake(insertTakeSchema.parse({
        sessionId: takeRecord.sessionId,
        characterId: takeRecord.characterId,
        voiceActorId: takeRecord.voiceActorId,
        lineIndex: takeRecord.lineIndex,
        audioUrl: part2AudioUrl,
        durationSeconds: totalDuration - splitAtSeconds,
        startTimeSeconds: origStartTime + splitAtSeconds,
        status: (takeRecord as any).status ?? "approved",
        voiceActorName: (takeRecord as any).voiceActorName ?? null,
      }));

      logger.info("[Take Split] Done", { origId: takeRecord.id, part2Id: part2Take.id, splitAtSeconds });
      res.status(200).json({
        part1: { id: takeRecord.id, audioUrl, durationSeconds: splitAtSeconds, startTimeSeconds: origStartTime },
        part2: { id: part2Take.id, audioUrl: part2AudioUrl, durationSeconds: totalDuration - splitAtSeconds, startTimeSeconds: origStartTime + splitAtSeconds },
      });
    } catch (err: any) {
      logger.error("[Take Split] Error", { message: err?.message, stack: err?.stack });
      res.status(500).json({ message: err?.message || "Erro ao dividir take" });
    }
  });

  // ── TAKES — SILENCE REMOVE ──────────────────────────────────────────────────
  // Analisa o áudio e cria novos takes para cada região não-silenciosa.
  // Recebe regiões com startSeconds/endSeconds RELATIVOS ao início do áudio do take.
  // Apaga o take original e cria N novos takes.
  app.post("/api/takes/:id/silence-remove", requireAuth, async (req, res) => {
    try {
      const regionsInput: Array<{ startSeconds: number; endSeconds: number; name?: string }> = req.body?.regions;
      if (!Array.isArray(regionsInput) || regionsInput.length === 0) {
        return res.status(400).json({ message: "regions deve ser um array com ao menos um elemento" });
      }

      const [takeRecord] = await db.select().from(takes).where(eq(takes.id, req.params.id));
      if (!takeRecord) return res.status(404).json({ message: "Take nao encontrado" });

      const userId    = (req.user as any)?.id;
      const userRole  = (req.user as any)?.role;
      const isAdmin   = await checkTakeAdminAccess(userId, userRole, takeRecord.sessionId);
      if (!isAdmin && takeRecord.voiceActorId !== userId) {
        return res.status(403).json({ message: "Voce so pode editar seus proprios takes" });
      }

      const audioUrl      = (takeRecord as any).audioUrl || "";
      const totalDuration = (takeRecord as any).durationSeconds ?? 0;
      const origStartTime = (takeRecord as any).startTimeSeconds ?? 0;
      if (!audioUrl) return res.status(400).json({ message: "Take nao tem audio" });

      // Baixa o áudio original UMA vez
      let audioBuffer: Buffer;
      const supabaseParsed = parseSupabaseStorageUrl(audioUrl);
      if (supabaseParsed && isSupabaseConfigured()) {
        const downloaded = await downloadFromSupabaseStorageUrl(audioUrl);
        audioBuffer = Buffer.from(await downloaded.arrayBuffer());
      } else if (audioUrl.startsWith("/uploads/")) {
        audioBuffer = fs.readFileSync(path.join(process.cwd(), "public", audioUrl));
      } else {
        return res.status(400).json({ message: "Audio nao suportado" });
      }

      const ext      = path.extname(audioUrl) || ".wav";
      const newTakes: any[] = [];

      for (const region of regionsInput) {
        const startSec = Number(region.startSeconds);
        const endSec   = Number(region.endSeconds);
        // Ignora regiões inválidas ou muito curtas (< 100ms)
        if (isNaN(startSec) || isNaN(endSec) || endSec <= startSec) continue;
        const clampStart = Math.max(0, startSec);
        const clampEnd   = Math.min(endSec, totalDuration);
        if (clampEnd - clampStart < 0.1) continue;

        const trimmedBuffer  = trimWavBuffer(audioBuffer, clampStart, clampEnd);
        const regionDuration = clampEnd - clampStart;

        // Salva segmento em novo arquivo
        let segUrl: string;
        if (supabaseParsed && isSupabaseConfigured()) {
          const ts       = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const segPath  = supabaseParsed.path.replace(/(\.[^.]+)$/, `_seg_${ts}$1`);
          segUrl = await uploadToSupabaseStorage({
            bucket: supabaseParsed.bucket,
            path:   segPath,
            buffer: trimmedBuffer,
            contentType: "audio/wav",
          });
        } else {
          const segFilename = `take_seg_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
          fs.writeFileSync(path.join(uploadsDir, segFilename), trimmedBuffer);
          segUrl = `/uploads/${segFilename}`;
        }

        // Cria novo take com posição absoluta correta na timeline
        const newTake = await storage.createTake(insertTakeSchema.parse({
          sessionId:         takeRecord.sessionId,
          characterId:       takeRecord.characterId,
          voiceActorId:      takeRecord.voiceActorId,
          lineIndex:         takeRecord.lineIndex,
          audioUrl:          segUrl,
          durationSeconds:   regionDuration,
          startTimeSeconds:  origStartTime + clampStart,
          status:            (takeRecord as any).status ?? "approved",
          voiceActorName:    (takeRecord as any).voiceActorName ?? null,
        }));
        newTakes.push(newTake);
      }

      if (newTakes.length === 0) {
        return res.status(400).json({ message: "Nenhuma regiao valida para processar" });
      }

      // Remove apenas o registro do take original (o arquivo de áudio fica como orphan)
      await storage.deleteTake(takeRecord.id);

      logger.info("[Take SilenceRemove] Done", { origId: takeRecord.id, newCount: newTakes.length });
      res.status(200).json({ takes: newTakes });
    } catch (err: any) {
      logger.error("[Take SilenceRemove] Error", { message: err?.message, stack: err?.stack });
      res.status(500).json({ message: err?.message || "Erro ao remover silencio" });
    }
  });

  app.delete("/api/takes/:id", requireAuth, async (req, res) => {
    try {
      const [takeRecord] = await db.select().from(takes).where(eq(takes.id, req.params.id));
      if (!takeRecord) return res.status(404).json({ message: "Take nao encontrado" });
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      const isAdmin = await checkTakeAdminAccess(userId, userRole, takeRecord.sessionId);
      if (!isAdmin && takeRecord.voiceActorId !== userId) {
        return res.status(403).json({ message: "Voce so pode excluir seus proprios takes" });
      }

      // Delete audio file from Supabase Storage or local disk
      const audioUrl = (takeRecord as any).audioUrl || "";
      if (audioUrl) {
        const supabaseParsed = parseSupabaseStorageUrl(audioUrl);
        if (supabaseParsed && isSupabaseConfigured()) {
          try {
            await deleteFromSupabaseStorage(supabaseParsed);
          } catch (e: any) {
            logger.warn("[Take Delete] Failed to delete from Supabase Storage", { takeId: req.params.id, message: e?.message });
          }
        } else if (audioUrl.startsWith("/uploads/")) {
          const localPath = path.join(process.cwd(), "public", audioUrl);
          try {
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          } catch (e: any) {
            logger.warn("[Take Delete] Failed to delete local file", { takeId: req.params.id, path: localPath, message: e?.message });
          }
        }
      }

      await storage.deleteTake(req.params.id);
      res.status(200).json({ message: "Take excluido" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir take" });
    }
  });

  // TAKES - DIRECTOR CHECK HELPER
  // Checks platform role first, then falls back to studio membership roles
  async function checkTakeAdminAccess(userId: string, userRole: string, sessionId: string): Promise<boolean> {
    const privileged = ["platform_owner", "diretor", "director", "studio_admin"];
    if (privileged.includes(userRole)) return true;
    const session = await storage.getSession(sessionId);
    if (!session) return false;
    const studioRoles = await storage.getUserRolesInStudio(userId, session.studioId);
    return studioRoles.some(r => privileged.includes(r.toLowerCase()));
  }

  // TAKES - SHARED REVIEW HELPER
  async function reviewTake(
    action: "approved" | "rejected",
    takeId: string,
    userId: string,
    userRole: string,
    feedback?: string | null,
    setAsFinal?: boolean,
    startTimeSeconds?: number,
  ) {
    const [take] = await db.select().from(takes).where(eq(takes.id, takeId));
    if (!take) return { error: "Take nao encontrado", status: 404 };

    const [participant] = await db.select()
      .from(sessionParticipants)
      .where(and(
        eq(sessionParticipants.sessionId, take.sessionId),
        eq(sessionParticipants.userId, userId)
      ));

    const role = participant?.role?.toLowerCase() || "";
    let isDirector = ["diretor", "director", "studio_admin"].includes(role) || ["platform_owner", "diretor"].includes(userRole);

    if (!isDirector) {
      const session = await storage.getSession(take.sessionId);
      if (session) {
        const studioRoles = await storage.getUserRolesInStudio(userId, session.studioId);
        isDirector = studioRoles.some(r => ["diretor", "director", "studio_admin", "platform_owner"].includes(r.toLowerCase()));
      }
    }

    if (!isDirector) return { error: "Somente diretores podem revisar takes", status: 403 };

    const updatePayload: any = {
      status: action,
      directorFeedback: feedback || null,
      reviewedBy: userId,
      reviewedAt: new Date(),
    };
    if (action === "approved") {
      updatePayload.isFinal = setAsFinal || false;
      if (startTimeSeconds !== undefined && startTimeSeconds >= 0) {
        updatePayload.startTimeSeconds = startTimeSeconds;
      }
    }

    const [updated] = await db.update(takes).set(updatePayload).where(eq(takes.id, takeId)).returning();

    if (action === "approved" && setAsFinal) {
      await db.update(takes)
        .set({ status: "superseded" })
        .where(and(
          eq(takes.sessionId, take.sessionId),
          eq(takes.lineIndex, take.lineIndex),
          eq(takes.characterId, take.characterId),
          ne(takes.id, takeId)
        ));
    }

    const isApproved = action === "approved";
    await db.insert(notifications).values({
      userId: take.voiceActorId,
      type: isApproved ? "take_approved" : "take_rejected",
      title: isApproved ? "Take Aprovado! 🎉" : "Take Rejeitado",
      message: isApproved
        ? (feedback ? `Seu take da linha ${take.lineIndex + 1} foi aprovado com feedback: "${feedback}"` : `Seu take da linha ${take.lineIndex + 1} foi aprovado pelo diretor.`)
        : `Seu take da linha ${take.lineIndex + 1} foi rejeitado. Feedback do diretor: "${feedback}"`,
      relatedId: takeId,
    });

    const room = rooms.get(take.sessionId);
    if (room) {
      broadcast(room, {
        type: isApproved ? "take:approved" : "take:rejected",
        takeId,
        voiceActorId: take.voiceActorId,
        feedback,
        ...(isApproved ? { isFinal: setAsFinal } : {}),
      });
    }

    return { data: updated };
  }

  // TAKES - APPROVE
  app.patch("/api/takes/:takeId/approve", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Nao autorizado" });
      const { feedback, setAsFinal, startTimeSeconds } = req.body;
      const result = await reviewTake("approved", req.params.takeId, userId, (req.user as any)?.role, feedback, setAsFinal, startTimeSeconds !== undefined ? Number(startTimeSeconds) : undefined);
      if (result.error) return res.status(result.status!).json({ error: result.error });
      res.json(result.data);
    } catch (err: any) {
      logger.error("Erro ao aprovar take:", err);
      res.status(500).json({ error: err?.message || "Erro ao aprovar take" });
    }
  });

  // TAKES - REJECT
  app.patch("/api/takes/:takeId/reject", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Nao autorizado" });
      const { feedback } = req.body;
      const result = await reviewTake("rejected", req.params.takeId, userId, (req.user as any)?.role, feedback);
      if (result.error) return res.status(result.status!).json({ error: result.error });
      res.json(result.data);
    } catch (err: any) {
      logger.error("Erro ao rejeitar take:", err);
      res.status(500).json({ error: err?.message || "Erro ao rejeitar take" });
    }
  });

  // TAKES - GROUPED LISTING (for Takes de Audio page)
  app.get("/api/studios/:studioId/takes/grouped", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user!;
      const studioId = req.params.studioId;
      const userRole = normalizePlatformRole(user.role);
      if (userRole === "platform_owner" || userRole === "diretor") {
        const allTakes = await storage.getAllTakesGrouped();
        return res.status(200).json(allTakes);
      }
      const roles = await storage.getUserRolesInStudio(user.id, studioId);
      if (!roles.includes("diretor") && !roles.includes("studio_admin")) {
        return res.status(403).json({ message: "Acesso restrito a administradores" });
      }
      const studioTakes = await storage.getStudioTakesGrouped(studioId);
      res.status(200).json(studioTakes);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao buscar takes" });
    }
  });

  // TAKES - INDIVIDUAL DOWNLOAD
  app.get("/api/takes/:id/download", requireAuth, async (req, res) => {
    try {
      const takeList = await storage.getTakesByIds([req.params.id]);
      if (takeList.length === 0) return res.status(404).json({ message: "Take nao encontrado" });
      const take = takeList[0];
      const user = (req as any).user!;
      const userRole = normalizePlatformRole(user.role);
      if (userRole !== "platform_owner" && userRole !== "diretor") {
        const isOwner = String(take.voiceActorId || "") === String(user.id || "");
        if (!isOwner) {
          const roles = await storage.getUserRolesInStudio(user.id, take.studioId);
          if (!roles.includes("diretor")) {
            return res.status(403).json({ message: "Acesso negado" });
          }
        }
      }

      const filename = filenameFromAudioUrl(take.audioUrl, "take.wav").replace(/[^a-zA-Z0-9_.\-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const filePath = safeAudioPath(take.audioUrl);
      if (filePath && fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "audio/wav");
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      if (isHttpUrl(take.audioUrl)) {
        const upstream = await fetchAudioResponse(take.audioUrl);
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        const stream = toNodeReadable(upstream.body);
        if (!stream) return res.status(500).json({ message: "Falha ao obter stream" });
        stream.pipe(res);
        return;
      }

      return res.status(404).json({ message: "Arquivo nao encontrado" });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao baixar take" });
    }
  });

  app.get("/api/takes/:id/stream", requireAuth, async (req, res) => {
    try {
      const takeList = await storage.getTakesByIds([req.params.id]);
      if (takeList.length === 0) return res.status(404).json({ message: "Take nao encontrado" });
      const take = takeList[0];
      const user = (req as any).user!;
      const userRole = normalizePlatformRole(user.role);
      if (userRole !== "platform_owner" && userRole !== "diretor") {
        const isOwner = String(take.voiceActorId || "") === String(user.id || "");
        if (!isOwner) {
          const roles = await storage.getUserRolesInStudio(user.id, take.studioId);
          if (!roles.includes("diretor")) {
            return res.status(403).json({ message: "Acesso negado" });
          }
        }
      }

      const filePath = safeAudioPath(take.audioUrl);
      if (filePath && fs.existsSync(filePath)) {
        sendFileWithRange(req, res, filePath, "audio/wav");
        return;
      }

      if (isHttpUrl(take.audioUrl)) {
        const range = String(req.headers.range || "");
        const upstream = await fetchAudioResponse(take.audioUrl, range);
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        res.status(upstream.status);
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", contentType);
        const contentLength = upstream.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);
        const acceptRanges = upstream.headers.get("accept-ranges");
        if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
        const contentRange = upstream.headers.get("content-range");
        if (contentRange) res.setHeader("Content-Range", contentRange);
        const stream = toNodeReadable(upstream.body);
        if (!stream) return res.status(500).json({ message: "Falha ao obter stream" });
        stream.pipe(res);
        return;
      }

      return res.status(404).json({ message: "Arquivo nao encontrado" });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao reproduzir take" });
    }
  });

  // TAKES - BULK DOWNLOAD (selected takes)
  app.post("/api/takes/download-bulk", requireAuth, async (req, res) => {
    try {
      const { takeIds } = req.body;
      if (!Array.isArray(takeIds) || takeIds.length === 0) {
        return res.status(400).json({ message: "Nenhum take selecionado" });
      }
      const takeList = await storage.getTakesByIds(takeIds);
      if (takeList.length === 0) return res.status(404).json({ message: "Takes nao encontrados" });
      const user = (req as any).user!;
      if (user.role !== "platform_owner") {
        const studioIds: string[] = [];
        const seen: Record<string, true> = {};
        for (const take of takeList as any[]) {
          const sid = String(take.studioId ?? "");
          if (!sid) continue;
          if (seen[sid]) continue;
          seen[sid] = true;
          studioIds.push(sid);
        }
        for (const sid of studioIds) {
          const roles = await storage.getUserRolesInStudio(user.id, sid as string);
          if (!roles.includes("diretor")) {
            return res.status(403).json({ message: "Acesso negado a takes de outro estudio" });
          }
        }
      }
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });
      res.setHeader("Content-Disposition", 'attachment; filename="takes_selecionados.zip"');
      res.setHeader("Content-Type", "application/zip");
      archive.pipe(res);
      for (const take of takeList) {
        const filePath = safeAudioPath(take.audioUrl);
        const filename = filenameFromAudioUrl(take.audioUrl, `take_${take.id}.wav`).replace(/[^a-zA-Z0-9_.\-]/g, "_");
        if (filePath && fs.existsSync(filePath)) {
          archive.file(filePath, { name: filename });
          continue;
        }
        if (isHttpUrl(take.audioUrl)) {
          try {
            const upstream = await fetchAudioResponse(take.audioUrl);
            const stream = toNodeReadable(upstream.body);
            if (!stream) throw new Error("Empty body");
            archive.append(stream, { name: filename });
          } catch (e: any) {
            logger.warn("[Takes Bulk Download] Skip remote file", { takeId: take.id, message: e?.message });
          }
        }
      }
      await archive.finalize();
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err?.message || "Erro ao gerar ZIP" });
    }
  });

  // TAKES - DOWNLOAD ALL IN SESSION
  app.get("/api/sessions/:sessionId/takes/download-all", requireAuth, async (req, res) => {
    try {
      const takeList = await storage.getSessionTakesWithDetails(req.params.sessionId);
      if (takeList.length === 0) return res.status(404).json({ message: "Nenhum take nesta sessao" });
      const user = (req as any).user!;
      const userRole = normalizePlatformRole(user.role);
      if (userRole !== "platform_owner" && userRole !== "diretor") {
        const roles = await storage.getUserRolesInStudio(user.id, takeList[0].studioId);
        if (!roles.includes("diretor")) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });
      const sessionName = (takeList[0].sessionTitle || "Sessao").replace(/[^a-zA-Z0-9_\-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${sessionName}.zip"`);
      res.setHeader("Content-Type", "application/zip");
      archive.pipe(res);
      for (const take of takeList) {
        const filePath = safeAudioPath(take.audioUrl);
        const filename = filenameFromAudioUrl(take.audioUrl, `take_${take.id}.wav`).replace(/[^a-zA-Z0-9_.\-]/g, "_");
        if (filePath && fs.existsSync(filePath)) {
          archive.file(filePath, { name: filename });
          continue;
        }
        if (isHttpUrl(take.audioUrl)) {
          try {
            const upstream = await fetchAudioResponse(take.audioUrl);
            const stream = toNodeReadable(upstream.body);
            if (!stream) throw new Error("Empty body");
            archive.append(stream, { name: filename });
          } catch (e: any) {
            logger.warn("[Session Download] Skip remote file", { takeId: take.id, message: e?.message });
          }
        }
      }
      await archive.finalize();
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err?.message || "Erro ao gerar ZIP" });
    }
  });

  // TAKES - DOWNLOAD ALL IN PRODUCTION
  app.get("/api/productions/:productionId/takes/download-all", requireAuth, async (req, res) => {
    try {
      const takeList = await storage.getProductionTakesWithDetails(req.params.productionId);
      if (takeList.length === 0) return res.status(404).json({ message: "Nenhum take nesta producao" });
      const user = (req as any).user!;
      const userRole = normalizePlatformRole(user.role);
      if (userRole !== "platform_owner" && userRole !== "diretor") {
        const roles = await storage.getUserRolesInStudio(user.id, takeList[0].studioId);
        if (!roles.includes("diretor")) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });
      const prodName = (takeList[0].productionName || "Producao").replace(/[^a-zA-Z0-9_\-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${prodName}.zip"`);
      res.setHeader("Content-Type", "application/zip");
      archive.pipe(res);
      for (const take of takeList) {
        const filePath = safeAudioPath(take.audioUrl);
        const filename = filenameFromAudioUrl(take.audioUrl, `take_${take.id}.wav`).replace(/[^a-zA-Z0-9_.\-]/g, "_");
        const sessionFolder = (take.sessionTitle || "Sessao").replace(/[^a-zA-Z0-9_\-]/g, "_");
        if (filePath && fs.existsSync(filePath)) {
          archive.file(filePath, { name: `${sessionFolder}/${filename}` });
          continue;
        }
        if (isHttpUrl(take.audioUrl)) {
          try {
            const upstream = await fetchAudioResponse(take.audioUrl);
            const stream = toNodeReadable(upstream.body);
            if (!stream) throw new Error("Empty body");
            archive.append(stream, { name: `${sessionFolder}/${filename}` });
          } catch (e: any) {
            logger.warn("[Production Download] Skip remote file", { takeId: take.id, message: e?.message });
          }
        }
      }
      await archive.finalize();
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err?.message || "Erro ao gerar ZIP" });
    }
  });

  // PRODUCTION EXPORT (ZIP with script + characters + info)
  app.get("/api/productions/:id/export", requireAuth, async (req, res) => {
    try {
      const production = await storage.getProduction(req.params.id);
      if (!production) return res.status(404).json({ message: "Producao nao encontrada" });
      const user = (req as any).user!;
      const userRole = normalizePlatformRole(user.role);
      if (userRole !== "platform_owner" && userRole !== "diretor") {
        const roles = await storage.getUserRolesInStudio(user.id, production.studioId);
        if (!roles || roles.length === 0) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      const characters = await storage.getCharacters(req.params.id);
      const info = {
        id: production.id,
        name: production.name,
        description: production.description,
        videoUrl: production.videoUrl,
      };
      let scriptData: any[] = [];
      if (production.scriptJson) {
        try {
          const parsed = JSON.parse(production.scriptJson);
          scriptData = parsed.lines || (Array.isArray(parsed) ? parsed : []);
        } catch { scriptData = []; }
      }
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });
      const safeName = production.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}_exportacao.zip"`);
      res.setHeader("Content-Type", "application/zip");
      archive.pipe(res);
      archive.append(JSON.stringify(info, null, 2), { name: "info.json" });
      archive.append(JSON.stringify(scriptData, null, 2), { name: "roteiro.json" });
      archive.append(JSON.stringify(characters, null, 2), { name: "personagens.json" });
      await archive.finalize();
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err?.message || "Erro ao exportar" });
    }
  });

  // STAFF
  app.get("/api/studios/:studioId/staff", requireAuth, requireStudioAccess, async (req, res) => {
    const staffList = await storage.getStaff(req.params.studioId);
    res.status(200).json(staffList);
  });

  app.post("/api/studios/:studioId/staff", requireAuth, requireStudioRole("studio_admin"), async (req, res) => {
    try {
      const newStaff = await storage.createStaff({ ...req.body, studioId: req.params.studioId });
      res.status(201).json(newStaff);
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  // AUDIT
  app.get("/api/audit", requireAuth, async (req, res) => {
    const userId = req.query.userId as string | undefined;
    const logs = await storage.getAuditLogs(userId);
    res.status(200).json(logs);
  });

  // ADMIN - CREATE STUDIO WITH AUTO-GENERATED ADMIN
  app.post("/api/admin/create-studio-with-admin", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
      const { randomBytes } = await import("crypto");

      const generatePassword = (length = 16): string => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        return Array.from(randomBytes(length)).map((b: number) => chars[b % chars.length]).join("");
      };

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const emailSuffix = randomBytes(3).toString("hex");
      const adminEmail = `admin.${slug}-${emailSuffix}@vhub.studio`;
      const adminPassword = generatePassword(16);

      const { hashPassword } = await import("./replit_integrations/auth/replitAuth");
      const { authStorage } = await import("./replit_integrations/auth/storage");

      const existing = await authStorage.getUserByEmail(adminEmail);
      if (existing) return res.status(409).json({ message: "Email ja em uso. Tente novamente." });

      const adminUser = await authStorage.createUser({
        email: adminEmail.toLowerCase().trim(),
        passwordHash: hashPassword(adminPassword),
        displayName: `Admin - ${name}`,
        fullName: `Admin - ${name}`,
        role: "studio_admin",
        status: "approved",
      });

      const studioSlug = slug + "-" + Date.now();
      const ownerId = (req as any).user.id;
      const studio = await storage.createStudio({ name, slug: studioSlug, ownerId }, ownerId, adminUser.id);

      await logAdminAction(req, "CREATE_STUDIO_WITH_ADMIN", `Criou estudio ${name} com admin ${adminEmail}`);

      res.status(201).json({ studio, adminEmail, adminPassword });
    } catch (err: any) {
      console.error("[create-studio-with-admin]", err?.message || err);
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  // ADMIN STATS
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    const stats = await storage.getSystemStats();
    res.status(200).json(stats);
  });

  app.get("/api/admin/audit", requireAuth, requireAdmin, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await storage.getAuditLogs(undefined, limit, offset);
    res.status(200).json(logs);
  });

  // ADMIN USERS
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const allUsers = await storage.getAllUsers(limit, offset);
    res.status(200).json(sanitizeUsers(allUsers));
  });

  app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, password, displayName, role } = z.object({
        email: z.string().email(),
        password: z.string().min(4),
        displayName: z.string().optional(),
        role: z.string().optional(),
      }).parse(req.body);
      const { hashPassword } = await import("./replit_integrations/auth/replitAuth");
      const { authStorage } = await import("./replit_integrations/auth/storage");
      const existing = await authStorage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email ja em uso" });
      const user = await authStorage.createUser({
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        displayName: displayName || email,
        fullName: displayName || email,
        role: role || "user",
        status: "approved",
      });
      await logAdminAction(req, "CREATE_USER", `Criou usuario ${email}`);
      res.status(201).json(sanitizeUser(user));
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.get("/api/admin/pending-users", requireAuth, requireAdmin, async (req, res) => {
    const pendingUsers = await storage.getPendingUsersWithStudioInfo();
    res.status(200).json(pendingUsers);
  });

  app.post("/api/admin/users/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { role, studioId, studioRoles } = z.object({
        role: z.string().optional(),
        studioId: z.string().optional(),
        studioRoles: z.array(z.string()).optional(),
      }).parse(req.body);
      const user = await storage.updateUserStatus(req.params.id, "approved");
      if (role) await storage.updateUser(req.params.id, { role });
      if (studioId) {
        const existingMemberships = await storage.getMembershipsByUser(req.params.id);
        const existingMembership = existingMemberships.find(m => m.studioId === studioId);
        let membershipId: string;
        if (existingMembership) {
          await storage.updateMembershipStatus(existingMembership.id, "approved", studioRoles?.[0] || "dublador");
          membershipId = existingMembership.id;
        } else {
          const newMembership = await storage.createMembership({
            userId: req.params.id,
            studioId,
            role: studioRoles?.[0] || "dublador",
            status: "approved",
          });
          membershipId = newMembership.id;
        }
        if (studioRoles && studioRoles.length > 0) {
          await storage.setUserStudioRoles(membershipId, studioRoles);
        }
        await storage.createNotification({
          userId: req.params.id,
          type: "membership_approved",
          title: "Conta aprovada",
          message: `Sua conta foi aprovada e voce foi atribuido ao estudio.`,
          isRead: false,
          relatedId: studioId,
        });
      }
      await logAdminAction(req, "APPROVE_USER", `Aprovou usuario ${req.params.id}${studioId ? ` com estudio ${studioId}` : ""}`);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro" });
    }
  });

  app.post("/api/admin/users/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = await storage.updateUserStatus(req.params.id, "rejected");
      await logAdminAction(req, "REJECT_USER", `Rejeitou usuario ${req.params.id}`);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro" });
    }
  });

  app.post("/api/admin/users/:id/change-role", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { role } = z.object({ role: z.string() }).parse(req.body);
      const user = await storage.updateUser(req.params.id, { role });
      await logAdminAction(req, "CHANGE_ROLE", `Alterou papel do usuario ${req.params.id} para ${role}`);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro" });
    }
  });

  app.post("/api/admin/users/:id/change-status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const user = await storage.updateUserStatus(req.params.id, status);
      await logAdminAction(req, "CHANGE_STATUS", `Alterou status do usuario ${req.params.id} para ${status}`);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { password } = z.object({ password: z.string().min(4) }).parse(req.body);
      const { hashPassword } = await import("./replit_integrations/auth/replitAuth");
      const passwordHash = hashPassword(password);
      const { authStorage } = await import("./replit_integrations/auth/storage");
      await authStorage.updateUserPassword(req.params.id, passwordHash);
      await logAdminAction(req, "RESET_PASSWORD", `Redefiniu senha do usuario ${req.params.id}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro ao redefinir senha" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allowedUserFields = z.object({
        displayName: z.string().optional(),
        fullName: z.string().optional(),
        artistName: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
      }).parse(req.body);
      const user = await storage.updateUser(req.params.id, allowedUserFields);
      await logAdminAction(req, "UPDATE_USER", `Atualizou usuario ${req.params.id}`);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      await logAdminAction(req, "DELETE_USER", `Excluiu usuario ${req.params.id}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir usuario" });
    }
  });

  // ADMIN STUDIOS
  app.get("/api/admin/studios", requireAuth, requireAdmin, async (req, res) => {
    const allStudios = await storage.getStudios();
    res.status(200).json(allStudios);
  });

  app.patch("/api/admin/studios/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateStudio(req.params.id, req.body);
      await logAdminAction(req, "UPDATE_STUDIO", `Atualizou estudio ${updated.name}`);
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.delete("/api/admin/studios/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const studio = await storage.getStudio(req.params.id);
      await storage.deleteStudio(req.params.id);
      await logAdminAction(req, "DELETE_STUDIO", `Excluiu estudio ${studio?.name}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir estudio" });
    }
  });

  // ADMIN PRODUCTIONS
  app.get("/api/admin/productions", requireAuth, requireAdmin, async (req, res) => {
    const allProds = await storage.getAllProductions();
    res.status(200).json(allProds);
  });

  app.delete("/api/admin/productions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduction(req.params.id);
      await logAdminAction(req, "DELETE_PRODUCTION", `Excluiu producao ${req.params.id}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir producao" });
    }
  });

  app.patch("/api/admin/productions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allowedFields = z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        videoUrl: z.string().nullable().optional(),
        scriptJson: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
        studioId: z.string().optional(),
      }).parse(req.body);
      const [updated] = await db.update(productions).set(allowedFields).where(eq(productions.id, req.params.id)).returning();
      await logAdminAction(req, "UPDATE_PRODUCTION", `Atualizou producao ${req.params.id}`);
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.post("/api/admin/productions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { studioId, name, description, videoUrl } = req.body;
      if (!studioId || !name) return res.status(400).json({ message: "studioId e name sao obrigatorios" });
      const prod = await storage.createProduction({ studioId, name, description, videoUrl });
      await logAdminAction(req, "CREATE_PRODUCTION", `Criou producao ${prod.name}`);
      res.status(201).json(prod);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  // ADMIN SESSIONS
  app.get("/api/admin/sessions", requireAuth, requireAdmin, async (req, res) => {
    const allSessions = await storage.getAllSessions();
    res.status(200).json(allSessions);
  });

  app.patch("/api/admin/sessions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateSession(req.params.id, req.body);
      await logAdminAction(req, "UPDATE_SESSION", `Atualizou sessao ${req.params.id}`);
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  app.delete("/api/admin/sessions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      await logAdminAction(req, "DELETE_SESSION", `Excluiu sessao ${req.params.id}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir sessao" });
    }
  });

  app.post("/api/admin/sessions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { studioId, productionId, title, scheduledAt, durationMinutes } = req.body;
      if (!studioId || !productionId || !title || !scheduledAt) {
        return res.status(400).json({ message: "Campos obrigatorios em falta" });
      }
      const session = await storage.createSession({
        studioId, productionId, title,
        scheduledAt: new Date(scheduledAt),
        status: "scheduled",
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
      });
      await logAdminAction(req, "CREATE_SESSION", `Criou sessao ${title}`);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados invalidos" });
    }
  });

  // ADMIN TAKES
  app.get("/api/admin/takes", requireAuth, requireAdmin, async (req, res) => {
    const allTakes = await storage.getAllTakes();
    res.status(200).json(allTakes);
  });

  app.get("/api/admin/takes/grouped", requireAuth, requireAdmin, async (req, res) => {
    const allTakes = await storage.getAllTakesGrouped();
    res.status(200).json(allTakes);
  });

  app.delete("/api/admin/takes/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTake(req.params.id);
      await logAdminAction(req, "DELETE_TAKE", `Excluiu take ${req.params.id}`);
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Falha ao excluir take" });
    }
  });

  // PLATFORM SETTINGS
  app.get("/api/admin/settings", requireAuth, requireAdmin, async (req, res) => {
    const settings = await storage.getAllSettings();
    delete (settings as any).SUPABASE_SERVICE_ROLE_KEY;
    res.status(200).json(settings);
  });

  app.post("/api/admin/settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { key, value } = z.object({ key: z.string(), value: z.string() }).parse(req.body);
      await storage.upsertSetting(key, value);
      if (key === "SUPABASE_URL") configureSupabase({ url: value });
      if (key === "SUPABASE_SERVICE_ROLE_KEY") configureSupabase({ serviceRoleKey: value });
      await logAdminAction(req, "UPDATE_SETTING", `Atualizou configuracao ${key}`);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.get("/api/admin/storage/status", requireAuth, requireAdmin, async (_req, res) => {
    const status = await checkSupabaseConnection(true);
    const settings = await storage.getAllSettings();
    res.status(200).json({
      supabaseConfigured: isSupabaseConfigured(),
      supabaseOk: status.ok,
      supabaseReason: status.reason || null,
      supabaseBucket: settings.SUPABASE_BUCKET || "uploads",
    });
  });

  app.post("/api/admin/storage/supabase/smoke", requireAuth, requireAdmin, async (_req, res) => {
    const status = await checkSupabaseConnection(true);
    if (!isSupabaseConfigured() || !status.ok) {
      return res.status(400).json({ message: status.reason || "Supabase indisponivel" });
    }
    const settings = await storage.getAllSettings();
    const bucket = settings.SUPABASE_BUCKET || "uploads";
    const path = `__smoke/${Date.now()}_${randomUUID()}.txt`;
    const marker = `supabase-smoke-${randomUUID()}`;
    const publicUrl = await uploadToSupabaseStorage({
      bucket,
      path,
      buffer: Buffer.from(marker, "utf8"),
      contentType: "text/plain",
    });
    const downloaded = await downloadFromSupabaseStorageUrl(publicUrl);
    const text = await downloaded.text().catch(() => "");
    const parsed = parseSupabaseStorageUrl(publicUrl);
    if (parsed) {
      try {
        await deleteFromSupabaseStorage(parsed);
      } catch (e: any) {
        logger.warn("[Supabase Smoke] Cleanup failed", { bucket: parsed.bucket, path: parsed.path, message: e?.message });
      }
    }
    if (!text.includes(marker)) {
      return res.status(500).json({ message: "Falha ao validar leitura no Supabase" });
    }
    return res.status(200).json({ ok: true, bucket });
  });

  app.get("/api/storage/options", requireAuth, async (_req, res) => {
    const settings = await storage.getAllSettings();
    const status = await checkSupabaseConnection(false);
    let paths: string[] = [];
    try {
      const raw = settings.TAKES_SAVE_PATHS || "[]";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) paths = parsed.map((v) => String(v)).filter(Boolean);
    } catch (err) {
      logger.warn("Failed to parse TAKES_SAVE_PATHS setting", { error: String(err) });
    }
    if (!paths.length) paths = ["uploads"];

    const defaultProvider = "supabase";
    const defaultPath = String(settings.DEFAULT_TAKES_PATH || paths[0] || "uploads");

    res.status(200).json({
      defaultProvider,
      defaultPath,
      paths,
      supabaseConfigured: isSupabaseConfigured(),
      supabaseOk: status.ok,
      supabaseReason: status.reason || null,
      supabaseBucket: settings.SUPABASE_BUCKET || "uploads",
    });
  });

  app.post("/api/create-room", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId obrigatorio" });
      }

      const sessionCheck = await verifySessionAccess(req, res, sessionId);
      if (!sessionCheck) return;

      const roomName = `vhub-${sessionId}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 41);
      const dailyApiKey = process.env.DAILY_API_KEY;
      if (!dailyApiKey) {
        return res.status(500).json({ message: "DAILY_API_KEY nao configurada" });
      }

      const existingRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      });

      if (existingRes.ok) {
        const existing = await existingRes.json() as { url: string };
        return res.json({ url: existing.url });
      }

      const createRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_prejoin_ui: true,
            exp: Math.floor(Date.now() / 1000) + 3600 * 4,
          },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        logger.error("[Daily] Room creation failed", { status: createRes.status, body: err });
        return res.status(500).json({ message: "Falha ao criar sala Daily" });
      }

      const room = await createRes.json() as { url: string };
      logger.info("[Daily] Room created", { roomName, url: room.url });
      res.json({ url: room.url });
    } catch (err: any) {
      logger.error("[Daily] Error", { message: err?.message });
      res.status(500).json({ message: "Erro ao criar sala de video" });
    }
  });

  // ── THE HUB (SECRETARIA) ─────────────────────────────────────────────────────

  function requireHubAdmin(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    const user = req.user as any;
    if (normalizePlatformRole(user?.role) !== "platform_owner") {
      return res.status(403).json({ message: "Acesso restrito a administradores do Hub" });
    }
    next();
  }

  function requireHubStudent(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    next();
  }

  // ── Dados públicos do site ──────────────────────────────────────────────────
  app.get("/api/hub/site-data", async (_req, res) => {
    try {
      const [banners, modules, teachers, learnings, testimonials, faqs, settingsRows] = await Promise.all([
        db.select().from(hubBanners),
        db.select().from(hubModules),
        db.select().from(hubTeachers),
        db.select().from(hubLearnings),
        db.select().from(hubTestimonials),
        db.select().from(hubFaqs),
        db.select().from(hubSettings),
      ]);
      const settings = settingsRows[0]?.data ?? {};
      res.json({ banners, modules, teachers, learnings, testimonials, faqs, settings });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Matrícula pública ───────────────────────────────────────────────────────
  app.post("/api/hub/enrollments", async (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        module: z.string().optional(),
        moduleSlug: z.string().optional(),
      }).parse(req.body);
      const [enrollment] = await db.insert(hubEnrollments).values({
        id: randomUUID(),
        ...body,
        status: "Pendente",
      }).returning();
      res.status(201).json(enrollment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Perfil do aluno logado ─────────────────────────────────────────────────
  app.get("/api/hub/me", requireHubStudent, async (req, res) => {
    const userId = (req.user as any).id;
    try {
      const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
      const [enrollment] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, userId));
      res.json({ profile: profile ?? null, enrollment: enrollment ?? null });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hub/me/messages", requireHubStudent, async (req, res) => {
    const userId = (req.user as any).id;
    const rows = await db.select().from(studentMessages).where(eq(studentMessages.studentId, userId));
    res.json(rows);
  });

  app.get("/api/hub/me/invoices", requireHubStudent, async (req, res) => {
    const userId = (req.user as any).id;
    const rows = await db.select().from(studentInvoices).where(eq(studentInvoices.studentId, userId));
    res.json(rows);
  });

  app.get("/api/hub/me/agenda", requireHubStudent, async (req, res) => {
    const userId = (req.user as any).id;
    const rows = await db.select().from(studentAgenda).where(eq(studentAgenda.studentId, userId));
    res.json(rows);
  });

  app.get("/api/hub/me/support", requireHubStudent, async (req, res) => {
    const userId = (req.user as any).id;
    const rows = await db.select().from(studentSupport).where(eq(studentSupport.studentId, userId));
    res.json(rows);
  });

  app.post("/api/hub/me/support", requireHubStudent, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const body = z.object({
        subject: z.string().min(1),
        message: z.string().min(1),
        email: z.string().email().optional(),
        name: z.string().optional(),
      }).parse(req.body);
      const [ticket] = await db.insert(studentSupport).values({
        id: randomUUID(),
        studentId: userId,
        ...body,
        status: "Aberto",
      }).returning();
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/hub/me/messages/:id/read", requireHubStudent, async (req, res) => {
    await db.update(studentMessages).set({ read: true }).where(eq(studentMessages.id, req.params.id));
    res.json({ ok: true });
  });

  // ── Admin: alunos ──────────────────────────────────────────────────────────

  // Alunos = users cujo role normalizado é "dublador" (cobre aliases: user, student, aluno, etc.)
  app.get("/api/hub/admin/students", requireHubAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    const profiles = await db.select().from(studentProfiles);
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));
    const students = allUsers
      .filter(u => normalizePlatformRole(u.role) === "dublador")
      .map(u => {
        const { passwordHash, ...safe } = u as any;
        const profile = profileMap[u.id] ?? {};
        return {
          ...safe,
          full_name: (profile as any).fullName ?? u.fullName ?? u.displayName ?? u.email,
          avatar_url: (profile as any).avatarUrl ?? u.avatarUrl ?? null,
          phone: (profile as any).phone ?? (u as any).phone ?? null,
        };
      });
    res.json(students);
  });

  // Retorna usuários com role=diretor
  app.get("/api/hub/admin/diretores", requireHubAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    const diretores = allUsers
      .filter(u => normalizePlatformRole(u.role) === "diretor")
      .map(u => { const { passwordHash, ...safe } = u as any; return safe; });
    res.json(diretores);
  });

  // Retorna usuarios com role platform_owner ou studio_admin (exclui diretores)
  app.get("/api/hub/admin/directors", requireHubAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    const others = allUsers
      .filter(u => ["platform_owner", "studio_admin"].includes(normalizePlatformRole(u.role)))
      .map(u => { const { passwordHash, ...safe } = u as any; return safe; });
    res.json(others);
  });

  // Busca usuários por email (para adicionar diretor)
  app.get("/api/hub/admin/users/search", requireHubAdmin, async (req, res) => {
    const email = (req.query.email as string || "").toLowerCase().trim();
    if (!email) return res.json([]);
    const allUsers = await db.select().from(users);
    const results = allUsers
      .filter(u => u.email?.toLowerCase().includes(email))
      .slice(0, 10)
      .map(u => { const { passwordHash, ...safe } = u as any; return safe; });
    res.json(results);
  });

  // Muda o role (e opcionalmente status) de um usuário (platform_owner apenas)
  app.patch("/api/hub/admin/users/:uid/role", requireHubAdmin, async (req, res) => {
    try {
      if (normalizePlatformRole((req.user as any)?.role) !== "platform_owner") {
        return res.status(403).json({ message: "Apenas o platform_owner pode alterar roles" });
      }
      const { role, status } = req.body;
      if (!role) return res.status(400).json({ message: "role é obrigatório" });
      const update: Record<string, any> = { role };
      if (status) update.status = status;
      const [updated] = await db.update(users).set(update).where(eq(users.id, req.params.uid)).returning();
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      const { passwordHash: _ph, ...safe } = updated as any;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Cria aluno: cria usuário + student_profile atomicamente
  app.post("/api/hub/admin/students", requireHubAdmin, async (req, res) => {
    try {
      const { full_name, email, password } = req.body;
      if (!full_name || !email || !password) {
        return res.status(400).json({ message: "full_name, email e password são obrigatórios" });
      }
      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (existing) return res.status(409).json({ message: "Este email já está em uso" });
      const [newUser] = await db.insert(users).values({
        id: randomUUID(),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        fullName: full_name,
        displayName: full_name,
        role: "dublador",
        status: "approved",
      } as any).returning();
      await db.insert(studentProfiles).values({
        id: randomUUID(),
        userId: newUser.id,
        fullName: full_name,
      } as any);
      const { passwordHash: _ph, ...safeUser } = newUser as any;
      res.status(201).json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/hub/admin/enrollments", requireHubAdmin, async (_req, res) => {
    const rows = await db.select().from(hubEnrollments);
    res.json(rows);
  });

  app.patch("/api/hub/admin/enrollments/:id", requireHubAdmin, async (req, res) => {
    try {
      const [updated] = await db.update(hubEnrollments)
        .set(req.body)
        .where(eq(hubEnrollments.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/hub/admin/enrollments/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubEnrollments).where(eq(hubEnrollments.id, req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/hub/admin/messages", requireHubAdmin, async (req, res) => {
    try {
      const body = z.object({
        studentId: z.string(),
        title: z.string().min(1),
        body: z.string().min(1),
      }).parse(req.body);
      const [msg] = await db.insert(studentMessages).values({ id: randomUUID(), ...body }).returning();
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/hub/admin/invoices", requireHubAdmin, async (req, res) => {
    try {
      const body = z.object({
        studentId: z.string(),
        description: z.string(),
        amount: z.string(),
        dueDate: z.string().optional(),
        due_date: z.string().optional(),
      }).parse(req.body);
      const { due_date, ...rest } = body;
      const [inv] = await db.insert(studentInvoices).values({ id: randomUUID(), ...rest, dueDate: rest.dueDate ?? due_date }).returning();
      res.status(201).json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/hub/admin/support", requireHubAdmin, async (_req, res) => {
    const rows = await db.select().from(studentSupport);
    res.json(rows);
  });

  app.patch("/api/hub/admin/support/:id", requireHubAdmin, async (req, res) => {
    try {
      const adminReply = req.body.adminReply ?? req.body.admin_reply;
      const [updated] = await db.update(studentSupport)
        .set({ adminReply, status: req.body.status ?? "Respondido", updatedAt: new Date() })
        .where(eq(studentSupport.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Admin: per-student data ────────────────────────────────────────────────

  app.get("/api/hub/admin/students/:uid/messages", requireHubAdmin, async (req, res) => {
    const rows = await db.select().from(studentMessages).where(eq(studentMessages.studentId, req.params.uid));
    res.json(rows);
  });

  app.delete("/api/hub/admin/messages/:id", requireHubAdmin, async (req, res) => {
    await db.delete(studentMessages).where(eq(studentMessages.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/hub/admin/students/:uid/invoices", requireHubAdmin, async (req, res) => {
    const rows = await db.select().from(studentInvoices).where(eq(studentInvoices.studentId, req.params.uid));
    res.json(rows);
  });

  app.patch("/api/hub/admin/invoices/:id", requireHubAdmin, async (req, res) => {
    try {
      const { id, createdAt, studentId, ...body } = req.body;
      const [updated] = await db.update(studentInvoices).set(body).where(eq(studentInvoices.id, req.params.id)).returning();
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/hub/admin/invoices/:id", requireHubAdmin, async (req, res) => {
    await db.delete(studentInvoices).where(eq(studentInvoices.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/hub/admin/students/:uid/enrollment", requireHubAdmin, async (req, res) => {
    const [enrollment] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, req.params.uid));
    res.json(enrollment ?? null);
  });

  app.post("/api/hub/admin/students/:uid/enrollment", requireHubAdmin, async (req, res) => {
    try {
      const uid = req.params.uid;
      const { module, moduleSlug, status, progress } = req.body;
      const [existing] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, uid));
      if (existing) {
        const [updated] = await db.update(studentEnrollments)
          .set({ module, moduleSlug, status: status ?? "Ativo", progress: progress ?? existing.progress, updatedAt: new Date() })
          .where(eq(studentEnrollments.studentId, uid))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(studentEnrollments)
          .values({ id: randomUUID(), studentId: uid, module, moduleSlug, status: status ?? "Ativo", progress: progress ?? 0 })
          .returning();
        res.status(201).json(created);
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/hub/admin/students/:uid/agenda", requireHubAdmin, async (req, res) => {
    const rows = await db.select().from(studentAgenda).where(eq(studentAgenda.studentId, req.params.uid));
    res.json(rows);
  });

  app.post("/api/hub/admin/students/:uid/agenda", requireHubAdmin, async (req, res) => {
    try {
      const { title, date, time, description, type } = req.body;
      const [item] = await db.insert(studentAgenda)
        .values({ id: randomUUID(), studentId: req.params.uid, title, date, time, description, type: type ?? "Aula" })
        .returning();
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/hub/admin/agenda/:id", requireHubAdmin, async (req, res) => {
    await db.delete(studentAgenda).where(eq(studentAgenda.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/hub/admin/students/:uid/support", requireHubAdmin, async (req, res) => {
    const rows = await db.select().from(studentSupport).where(eq(studentSupport.studentId, req.params.uid));
    res.json(rows);
  });

  app.delete("/api/hub/admin/students/:uid", requireHubAdmin, async (req, res) => {
    try {
      // Demote dublador → user + status pending (inativo), preserva conta Estudio
      await db.update(users).set({ role: "user", status: "pending" } as any).where(eq(users.id, req.params.uid));
      await db.delete(studentProfiles).where(eq(studentProfiles.userId, req.params.uid));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Admin: conteúdo do site ─────────────────────────────────────────────────
  app.get("/api/hub/admin/settings", requireHubAdmin, async (_req, res) => {
    const [row] = await db.select().from(hubSettings);
    res.json(row?.data ?? {});
  });

  app.put("/api/hub/admin/settings", requireHubAdmin, async (req, res) => {
    await db.insert(hubSettings).values({ id: "global", data: req.body })
      .onConflictDoUpdate({ target: hubSettings.id, set: { data: req.body } });
    res.json({ ok: true });
  });

  // Banners
  app.get("/api/hub/admin/banners", requireHubAdmin, async (_req, res) => res.json(await db.select().from(hubBanners)));
  app.post("/api/hub/admin/banners", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.insert(hubBanners).values(body).returning();
    res.status(201).json(row);
  });
  app.patch("/api/hub/admin/banners/:id", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.update(hubBanners).set(body).where(eq(hubBanners.id, Number(req.params.id))).returning();
    res.json(row);
  });
  app.delete("/api/hub/admin/banners/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubBanners).where(eq(hubBanners.id, Number(req.params.id)));
    res.json({ ok: true });
  });

  // Módulos
  app.get("/api/hub/admin/modules", requireHubAdmin, async (_req, res) => res.json(await db.select().from(hubModules)));
  app.post("/api/hub/admin/modules", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.insert(hubModules).values(body).returning();
    res.status(201).json(row);
  });
  app.patch("/api/hub/admin/modules/:id", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.update(hubModules).set(body).where(eq(hubModules.id, Number(req.params.id))).returning();
    res.json(row);
  });
  app.delete("/api/hub/admin/modules/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubModules).where(eq(hubModules.id, Number(req.params.id)));
    res.json({ ok: true });
  });

  // Professores
  app.get("/api/hub/admin/teachers", requireHubAdmin, async (_req, res) => res.json(await db.select().from(hubTeachers)));
  app.post("/api/hub/admin/teachers", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.insert(hubTeachers).values(body).returning();
    res.status(201).json(row);
  });
  app.patch("/api/hub/admin/teachers/:id", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.update(hubTeachers).set(body).where(eq(hubTeachers.id, Number(req.params.id))).returning();
    res.json(row);
  });
  app.delete("/api/hub/admin/teachers/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubTeachers).where(eq(hubTeachers.id, Number(req.params.id)));
    res.json({ ok: true });
  });

  // FAQs
  app.get("/api/hub/admin/faqs", requireHubAdmin, async (_req, res) => res.json(await db.select().from(hubFaqs)));
  app.post("/api/hub/admin/faqs", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.insert(hubFaqs).values(body).returning();
    res.status(201).json(row);
  });
  app.patch("/api/hub/admin/faqs/:id", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.update(hubFaqs).set(body).where(eq(hubFaqs.id, Number(req.params.id))).returning();
    res.json(row);
  });
  app.delete("/api/hub/admin/faqs/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubFaqs).where(eq(hubFaqs.id, Number(req.params.id)));
    res.json({ ok: true });
  });

  // Depoimentos
  app.get("/api/hub/admin/testimonials", requireHubAdmin, async (_req, res) => res.json(await db.select().from(hubTestimonials)));
  app.post("/api/hub/admin/testimonials", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.insert(hubTestimonials).values(body).returning();
    res.status(201).json(row);
  });
  app.patch("/api/hub/admin/testimonials/:id", requireHubAdmin, async (req, res) => {
    const { id, createdAt, ...body } = req.body;
    const [row] = await db.update(hubTestimonials).set(body).where(eq(hubTestimonials.id, Number(req.params.id))).returning();
    res.json(row);
  });
  app.delete("/api/hub/admin/testimonials/:id", requireHubAdmin, async (req, res) => {
    await db.delete(hubTestimonials).where(eq(hubTestimonials.id, Number(req.params.id)));
    res.json({ ok: true });
  });

  // ── Hub: registro de aluno ──────────────────────────────────────────────────
  app.post("/api/hub/auth/register", async (req, res) => {
    try {
      const body = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(2),
        phone: z.string().optional(),
      }).parse(req.body);

      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(400).json({ message: "E-mail já cadastrado" });

      const { hashPassword } = await import("./replit_integrations/auth/replitAuth");
      const { authStorage } = await import("./replit_integrations/auth/storage");
      const newUser = await authStorage.createUser({
        email: body.email,
        passwordHash: hashPassword(body.password),
        fullName: body.fullName,
        displayName: body.fullName,
        role: "student",
        status: "approved",
      });

      await db.insert(studentProfiles).values({
        id: randomUUID(),
        userId: newUser.id,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone ?? "",
        role: "student",
        status: "Ativo",
      });

      res.status(201).json({ id: newUser.id, email: newUser.email, fullName: body.fullName });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─────────────────────────────────────────────
  //  MTG-STUDIO INTEGRATION
  // ─────────────────────────────────────────────

  const MTG_URL = process.env.MTG_STUDIO_URL || "http://localhost:8000";

  // Proxy: GET job status
  app.get("/api/mtg/job/:jobId/status", requireAuth, async (req, res) => {
    try {
      const r = await fetch(`${MTG_URL}/api/job/${req.params.jobId}/status`);
      const data = await r.json();
      res.status(r.status).json(data);
    } catch {
      res.status(503).json({ message: "MTG-STUDIO indisponível. Execute: npm run mtg:start" });
    }
  });

  // Proxy: GET download final video — streams to avoid buffering large files in memory
  app.get("/api/mtg/job/:jobId/download/:filename", requireAuth, async (req, res) => {
    try {
      const r = await fetch(`${MTG_URL}/api/download/${req.params.filename}`);
      if (!r.ok) return res.status(r.status).json({ message: "Arquivo não encontrado no MTG-STUDIO" });
      if (!r.body) return res.status(502).json({ message: "Resposta vazia do MTG-STUDIO" });
      res.setHeader("Content-Type", r.headers.get("content-type") || "video/mp4");
      const cl = r.headers.get("content-length");
      if (cl) res.setHeader("Content-Length", cl);
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
      const { Readable } = await import("stream");
      Readable.fromWeb(r.body as any).pipe(res);
    } catch {
      res.status(503).json({ message: "MTG-STUDIO indisponível" });
    }
  });

  // Finalize session: export approved takes → send to MTG-STUDIO
  app.post("/api/sessions/:sessionId/finalize", requireAuth, async (req, res) => {
    try {
      const session = await verifySessionAccess(req, res, req.params.sessionId);
      if (!session) return;

      // Get approved takes with character/actor info
      const allTakes = await storage.getSessionTakesWithDetails(req.params.sessionId);
      const approved = allTakes.filter((t: any) => t.status === "approved");
      if (approved.length === 0) {
        return res.status(400).json({ message: "Nenhum take aprovado encontrado nesta sessão." });
      }

      // Get session video URL
      const production = await storage.getProduction((session as any).productionId);
      const videoUrl: string = (production as any)?.videoUrl || "";
      if (!videoUrl) {
        return res.status(400).json({ message: "Produção sem vídeo de referência. Adicione um vídeo à produção." });
      }

      // 1. Upload video to MTG-STUDIO
      const FormDataLib = (await import("form-data")).default;

      const _uploadVideoToMtg = async (vidBuf: Buffer, filename: string): Promise<string> => {
        const fd = new FormDataLib();
        fd.append("file", vidBuf, { filename, contentType: "video/mp4" });
        const uploadRes = await fetch(`${MTG_URL}/api/upload/video`, { method: "POST", body: fd as any, headers: fd.getHeaders() });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(`MTG: ${(err as any).detail || "Erro ao subir vídeo"}`);
        }
        const uploadData = await uploadRes.json();
        return uploadData.job_id as string;
      };

      let jobId: string;
      if (/^https?:\/\//i.test(videoUrl)) {
        const vidRes = await fetch(videoUrl);
        if (!vidRes.ok) return res.status(400).json({ message: "Não foi possível baixar o vídeo da produção." });
        const vidBuf = Buffer.from(await vidRes.arrayBuffer());
        const ext = videoUrl.split(".").pop()?.split("?")[0] || "mp4";
        try { jobId = await _uploadVideoToMtg(vidBuf, `video.${ext}`); }
        catch (e: any) { return res.status(500).json({ message: e.message }); }
      } else {
        const localPath = path.join(process.cwd(), "public", videoUrl.replace(/^\/+/, ""));
        if (!fs.existsSync(localPath)) return res.status(400).json({ message: "Arquivo de vídeo não encontrado localmente." });
        const vidBuf = fs.readFileSync(localPath);
        const ext = path.extname(localPath).slice(1) || "mp4";
        try { jobId = await _uploadVideoToMtg(vidBuf, `video.${ext}`); }
        catch (e: any) { return res.status(500).json({ message: e.message }); }
      }

      // Wait a moment for Demucs to start registering the job
      await new Promise(r2 => setTimeout(r2, 500));

      // 2. Upload approved takes as WAV files named PERSONAGEM_DUBLADOR_TIMECODE.wav
      const fd2 = new FormDataLib();
      let takesUploaded = 0;

      for (const take of approved) {
        const charName = ((take as any).characterName || "PERSONAGEM").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const actorName = ((take as any).voiceActorName || "DUBLADOR").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const startSec = (take as any).startTimeSeconds ?? 0;
        const hh = Math.floor(startSec / 3600);
        const mm = Math.floor((startSec % 3600) / 60);
        const ss = Math.floor(startSec % 60);
        const ms = Math.round((startSec % 1) * 1000);
        const timecode = `${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}${String(ss).padStart(2, "0")}${String(ms).padStart(3, "0")}`;
        const mtgFilename = `${charName}_${actorName}_${timecode}.wav`;

        const audioUrl: string = (take as any).audioUrl || "";
        let audioBuf: Buffer | null = null;

        try {
          const supabaseParsed = parseSupabaseStorageUrl(audioUrl);
          if (supabaseParsed && isSupabaseConfigured()) {
            const dl = await downloadFromSupabaseStorageUrl(audioUrl);
            audioBuf = Buffer.from(await dl.arrayBuffer());
          } else if (audioUrl.startsWith("/uploads/")) {
            audioBuf = fs.readFileSync(path.join(process.cwd(), "public", audioUrl));
          } else if (/^https?:\/\//i.test(audioUrl)) {
            const dl = await fetch(audioUrl);
            if (dl.ok) audioBuf = Buffer.from(await dl.arrayBuffer());
          }
        } catch (e: any) {
          logger.warn(`[MTG Finalize] Skipping take ${take.id}: ${e?.message}`);
          continue;
        }

        if (!audioBuf) continue;
        fd2.append("files", audioBuf, { filename: mtgFilename, contentType: "audio/wav" });
        takesUploaded++;
      }

      if (takesUploaded === 0) {
        return res.status(400).json({ message: "Não foi possível baixar nenhum take aprovado." });
      }

      const takesRes = await fetch(`${MTG_URL}/api/upload/takes/${jobId}`, { method: "POST", body: fd2 as any, headers: fd2.getHeaders() });
      if (!takesRes.ok) {
        const err = await takesRes.json().catch(() => ({}));
        return res.status(500).json({ message: `MTG takes: ${(err as any).detail || "Erro ao subir takes"}` });
      }

      // 3. Start processing
      const processRes = await fetch(`${MTG_URL}/api/job/${jobId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume_me: 0.8, volume_dialogos: 1.0, lipsync_trim: true }),
      });
      if (!processRes.ok) {
        const err = await processRes.json().catch(() => ({}));
        return res.status(500).json({ message: `MTG process: ${(err as any).detail || "Erro ao iniciar processamento"}` });
      }

      res.json({ jobId, takesUploaded, message: "Pós-produção iniciada com sucesso." });
    } catch (err: any) {
      logger.error("[MTG Finalize]", err);
      res.status(500).json({ message: err?.message || "Erro ao finalizar sessão" });
    }
  });

  return httpServer;
}
