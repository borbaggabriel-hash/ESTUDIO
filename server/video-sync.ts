import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { pool } from "./db";
import { isPrivilegedStudioRole, normalizePlatformRole, normalizeStudioRole, getHighestStudioRole } from "@shared/roles";
import { logger } from "./lib/logger";

interface SyncMessage {
  type:
    | "video-play"
    | "video-pause"
    | "video-seek"
    | "grant-permission"
    | "revoke-permission"
    | "sync-loop"
    | "toggle-global-control"
    | "revoke-all"
    | "permission-sync"
    | "presence-sync"
    | "text-control:state"
    | "text-control:set-controller"
    | "text-control:clear-controller"
    | "text-control:set-controllers"
    | "text-control:grant-controller"
    | "text-control:revoke-controller"
    | "text-control:update-line"
    | "take:approved"
    | "take:rejected"
    | "take:pending-approval";
  currentTime?: number;
  lineIndex?: number;
  targetUserId?: string;
  targetUserIds?: string[];
  loopRange?: { start: number; end: number } | null;
  userId?: string;
  role?: string;
  globalControl?: boolean;
  permissions?: string[];
  users?: Array<{ userId: string; name: string; role?: string }>;
  controllerUserId?: string | null;
  controllerUserIds?: string[];
  text?: string;
  // Take review fields
  takeId?: string;
  voiceActorId?: string;
  voiceActorName?: string;
  feedback?: string;
  isFinal?: boolean;
  reviewedBy?: string;
  audioUrl?: string;
  startTimeSeconds?: number;
  durationSeconds?: number;
  characterName?: string;
}

export const rooms = new Map<string, Set<WebSocket & { userId?: string; role?: string; name?: string; sessionId?: string }>>();
const tempPermissions = new Map<string, Set<string>>();
const globalControlSessions = new Map<string, boolean>();
const textControllerSessions = new Map<string, Set<string>>();

function getTextControllers(sessionId: string) {
  return textControllerSessions.get(sessionId) || new Set<string>();
}

function setTextControllers(sessionId: string, userIds: Iterable<string>) {
  const next = new Set(Array.from(userIds).filter(Boolean));
  if (next.size === 0) {
    textControllerSessions.delete(sessionId);
  } else {
    textControllerSessions.set(sessionId, next);
  }
  return next;
}

function getRoster(room: Set<WebSocket & { userId?: string; role?: string; name?: string }>) {
  const users: Array<{ userId: string; name: string; role?: string }> = [];
  room.forEach((ws) => {
    if (!ws.userId) return;
    users.push({ userId: ws.userId, name: ws.name || "Usuario", role: ws.role });
  });
  return users;
}

