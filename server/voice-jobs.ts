import type { Express } from "express";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./middleware/auth";
import { storage } from "./storage";

function safeAudioPath(audioUrl: string): string | null {
  const normalized = audioUrl.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", normalized);
  const uploadsBase = path.resolve(process.cwd(), "public", "uploads");
  if (!resolved.startsWith(uploadsBase)) return null;
  return resolved;
}

function safeJobId(jobId: string): string | null {
  const cleaned = jobId.replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!cleaned || cleaned.length < 8) return null;
  return cleaned;
}

export function registerVoiceJobs(app: Express) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const voiceJobsDir = path.join(process.cwd(), "public", "voice-jobs");
  fs.mkdirSync(voiceJobsDir, { recursive: true });

  const voiceUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadsDir),
      filename: (_req, file, cb) => {
        const original = file.originalname || "take";
        const safe = original.replace(/[^a-zA-Z0-9_.\\-]/g, "");
        const ext = path.extname(safe);
        const base = safe.slice(0, Math.max(0, safe.length - ext.length));
        cb(
          null,
          `${base || "take"}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext || ".wav"}`,
        );
      },
    }),
    limits: { fileSize: 1024 * 1024 * 256 },
  });

  function voiceJobStatusPath(jobId: string): string {
    return path.join(voiceJobsDir, jobId, "status.json");
  }

  function ensureVoiceJobDir(jobId: string): string {
    const dir = path.join(voiceJobsDir, jobId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  app.post("/api/voice-jobs", voiceUpload.single("take"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Arquivo não enviado" });

      const filename = path.basename(req.file.path);
      const publicRel = `/uploads/${filename}`;
      const inputPath = safeAudioPath(publicRel);
      if (!inputPath || !fs.existsSync(inputPath)) {
        return res.status(400).json({ message: "Falha ao salvar arquivo" });
      }

      const jobId = randomUUID();
      const jobDir = ensureVoiceJobDir(jobId);

      const initialStatus = {
        job_id: jobId,
        status: "queued",
        step: "queued",
        progress: 0,
        message: null,
        error: null,
        outputs: null,
      };
      fs.writeFileSync(voiceJobStatusPath(jobId), JSON.stringify(initialStatus, null, 2));

      const workerScript = path.join(process.cwd(), "services", "media-pipeline", "voice_worker.py");
      const venvPython = path.join(process.cwd(), "services", "media-pipeline", ".venv", "bin", "python");
      const python = process.env.PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : "python3");
      const bundledFfmpeg = path.join(process.cwd(), "services", "media-pipeline", "bin", "ffmpeg");
      const ffmpegPath = process.env.FFMPEG_PATH || (fs.existsSync(bundledFfmpeg) ? bundledFfmpeg : "ffmpeg");

      const outFd = fs.openSync(path.join(jobDir, "worker.log"), "a");
      const errFd = fs.openSync(path.join(jobDir, "worker.err.log"), "a");

      const child = spawn(python, [workerScript, "--job-id", jobId, "--input", publicRel], {
        detached: true,
        stdio: ["ignore", outFd, errFd],
        env: {
          ...process.env,
          VHUB_REPO_ROOT: process.cwd(),
          VHUB_PUBLIC_DIR: path.join(process.cwd(), "public"),
          VHUB_VOICE_JOBS_DIR: path.join(process.cwd(), "public", "voice-jobs"),
          VHUB_UPLOADS_DIR: path.join(process.cwd(), "public", "uploads"),
          FFMPEG_PATH: ffmpegPath,
        },
      });

      try {
        fs.closeSync(outFd);
      } catch {}
      try {
        fs.closeSync(errFd);
      } catch {}

      child.on("error", (e: any) => {
        try {
          const failed = {
            ...initialStatus,
            status: "failed",
            step: "error",
            progress: 1,
            error: e?.message || "Falha ao iniciar worker",
          };
          fs.writeFileSync(voiceJobStatusPath(jobId), JSON.stringify(failed, null, 2));
        } catch {}
      });

      child.unref();

      res.status(201).json({ jobId, input: publicRel, statusUrl: `/api/voice-jobs/${jobId}` });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao criar job" });
    }
  });

  app.post("/api/voice-jobs/from-take/:takeId", requireAuth, async (req, res) => {
    try {
      const takeId = String(req.params.takeId || "");
      if (!takeId) return res.status(400).json({ message: "takeId inválido" });

      const takeList = await storage.getTakesByIds([takeId]);
      if (!takeList || takeList.length === 0) return res.status(404).json({ message: "Take nao encontrado" });
      const take: any = takeList[0];

      const user = (req as any).user!;
      if (user.role !== "platform_owner") {
        const roles = await storage.getUserRolesInStudio(user.id, take.studioId);
        const isStudioAdmin = Array.isArray(roles) && roles.includes("studio_admin");
        const isOwner = take.voiceActorId === user.id;
        if (!isStudioAdmin && !isOwner) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      const publicRel = String(take.audioUrl || "");
      const inputPath = safeAudioPath(publicRel);
      if (!publicRel || !inputPath || !fs.existsSync(inputPath)) {
        return res.status(400).json({ message: "Arquivo do take nao encontrado" });
      }

      const jobId = randomUUID();
      const jobDir = ensureVoiceJobDir(jobId);

      const initialStatus = {
        job_id: jobId,
        status: "queued",
        step: "queued",
        progress: 0,
        message: null,
        error: null,
        outputs: null,
      };
      fs.writeFileSync(voiceJobStatusPath(jobId), JSON.stringify(initialStatus, null, 2));

      const workerScript = path.join(process.cwd(), "services", "media-pipeline", "voice_worker.py");
      const venvPython = path.join(process.cwd(), "services", "media-pipeline", ".venv", "bin", "python");
      const python = process.env.PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : "python3");
      const bundledFfmpeg = path.join(process.cwd(), "services", "media-pipeline", "bin", "ffmpeg");
      const ffmpegPath = process.env.FFMPEG_PATH || (fs.existsSync(bundledFfmpeg) ? bundledFfmpeg : "ffmpeg");

      const outFd = fs.openSync(path.join(jobDir, "worker.log"), "a");
      const errFd = fs.openSync(path.join(jobDir, "worker.err.log"), "a");

      const child = spawn(python, [workerScript, "--job-id", jobId, "--input", publicRel], {
        detached: true,
        stdio: ["ignore", outFd, errFd],
        env: {
          ...process.env,
          VHUB_REPO_ROOT: process.cwd(),
          VHUB_PUBLIC_DIR: path.join(process.cwd(), "public"),
          VHUB_VOICE_JOBS_DIR: path.join(process.cwd(), "public", "voice-jobs"),
          VHUB_UPLOADS_DIR: path.join(process.cwd(), "public", "uploads"),
          FFMPEG_PATH: ffmpegPath,
        },
      });

      try {
        fs.closeSync(outFd);
      } catch {}
      try {
        fs.closeSync(errFd);
      } catch {}

      child.on("error", (e: any) => {
        try {
          const failed = {
            ...initialStatus,
            status: "failed",
            step: "error",
            progress: 1,
            error: e?.message || "Falha ao iniciar worker",
          };
          fs.writeFileSync(voiceJobStatusPath(jobId), JSON.stringify(failed, null, 2));
        } catch {}
      });

      child.unref();

      res.status(201).json({ jobId, input: publicRel, statusUrl: `/api/voice-jobs/${jobId}` });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao criar job" });
    }
  });

  app.get("/api/voice-jobs/:jobId", async (req, res) => {
    try {
      const jobId = safeJobId(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Job inválido" });

      const p = voiceJobStatusPath(jobId);
      if (!fs.existsSync(p)) return res.status(404).json({ message: "Job não encontrado" });

      const raw = fs.readFileSync(p, "utf-8");
      res.status(200).json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Erro ao consultar job" });
    }
  });
}
