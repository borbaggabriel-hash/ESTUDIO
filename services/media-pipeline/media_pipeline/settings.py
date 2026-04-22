from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
  public_dir: Path
  jobs_dir: Path
  uploads_dir: Path
  celery_broker_url: str
  celery_result_backend: str
  ffmpeg_path: str
  rnnoise_model_path: str
  me_restore_preset: str
  me_ai_denoise: int
  me_center_cancel_strength: float
  demucs_model: str
  whisper_model: str
  max_speakers: int
  vad_aggressiveness: int
  pipeline_strict: int


def _env_int(name: str, default: int) -> int:
  raw = os.getenv(name)
  if raw is None or raw == "":
    return default
  try:
    return int(raw)
  except ValueError:
    return default


def _env_float(name: str, default: float) -> float:
  raw = os.getenv(name)
  if raw is None or raw == "":
    return default
  try:
    return float(raw)
  except ValueError:
    return default


def get_settings() -> Settings:
  repo_root = Path(os.getenv("VHUB_REPO_ROOT", Path.cwd())).resolve()
  public_dir = Path(os.getenv("VHUB_PUBLIC_DIR", repo_root / "public")).resolve()
  jobs_dir = Path(os.getenv("VHUB_MEDIA_JOBS_DIR", public_dir / "media-jobs")).resolve()
  uploads_dir = Path(os.getenv("VHUB_UPLOADS_DIR", public_dir / "uploads")).resolve()

  redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
  ffmpeg_path = os.getenv("FFMPEG_PATH", "ffmpeg")
  rnnoise_default = (repo_root / "services" / "media-pipeline" / "models" / "rnnoise" / "sh.rnnn").as_posix()

  return Settings(
    public_dir=public_dir,
    jobs_dir=jobs_dir,
    uploads_dir=uploads_dir,
    celery_broker_url=os.getenv("CELERY_BROKER_URL", redis_url),
    celery_result_backend=os.getenv("CELERY_RESULT_BACKEND", redis_url),
    ffmpeg_path=ffmpeg_path,
    rnnoise_model_path=os.getenv("RNNOISE_MODEL_PATH", rnnoise_default),
    me_restore_preset=os.getenv("ME_RESTORE_PRESET", "cinema"),
    me_ai_denoise=_env_int("ME_AI_DENOISE", 0),
    me_center_cancel_strength=_env_float("ME_CENTER_CANCEL_STRENGTH", 0.85),
    demucs_model=os.getenv("DEMUCS_MODEL", "htdemucs"),
    whisper_model=os.getenv("WHISPER_MODEL", "small"),
    max_speakers=_env_int("MAX_SPEAKERS", 6),
    vad_aggressiveness=_env_int("VAD_AGGRESSIVENESS", 2),
    pipeline_strict=_env_int("VHUB_PIPELINE_STRICT", 0),
  )
