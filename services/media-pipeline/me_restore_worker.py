from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import sys
import traceback

from media_pipeline.errors import PipelineError
from media_pipeline.ffmpeg_utils import restore_me, run_cmd
from media_pipeline.fs_store import JobStatus, JobStore
from media_pipeline.settings import get_settings


def _safe_relpath(relpath: str) -> str:
  relpath = relpath.replace("\\", "/").lstrip("/")
  relpath = relpath.replace("..", "")
  return relpath


def _public_abs(settings, public_url: str) -> Path:
  rel = _safe_relpath(public_url)
  return (settings.public_dir / rel).resolve()


def _patch_main_job_outputs(settings, parent_job_id: str, outputs: dict) -> None:
  status_path = (settings.public_dir / "media-jobs" / parent_job_id / "status.json").resolve()
  if not status_path.exists():
    return
  raw = json.loads(status_path.read_text(encoding="utf-8"))
  cur = raw.get("outputs") or {}
  cur.update(outputs)
  raw["outputs"] = cur
  status_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")


def _maybe_external_ai_restore(input_wav: Path, output_wav: Path) -> bool:
  provider = (os.getenv("ME_RESTORE_PROVIDER", "") or "").strip().lower()
  api_url = (os.getenv("ME_RESTORE_API_URL", "") or "").strip()
  api_key = (os.getenv("ME_RESTORE_API_KEY", "") or "").strip()

  if provider != "external_http" or not api_url:
    return False

  try:
    import requests  # type: ignore
  except Exception:
    return False

  headers = {}
  if api_key:
    headers["Authorization"] = f"Bearer {api_key}"

  with input_wav.open("rb") as f:
    files = {"audio": ("me.wav", f, "audio/wav")}
    r = requests.post(api_url, headers=headers, files=files, timeout=900)
  if r.status_code != 200:
    return False

  ctype = (r.headers.get("content-type") or "").lower()
  if "application/json" in ctype:
    try:
      data = r.json()
      url = data.get("url")
      if not url:
        return False
      rr = requests.get(url, timeout=900)
      if rr.status_code != 200:
        return False
      output_wav.write_bytes(rr.content)
      return True
    except Exception:
      return False

  output_wav.write_bytes(r.content)
  return True


def main(argv: list[str]) -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--job-id", required=True)
  parser.add_argument("--parent-job-id", required=True)
  parser.add_argument("--input", required=True)
  parser.add_argument("--vocals", default="")
  args = parser.parse_args(argv)

  settings = get_settings()

  restore_jobs_dir = Path(
    os.getenv(
      "VHUB_ME_RESTORE_JOBS_DIR",
      (settings.public_dir / "media-jobs" / args.parent_job_id / "restores").as_posix(),
    )
  ).resolve()

  store = JobStore(restore_jobs_dir)
  job_dir = store.ensure_job_dir(args.job_id)
  work_dir = job_dir / "work"
  outputs_dir = job_dir / "outputs"
  work_dir.mkdir(parents=True, exist_ok=True)
  outputs_dir.mkdir(parents=True, exist_ok=True)

  try:
    store.write_status(JobStatus(job_id=args.job_id, status="running", step="validate", progress=0.05))

    me_in = _public_abs(settings, args.input)
    if not me_in.exists():
      raise PipelineError("Arquivo M&E não encontrado para restauração.")

    vocals_in = _public_abs(settings, args.vocals) if args.vocals else None
    if vocals_in is not None and not vocals_in.exists():
      vocals_in = None

    me_48k = work_dir / "me_48k.wav"
    run_cmd([settings.ffmpeg_path, "-y", "-i", str(me_in), "-ac", "2", "-ar", "48000", "-f", "wav", str(me_48k)])

    store.write_status(JobStatus(job_id=args.job_id, status="running", step="de_vocal", progress=0.35))

    src_for_restore = me_48k
    alpha = float(os.getenv("ME_RESTORE_VOCAL_SUB", "0.55") or "0.55")
    if alpha < 0:
      alpha = 0.0
    if alpha > 1:
      alpha = 1.0

    if vocals_in is not None:
      vocals_48k = work_dir / "vocals_48k.wav"
      run_cmd([settings.ffmpeg_path, "-y", "-i", str(vocals_in), "-ac", "2", "-ar", "48000", "-f", "wav", str(vocals_48k)])
      me_minus = work_dir / "me_minus_vocals.wav"
      run_cmd(
        [
          settings.ffmpeg_path,
          "-y",
          "-i",
          str(me_48k),
          "-i",
          str(vocals_48k),
          "-filter_complex",
          f"[0:a][1:a]amix=inputs=2:weights='1 -{alpha}':normalize=0",
          str(me_minus),
        ]
      )
      src_for_restore = me_minus

    store.write_status(JobStatus(job_id=args.job_id, status="running", step="ai_restore", progress=0.65))

    external_out = work_dir / "me_external.wav"
    used_external = _maybe_external_ai_restore(src_for_restore, external_out)
    to_polish = external_out if used_external and external_out.exists() else src_for_restore

    preset = (os.getenv("ME_RESTORE2_PRESET", "cinema_plus_ai") or "cinema_plus_ai").strip()
    out_wav = work_dir / "me_restored.wav"
    restore_me(
      settings.ffmpeg_path,
      to_polish,
      out_wav,
      preset=preset,
      ai_denoise=True,
      rnnoise_model_path=settings.rnnoise_model_path,
    )

    out_job_wav = outputs_dir / "me_restored.wav"
    shutil.copyfile(out_wav, out_job_wav)

    main_out_dir = (settings.public_dir / "media-jobs" / args.parent_job_id / "outputs").resolve()
    main_out_dir.mkdir(parents=True, exist_ok=True)
    main_out_wav = main_out_dir / "me_restored.wav"
    shutil.copyfile(out_wav, main_out_wav)

    report = {
      "parent_job_id": args.parent_job_id,
      "job_id": args.job_id,
      "input": args.input,
      "vocals": args.vocals or None,
      "provider": os.getenv("ME_RESTORE_PROVIDER", "local"),
      "preset": preset,
      "vocal_sub_alpha": alpha if vocals_in is not None else None,
      "used_external": used_external,
    }
    report_path = store.write_output_json(args.job_id, "report.json", report)

    outputs = {
      "me_restored_wav": f"/{out_job_wav.relative_to(settings.public_dir).as_posix()}",
      "report_json": f"/{report_path.relative_to(settings.public_dir).as_posix()}",
    }

    _patch_main_job_outputs(settings, args.parent_job_id, {"me_restored_wav": f"/{main_out_wav.relative_to(settings.public_dir).as_posix()}"})

    store.write_status(JobStatus(job_id=args.job_id, status="completed", step="done", progress=1.0, outputs=outputs))
    return 0

  except Exception as e:
    store.write_status(
      JobStatus(
        job_id=args.job_id,
        status="failed",
        step="error",
        progress=1.0,
        error=f"{e}\n{traceback.format_exc()}",
      )
    )
    return 1


if __name__ == "__main__":
  raise SystemExit(main(sys.argv[1:]))

