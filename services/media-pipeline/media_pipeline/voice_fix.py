from __future__ import annotations

import os
from pathlib import Path
import shutil
import traceback
from typing import Any

from .errors import PipelineError
from .ffmpeg_utils import ffmpeg_supports_filter, run_cmd
from .fs_store import JobStatus, JobStore
from .settings import Settings


def _safe_relpath(relpath: str) -> str:
  relpath = relpath.replace("\\", "/").lstrip("/")
  relpath = relpath.replace("..", "")
  return relpath


def _env_float(name: str, default: float) -> float:
  raw = os.getenv(name)
  if raw is None or raw == "":
    return default
  try:
    return float(raw)
  except ValueError:
    return default


def _env_int(name: str, default: int) -> int:
  raw = os.getenv(name)
  if raw is None or raw == "":
    return default
  try:
    return int(raw)
  except ValueError:
    return default


def _build_voice_filtergraph(*, ffmpeg_path: str, rnnoise_model_path: str) -> tuple[str, dict[str, Any]]:
  preset = (os.getenv("TAKE_RESTORE_PRESET", "cinema") or "cinema").strip().lower()
  use_ai = bool(_env_int("TAKE_AI_DENOISE", 0)) or preset.endswith("_ai")

  target_i = _env_float("TAKE_TARGET_I", -23.0)
  target_lra = _env_float("TAKE_TARGET_LRA", 7.0)
  target_tp = _env_float("TAKE_TARGET_TP", -2.0)

  parts: list[str] = []

  model_path = Path(rnnoise_model_path) if rnnoise_model_path else None
  if use_ai and model_path and model_path.exists() and ffmpeg_supports_filter(ffmpeg_path, "arnndn"):
    parts.append(f"arnndn=m={model_path.as_posix()}")

  parts.append("highpass=f=70")
  parts.append("lowpass=f=18500")

  if preset in ("transparent", "transparent_ai"):
    parts.append("afftdn=nf=-22")
    parts.append("acompressor=threshold=-20dB:ratio=2:attack=12:release=180:makeup=4")
    parts.append("dynaudnorm=f=220:g=8")
  elif preset in ("aggressive", "aggressive_ai"):
    parts.append("afftdn=nf=-32")
    parts.append("acompressor=threshold=-24dB:ratio=3.5:attack=8:release=160:makeup=7")
    parts.append("dynaudnorm=f=160:g=12")
  else:
    parts.append("afftdn=nf=-25")
    parts.append("acompressor=threshold=-22dB:ratio=3:attack=10:release=170:makeup=6")
    parts.append("dynaudnorm=f=180:g=10")

  parts.append(f"loudnorm=I={target_i}:LRA={target_lra}:TP={target_tp}")
  parts.append("alimiter=limit=0.98")

  used = {
    "preset": preset,
    "ai_denoise": use_ai,
    "rnnoise_model_path": rnnoise_model_path,
    "target_i": target_i,
    "target_lra": target_lra,
    "target_tp": target_tp,
    "filtergraph": ",".join(parts),
  }
  return ",".join(parts), used


def process_voice_job(
  *,
  job_id: str,
  input_public_relpath: str,
  settings: Settings,
  store: JobStore,
) -> dict[str, Any]:
  job_dir = store.ensure_job_dir(job_id)
  work_dir = job_dir / "work"
  outputs_dir = job_dir / "outputs"
  work_dir.mkdir(parents=True, exist_ok=True)
  outputs_dir.mkdir(parents=True, exist_ok=True)

  input_rel = _safe_relpath(input_public_relpath)
  input_path = (settings.public_dir / input_rel).resolve()

  store.write_status(JobStatus(job_id=job_id, status="running", step="validate", progress=0.05))
  if not input_path.exists() or not input_path.is_file():
    raise PipelineError(f"Arquivo de entrada não encontrado: {input_public_relpath}")

  base_wav = work_dir / "take_48k_mono.wav"
  store.write_status(JobStatus(job_id=job_id, status="running", step="decode", progress=0.2))
  run_cmd(
    [
      settings.ffmpeg_path,
      "-y",
      "-i",
      str(input_path),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "48000",
      "-f",
      "wav",
      str(base_wav),
    ]
  )

  restored_wav = work_dir / "take_restored.wav"
  store.write_status(JobStatus(job_id=job_id, status="running", step="restore", progress=0.7))
  filtergraph, used = _build_voice_filtergraph(ffmpeg_path=settings.ffmpeg_path, rnnoise_model_path=settings.rnnoise_model_path)
  run_cmd(
    [
      settings.ffmpeg_path,
      "-y",
      "-i",
      str(base_wav),
      "-af",
      filtergraph,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-f",
      "wav",
      str(restored_wav),
    ]
  )

  out_take = outputs_dir / "take_restored.wav"
  shutil.copyfile(restored_wav, out_take)

  report = {
    "job_id": job_id,
    "input": {"public_relpath": input_rel},
    "pipeline": "voice_take_restore_v1",
    "filters": used,
  }
  report_path = store.write_output_json(job_id, "report.json", report)

  outputs: dict[str, Any] = {}
  if out_take.is_relative_to(settings.public_dir):
    outputs["take_restored_wav"] = f"/{out_take.relative_to(settings.public_dir).as_posix()}"
  else:
    outputs["take_restored_wav"] = str(out_take)

  if report_path.is_relative_to(settings.public_dir):
    outputs["report_json"] = f"/{report_path.relative_to(settings.public_dir).as_posix()}"
  else:
    outputs["report_json"] = str(report_path)

  store.write_status(JobStatus(job_id=job_id, status="completed", step="done", progress=1.0, outputs=outputs))
  return outputs


def run_voice_job_with_status_files(
  *,
  job_id: str,
  input_public_relpath: str,
  settings: Settings,
  store: JobStore,
) -> None:
  try:
    store.write_status(JobStatus(job_id=job_id, status="queued", step="queued", progress=0.0))
    process_voice_job(job_id=job_id, input_public_relpath=input_public_relpath, settings=settings, store=store)
  except PipelineError as e:
    store.write_status(JobStatus(job_id=job_id, status="failed", step="error", progress=1.0, error=str(e)))
  except Exception as e:
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="failed",
        step="error",
        progress=1.0,
        error=f"{e}\n{traceback.format_exc()}",
      )
    )

