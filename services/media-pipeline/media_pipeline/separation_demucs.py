from __future__ import annotations

import subprocess
from pathlib import Path
import sys

from .errors import ExternalToolError


def separate_with_demucs(model: str, input_wav: Path, out_dir: Path) -> Path:
  out_dir.mkdir(parents=True, exist_ok=True)
  try:
    proc = subprocess.run(
      [
        sys.executable,
        "-m",
        "demucs",
        "-n",
        model,
        "--out",
        str(out_dir),
        str(input_wav),
      ],
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True,
      check=True,
    )
  except subprocess.CalledProcessError as e:
    raise ExternalToolError(
      tool="demucs",
      message=f"Demucs separation failed (exit {e.returncode})",
      stdout=e.stdout,
      stderr=e.stderr,
    ) from e

  stems_dir = out_dir / model / input_wav.stem
  if not stems_dir.exists():
    stems_dir = out_dir / input_wav.stem
  return stems_dir
