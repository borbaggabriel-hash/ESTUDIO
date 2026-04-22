import type { Express } from "express";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

function safeJobId(jobId: string): string | null {
  const cleaned = jobId.replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!cleaned || cleaned.length < 8) return null;
  return cleaned;
}

function safePublicPath(publicUrl: string): string | null {
  const normalized = publicUrl.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", normalized);
  const base = path.resolve(process.cwd(), "public");
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

export function registerMeRestore(app: Express) {
  const mediaJobsDir = path.join(process.cwd(), "public", "media-jobs");
  fs.mkdirSync(mediaJobsDir, { recursive: true });

  app.post("/api/media-jobs/:jobId/restore-me", async (req, res) => {
    try {
      const jobId = safeJobId(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Job inválido" });

      const mainStatusPath = path.join(mediaJobsDir, jobId, "status.json");
      if (!fs.existsSync(mainStatusPath)) return res.status(404).json({ message: "Job não encontrado" });

      const mainStatusRaw = JSON.parse(fs.readFileSync(mainStatusPath, "utf-8")) as any;
      const meCleanUrl = String(mainStatusRaw?.outputs?.me_clean_wav || "");
      const vocalsUrl = String(mainStatusRaw?.outputs?.vocals_wav || "");

      if (!meCleanUrl) return res.status(400).json({ message: "M&E ainda não foi gerada para este job" });

      const existingRestored = path.join(mediaJobsDir, jobId, "outputs", "me_restored.wav");
      if (fs.existsSync(existingRestored)) {
        return res.status(200).json({
          already: true,
          outputs: { me_restored_wav: `/media-jobs/${jobId}/outputs/me_restored.wav` },
        });
      }

      const meCleanPath = safePublicPath(meCleanUrl);
      if (!meCleanPath || !fs.existsSync(meCleanPath)) {
        return res.status(400).json({ message: "Arquivo M&E não encontrado no servidor" });
      }

      const vocalsPath = vocalsUrl ? safePublicPath(vocalsUrl) : null;
      const vocalsExists = !!vocalsPath && fs.existsSync(vocalsPath);

      const restoreId = randomUUID();
      const restoresDir = path.join(mediaJobsDir, jobId, "restores");
      fs.mkdirSync(restoresDir, { recursive: true });

      const restoreDir = path.join(restoresDir, restoreId);
      fs.mkdirSync(restoreDir, { recursive: true });

      const initialStatus = {
        job_id: restoreId,
        status: "queued",
        step: "queued",
        progress: 0,
        message: null,
        error: null,
        outputs: null,
      };
      fs.writeFileSync(path.join(restoreDir, "status.json"), JSON.stringify(initialStatus, null, 2));

      const workerScript = path.join(process.cwd(), "services", "media-pipeline", "me_restore_worker.py");
      const venvPython = path.join(process.cwd(), "services", "media-pipeline", ".venv", "bin", "python");
      const python = process.env.PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : "python3");
      const bundledFfmpeg = path.join(process.cwd(), "services", "media-pipeline", "bin", "ffmpeg");
      const ffmpegPath = process.env.FFMPEG_PATH || (fs.existsSync(bundledFfmpeg) ? bundledFfmpeg : "ffmpeg");

      const outFd = fs.openSync(path.join(restoreDir, "worker.log"), "a");
      const errFd = fs.openSync(path.join(restoreDir, "worker.err.log"), "a");

      const args = [
        workerScript,
        "--job-id",
        restoreId,
        "--parent-job-id",
        jobId,
        "--input",
        meCleanUrl,
      ];
      if (vocalsExists) {
        args.push("--vocals", vocalsUrl);
      }

      const child = spawn(python, args, {
        detached: true,
        stdio: ["ignore", outFd, errFd],
        env: {
          ...process.env,
          VHUB_REPO_ROOT: process.cwd(),
          VHUB_PUBLIC_DIR: path.join(process.cwd(), "public"),
          VHUB_MEDIA_JOBS_DIR: path.join(process.cwd(), "public", "media-jobs"),
          VHUB_ME_RESTORE_JOBS_DIR: restoresDir,
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
          fs.writeFileSync(path.join(restoreDir, "status.json"), JSON.stringify(failed, null, 2));
        } catch {}
      });

      child.unref();

      return res.status(201).json({
        restoreJobId: restoreId,
        statusUrl: `/api/media-jobs/${jobId}/restore-me/${restoreId}`,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Erro ao iniciar restauração" });
    }
  });

  app.get("/api/media-jobs/:jobId/restore-me/:restoreId", async (req, res) => {
    try {
      const jobId = safeJobId(req.params.jobId);
      const restoreId = safeJobId(req.params.restoreId);
      if (!jobId || !restoreId) return res.status(400).json({ message: "Parâmetros inválidos" });

      const p = path.join(mediaJobsDir, jobId, "restores", restoreId, "status.json");
      if (!fs.existsSync(p)) return res.status(404).json({ message: "Restore job não encontrado" });

      const raw = fs.readFileSync(p, "utf-8");
      return res.status(200).json(JSON.parse(raw));
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Erro ao consultar restore job" });
    }
  });
}

