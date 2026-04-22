from __future__ import annotations

from pathlib import Path
import shutil
from typing import Any

from .errors import PipelineError
from .ffmpeg_utils import restore_me, run_cmd
from .fs_store import JobStatus, JobStore
from .settings import Settings


def _safe_relpath(relpath: str) -> str:
  relpath = relpath.replace("\\", "/").lstrip("/")
  relpath = relpath.replace("..", "")
  return relpath


def process_me_only_job(
  *,
  job_id: str,
  input_public_relpath: str,
  settings: Settings,
  store: JobStore,
  warning_message: str | None = None,
) -> dict[str, Any]:
  job_dir = store.ensure_job_dir(job_id)
  work_dir = job_dir / "work"
  work_dir.mkdir(parents=True, exist_ok=True)

  input_rel = _safe_relpath(input_public_relpath)
  input_path = (settings.public_dir / input_rel).resolve()

  store.write_status(
    JobStatus(
      job_id=job_id,
      status="running",
      step="validate",
      progress=0.05,
      message=warning_message,
    )
  )
  if not input_path.exists() or not input_path.is_file():
    raise PipelineError(f"Arquivo de entrada não encontrado: {input_public_relpath}")

  stereo_wav = work_dir / "source_stereo.wav"
  store.write_status(
    JobStatus(
      job_id=job_id,
      status="running",
      step="extract_audio",
      progress=0.25,
      message=warning_message,
    )
  )
  run_cmd(
    [
      settings.ffmpeg_path,
      "-y",
      "-i",
      str(input_path),
      "-vn",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-f",
      "wav",
      str(stereo_wav),
    ]
  )

  me_raw = work_dir / "me_raw.wav"
  me_clean = work_dir / "me_clean.wav"
  store.write_status(
    JobStatus(
      job_id=job_id,
      status="running",
      step="build_me",
      progress=0.7,
      message=warning_message,
    )
  )
  strength = settings.me_center_cancel_strength
  if strength < 0:
    strength = 0.0
  if strength > 1:
    strength = 1.0
  run_cmd(
    [
      settings.ffmpeg_path,
      "-y",
      "-i",
      str(stereo_wav),
      "-af",
      f"pan=stereo|c0=c0-{strength}*c1|c1=c1-{strength}*c0,volume=1.6",
      str(me_raw),
    ]
  )
  restore_me(
    settings.ffmpeg_path,
    me_raw,
    me_clean,
    preset=settings.me_restore_preset,
    ai_denoise=bool(settings.me_ai_denoise),
    rnnoise_model_path=settings.rnnoise_model_path,
  )

  outputs_dir = job_dir / "outputs"
  outputs_dir.mkdir(parents=True, exist_ok=True)
  out_me = outputs_dir / "me_clean.wav"
  shutil.copyfile(me_clean, out_me)

  outputs = {"me_clean_wav": f"/media-jobs/{job_id}/outputs/me_clean.wav"}

  store.write_status(
    JobStatus(
      job_id=job_id,
      status="completed",
      step="done",
      progress=1.0,
      message=warning_message,
      outputs=outputs,
    )
  )
  return outputs