export function broadcast(room: Set<WebSocket>, data: any) {
  const payload = JSON.stringify(data);
  room.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function parseCookies(header: string | undefined) {
  const out: Record<string, string> = {};
  const raw = String(header || "");
  if (!raw) return out;
  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

async function getAuthenticatedUserId(req: any) {
  const cookies = parseCookies(req.headers?.cookie);
  const sidCookie = cookies["connect.sid"];
  if (!sidCookie) return null;

  const decoded = decodeURIComponent(sidCookie);
  const signed = decoded.startsWith("s:") ? decoded.slice(2) : decoded;

  let sid: string | null = null;
  try {
    const mod: any = await import("cookie-signature");
    const secret = process.env.SESSION_SECRET || "dev-session-secret-NOT-FOR-PRODUCTION";
    const unsigned = mod.unsign(signed, secret);
    if (typeof unsigned === "string" && unsigned) sid = unsigned;
  } catch {
    const cut = signed.split(".")[0];
    sid = cut || null;
  }

  if (!sid) return null;

  const row = await pool.query("select sess from http_sessions where sid = $1 and expire > now() limit 1", [sid]);
  const sess = row.rows?.[0]?.sess;
  const userId = sess?.passport?.user;
  return typeof userId === "string" && userId ? userId : null;
}

async function getWsIdentity(sessionId: string, req: any, queryUserId?: string | null) {
  // Cookie-based auth only (no query param fallback for security)
  const userId = await getAuthenticatedUserId(req);
  
  if (!userId) {
    return null;
  }

  const ures = await pool.query(
    "select id, role, full_name, display_name, email from users where id = $1 limit 1",
    [userId],
  );
  const userRow = ures.rows?.[0];
  if (!userRow?.id) {
    logger.warn('[WebSocket Auth] User not found in database', { userId });
    return null;
  }
  
  logger.info('[WebSocket Auth] User found', { email: userRow.email, role: userRow.role });

  const platformRole = normalizePlatformRole(userRow.role);
  const name = String(userRow.display_name || userRow.full_name || userRow.email || "Usuario");

  // Resolve effective role: platform_owner always wins; otherwise check studio membership roles
  let resolvedRole = platformRole;
  if (platformRole !== "platform_owner") {
    try {
      const sessionRes = await pool.query(
        "SELECT studio_id FROM recording_sessions WHERE id = $1 LIMIT 1",
        [sessionId]
      );
      const studioId = sessionRes.rows?.[0]?.studio_id;
      if (studioId) {
        const rolesRes = await pool.query(
          `SELECT usr.role FROM user_studio_roles usr
           JOIN studio_memberships sm ON sm.id = usr.membership_id
           WHERE sm.user_id = $1 AND sm.studio_id = $2 AND sm.status = 'approved'`,
          [userId, studioId]
        );
        const studioRoles = (rolesRes.rows as Array<{ role: string }>).map(r => normalizeStudioRole(r.role));
        if (studioRoles.length > 0) {
          resolvedRole = getHighestStudioRole(studioRoles);
        }
      }
    } catch (err) {
      logger.warn('[WebSocket Auth] Could not resolve studio role, falling back to platform role', { userId, error: String(err) });
    }
  }

  logger.info('[WebSocket Auth] Authenticated', { name, resolvedRole });
  return { userId, role: resolvedRole, name, platformRole };
}

export function setupVideoSync(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/video-sync" });

  // Heartbeat: ping every 25s, terminate if no pong within 10s
  // Keeps connections alive through proxies/NATs/firewalls with idle timeouts
  const PING_INTERVAL = 25_000;
  const PONG_TIMEOUT = 10_000;
  const aliveMap = new WeakMap<WebSocket, boolean>();

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (aliveMap.get(ws) === false) {
        // No pong received since last ping — connection is dead
        ws.terminate();
        return;
      }
      aliveMap.set(ws, false);
      ws.ping();
    });
  }, PING_INTERVAL);

  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws: WebSocket & { userId?: string; role?: string; name?: string; sessionId?: string }, req) => {
    aliveMap.set(ws, true);
    ws.on("pong", () => aliveMap.set(ws, true));
    (async () => {
      const rawUrl = req.url ?? "";
      const url = new URL(rawUrl, `http://${req.headers.host ?? "localhost"}`);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        ws.close(1008, "sessionId required");
        return;
      }

      const identity = await getWsIdentity(sessionId, req, url.searchParams.get("userId"));
      if (!identity) {
        logger.warn('[WebSocket] Auth failed', { sessionId });
        ws.close(1008, "unauthorized");
        return;
      }
      
      logger.info('[WebSocket] User connected', { name: identity.name, role: identity.role, sessionId });

      ws.userId = identity.userId;
      ws.role = identity.role;
      ws.name = identity.name;
      ws.sessionId = sessionId;

      if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
      rooms.get(sessionId)!.add(ws);

      const room = rooms.get(sessionId)!;
      const perms = Array.from(tempPermissions.get(sessionId) || []);
      const globalControl = globalControlSessions.get(sessionId) || false;
      const controllerUserIds = Array.from(getTextControllers(sessionId));
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "permission-sync", permissions: perms, globalControl } satisfies SyncMessage));
        ws.send(JSON.stringify({ type: "presence-sync", users: getRoster(room) } satisfies SyncMessage));
        ws.send(JSON.stringify({ type: "text-control:state", controllerUserIds } satisfies SyncMessage));
      }
      broadcast(room as any, { type: "presence-sync", users: getRoster(room) } satisfies SyncMessage);
      broadcast(room as any, { type: "text-control:state", controllerUserIds } satisfies SyncMessage);
    })().catch(() => {
      ws.close(1011, "internal");
    });

    ws.on("message", (data) => {
      try {
        if (!ws.userId || !ws.role) return;
        const msg = JSON.parse(data.toString()) as SyncMessage;
        const sessionId = String(ws.sessionId || "");
        const room = rooms.get(sessionId);
        if (!room) return;

        const isPrivileged = isPrivilegedStudioRole(ws.role);
        const controllerUserIds = getTextControllers(sessionId);
        const isController = Boolean(ws.userId && controllerUserIds.has(ws.userId));
        // canControl = privilegiado OU autorizado nominalmente OU controle global aberto
        const tempPerms = tempPermissions.get(sessionId);
        const hasTempPerm = Boolean(ws.userId && tempPerms?.has(ws.userId));
        const globalControl = globalControlSessions.get(sessionId) || false;
        const canControl = isPrivileged || hasTempPerm || globalControl;

        if (
          msg.type === "grant-permission" ||
          msg.type === "revoke-permission" ||
          msg.type === "toggle-global-control" ||
          msg.type === "revoke-all" ||
          msg.type === "text-control:set-controller" ||
          msg.type === "text-control:clear-controller" ||
          msg.type === "text-control:set-controllers" ||
          msg.type === "text-control:grant-controller" ||
          msg.type === "text-control:revoke-controller"
        ) {
          if (!isPrivileged) return;

          if (msg.type === "grant-permission" && msg.targetUserId) {
            if (!tempPermissions.has(sessionId)) tempPermissions.set(sessionId, new Set());
            tempPermissions.get(sessionId)!.add(msg.targetUserId);
          } else if (msg.type === "revoke-permission" && msg.targetUserId) {
            tempPermissions.get(sessionId)?.delete(msg.targetUserId);
          } else if (msg.type === "toggle-global-control") {
            globalControlSessions.set(sessionId, !!msg.globalControl);
          } else if (msg.type === "revoke-all") {
            tempPermissions.get(sessionId)?.clear();
            globalControlSessions.set(sessionId, false);
            textControllerSessions.delete(sessionId);
          } else if (msg.type === "text-control:set-controller" && msg.targetUserId) {
            setTextControllers(sessionId, [msg.targetUserId]);
          } else if (msg.type === "text-control:clear-controller") {
            textControllerSessions.delete(sessionId);
          } else if (msg.type === "text-control:set-controllers") {
            logger.info("[Text Control] Received set-controllers", { sessionId, targetUserIds: msg.targetUserIds });
            setTextControllers(sessionId, msg.targetUserIds || []);
          } else if (msg.type === "text-control:grant-controller" && msg.targetUserId) {
            const next = new Set(getTextControllers(sessionId));
            next.add(msg.targetUserId);
            setTextControllers(sessionId, next);
          } else if (msg.type === "text-control:revoke-controller" && msg.targetUserId) {
            const next = new Set(getTextControllers(sessionId));
            next.delete(msg.targetUserId);
            setTextControllers(sessionId, next);
          }

          const permissions = Array.from(tempPermissions.get(sessionId) || []);
          const globalControl = globalControlSessions.get(sessionId) || false;
          const controllerUserIds = Array.from(getTextControllers(sessionId));
          logger.info("[Text Control] Broadcasting state", { sessionId, controllerUserIds, roomSize: room.size });
          broadcast(room as any, { type: "permission-sync", permissions, globalControl } satisfies SyncMessage);
          broadcast(room as any, { type: "text-control:state", controllerUserIds } satisfies SyncMessage);
          return;
        }

        if (msg.type === "text-control:update-line") {
          if (!isPrivileged && !isController) return;
          if (typeof msg.lineIndex !== "number") return;
          if (typeof msg.text !== "string") return;
        }

        // ── Controle de playback / loop / preroll: exige canControl ─────────
        if (
          msg.type === "video-play" ||
          msg.type === "video-pause" ||
          msg.type === "video-seek" ||
          msg.type === "sync-loop" ||
          msg.type === "recording:preroll"
        ) {
          // video-seek com lineIndex (saltos guiados de roteiro) também é
          // permitido para controladores de texto autorizados.
          const allowController = msg.type === "video-seek" && typeof msg.lineIndex === "number";
          if (!canControl && !(allowController && isController)) return;
        }

        // ── take:approved / take:rejected DEVEM vir somente do server (REST).
        // Descarta tentativas de spoof vindas de clientes.
        if (msg.type === "take:approved" || msg.type === "take:rejected") return;

        // ── Anti-spoof: voiceActorId só pode ser o próprio ws.userId ────────
        const ANTI_SPOOF_TYPES = new Set<string>([
          "take:pending-approval",
          "recording:start",
          "recording:peak",
          "recording:stop",
        ]);
        const safePayload: Record<string, any> = { ...msg, userId: ws.userId };
        if (ANTI_SPOOF_TYPES.has(msg.type as string)) {
          safePayload.voiceActorId = ws.userId;
        }

        const payload = JSON.stringify(safePayload);
        room.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      } catch (err) {
        // Non-critical: client may have disconnected
      }
    });

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return; // idempotente — close + error podem disparar ambos
      cleanedUp = true;
      const sessionId = String(ws.sessionId || "");
      const room = rooms.get(sessionId);
      if (!room) return;
      room.delete(ws);
      if (room.size === 0) {
        // Sessão vazia: libera todo o estado em memória atrelado a ela
        rooms.delete(sessionId);
        tempPermissions.delete(sessionId);
        globalControlSessions.delete(sessionId);
        textControllerSessions.delete(sessionId);
        return;
      }
      const roster = getRoster(room as any);
      broadcast(room as any, { type: "presence-sync", users: roster } satisfies SyncMessage);
      const controllers = getTextControllers(sessionId);
      if (controllers.size) {
        const next = new Set(Array.from(controllers).filter((id) => roster.some((u) => u.userId === id)));
        if (next.size !== controllers.size) {
          setTextControllers(sessionId, next);
          broadcast(room as any, { type: "text-control:state", controllerUserIds: Array.from(next) } satisfies SyncMessage);
        }
      }
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });
}
