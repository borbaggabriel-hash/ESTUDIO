from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Sequence

from .errors import ExternalToolError

_FILTER_SUPPORT_CACHE: dict[tuple[str, str], bool] = {}


def run_cmd(args: Sequence[str], cwd: Path | None = None) -> None:
  try:
    proc = subprocess.run(
      list(args),
      cwd=str(cwd) if cwd else None,
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True,
      check=True,
    )
  except FileNotFoundError as e:
    raise ExternalToolError(
      tool=args[0] if args else "command",
      message=f"Tool not found: {args[0] if args else 'command'}. Configure FFMPEG_PATH or install ffmpeg.",
    ) from e
  except subprocess.CalledProcessError as e:
    raise ExternalToolError(
      tool=args[0] if args else "command",
      message=f"Command failed: {' '.join(args)} (exit {e.returncode})",
      stdout=e.stdout,
      stderr=e.stderr,
    ) from e


def ffmpeg_supports_filter(ffmpeg_path: str, name: str) -> bool:
  key = (ffmpeg_path, name)
  cached = _FILTER_SUPPORT_CACHE.get(key)
  if cached is not None:
    return cached
  try:
    proc = subprocess.run(
      [ffmpeg_path, "-hide_banner", "-filters"],
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True,
      check=False,
    )
    ok = proc.returncode == 0 and name in proc.stdout
  except Exception:
    ok = False
  _FILTER_SUPPORT_CACHE[key] = ok
  return ok


def extract_mono_wav(ffmpeg_path: str, input_path: Path, output_wav: Path, sample_rate: int = 16000) -> None:
  output_wav.parent.mkdir(parents=True, exist_ok=True)
  run_cmd(
    [
      ffmpeg_path,
      "-y",
      "-i",
      str(input_path),
      "-vn",
      "-ac",
      "1",
      "-ar",
      str(sample_rate),
      "-f",
      "wav",
      str(output_wav),
    ]
  )


def mix_to_me(ffmpeg_path: str, stems_dir: Path, output_wav: Path) -> None:
  output_wav.parent.mkdir(parents=True, exist_ok=True)
  drums = stems_dir / "drums.wav"
  bass = stems_dir / "bass.wav"
  other = stems_dir / "other.wav"
  if not (drums.exists() and bass.exists() and other.exists()):
    raise ExternalToolError("ffmpeg", f"Missing stems for M&E in {stems_dir}")
  run_cmd(
    [
      ffmpeg_path,
      "-y",
      "-i",
      str(drums),
      "-i",
      str(bass),
      "-i",
      str(other),
      "-filter_complex",
      "amix=inputs=3:normalize=1",
      str(output_wav),
    ]
  )


def extract_stereo_wav(ffmpeg_path: str, input_path: Path, output_wav: Path, sample_rate: int = 44100) -> None:
  output_wav.parent.mkdir(parents=True, exist_ok=True)
  run_cmd(
    [
      ffmpeg_path,
      "-y",
      "-i",
      str(input_path),
      "-vn",
      "-ac",
      "2",
      "-ar",
      str(sample_rate),
      "-f",
      "wav",
      str(output_wav),
    ]
  )


def center_cancel_me(ffmpeg_path: str, input_stereo_wav: Path, output_wav: Path, *, strength: float = 0.85, volume: float = 1.6) -> None:
  output_wav.parent.mkdir(parents=True, exist_ok=True)
  if strength < 0:
    strength = 0.0
  if strength > 1:
    strength = 1.0
  run_cmd(
    [
      ffmpeg_path,
      "-y",
      "-i",
      str(input_stereo_wav),
      "-af",
      f"pan=stereo|c0=c0-{strength}*c1|c1=c1-{strength}*c0,volume={volume}",
      str(output_wav),
    ]
  )


def me_restore_filtergraph(*, ffmpeg_path: str, preset: str, ai_denoise: bool, rnnoise_model_path: str) -> str:
  preset = (preset or "cinema").strip().lower()
  use_ai = ai_denoise or preset.endswith("_ai")
  parts: list[str] = []

  model_path = Path(rnnoise_model_path) if rnnoise_model_path else None
  if use_ai and model_path and model_path.exists() and ffmpeg_supports_filter(ffmpeg_path, "arnndn"):
    parts.append(f"arnndn=m={model_path.as_posix()}")

  if preset in ("transparent", "transparent_ai"):
    parts.extend(
      [
        "highpass=f=25",
        "lowpass=f=19000",
        "afftdn=nf=-22",
        "dynaudnorm=f=200:g=10",
        "alimiter=limit=0.98",
      ]
    )
  elif preset in ("aggressive", "aggressive_ai"):
    parts.extend(
      [
        "highpass=f=30",
        "lowpass=f=18500",
        "afftdn=nf=-35",
        "dynaudnorm=f=150:g=14",
        "alimiter=limit=0.98",
      ]
    )
  elif preset in ("cinema_plus", "cinema_plus_ai"):
    parts.extend(
      [
        "highpass=f=30",
        "lowpass=f=18500",
        "afftdn=nf=-25",
        "equalizer=f=3500:t=q:w=1.0:g=1.2",
        "equalizer=f=10000:t=q:w=1.3:g=2.0",
        "dynaudnorm=f=150:g=12",
        "alimiter=limit=0.98",
      ]
    )
  else:
    parts.extend(
      [
        "highpass=f=30",
        "lowpass=f=18500",
        "afftdn=nf=-25",
        "dynaudnorm=f=150:g=12",
        "alimiter=limit=0.98",
      ]
    )
  return ",".join(parts)


def restore_me(
  ffmpeg_path: str,
  input_wav: Path,
  output_wav: Path,
  *,
  preset: str = "cinema",
  ai_denoise: bool = False,
  rnnoise_model_path: str = "",
) -> None:
  output_wav.parent.mkdir(parents=True, exist_ok=True)
  filtergraph = me_restore_filtergraph(
    ffmpeg_path=ffmpeg_path,
    preset=preset,
    ai_denoise=ai_denoise,
    rnnoise_model_path=rnnoise_model_path,
  )
  run_cmd(
    [
      ffmpeg_path,
      "-y",
      "-i",
      str(input_wav),
      "-af",
      filtergraph,
      str(output_wav),
    ]
  )


def denoise_me(ffmpeg_path: str, input_wav: Path, output_wav: Path) -> None:
  restore_me(ffmpeg_path, input_wav, output_wav, preset="cinema", ai_denoise=False, rnnoise_model_path="")
