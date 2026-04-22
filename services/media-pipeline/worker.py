from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import traceback

def _jobs_dir_from_env() -> Path:
  raw = os.getenv("VHUB_MEDIA_JOBS_DIR")
  if raw:
    return Path(raw).resolve()
  public_dir = os.getenv("VHUB_PUBLIC_DIR")
  if public_dir:
    return (Path(public_dir) / "media-jobs").resolve()
  return (Path.cwd() / "public" / "media-jobs").resolve()


def _write_status(job_id: str, payload: dict) -> None:
  jobs_dir = _jobs_dir_from_env()
  job_dir = jobs_dir / job_id
  job_dir.mkdir(parents=True, exist_ok=True)
  (job_dir / "status.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: list[str]) -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--job-id", required=True)
  parser.add_argument("--input", required=True, help="Public relative path like /uploads/file.mp4")
  args = parser.parse_args(argv)

  try:
    from media_pipeline.fs_store import JobStore
    from media_pipeline.pipeline import run_job_with_status_files
    from media_pipeline.settings import get_settings

    settings = get_settings()
    store = JobStore(settings.jobs_dir)
    run_job_with_status_files(job_id=args.job_id, input_public_relpath=args.input, settings=settings, store=store)
    return 0
  except ModuleNotFoundError as e:
    try:
      from media_pipeline.errors import PipelineError
      from media_pipeline.fs_store import JobStatus, JobStore
      from media_pipeline.fallback_me import process_me_only_job
      from media_pipeline.settings import get_settings

      settings = get_settings()
      store = JobStore(settings.jobs_dir)
      warning = f"Modo ME-only: dependência ausente {e.name}."
      try:
        process_me_only_job(
          job_id=args.job_id,
          input_public_relpath=args.input,
          settings=settings,
          store=store,
          warning_message=warning,
        )
        return 0
      except PipelineError as pe:
        store.write_status(
          JobStatus(
            job_id=args.job_id,
            status="failed",
            step="error",
            progress=1.0,
            message=warning,
            error=str(pe),
          )
        )
        return 1
    except Exception as inner:
      _write_status(
        args.job_id,
        {
          "job_id": args.job_id,
          "status": "failed",
          "step": "error",
          "progress": 1,
          "message": None,
          "error": (
            f"Dependência Python ausente: {e.name}.\n"
            "Instale o pipeline em services/media-pipeline (venv + pip install -r requirements.txt)\n"
            "e reinicie o backend com PYTHON_BIN apontando para a venv.\n"
            f"Fallback falhou: {inner}\n{traceback.format_exc()}"
          ),
          "outputs": None,
        },
      )
      return 1
  except Exception as e:
    _write_status(
      args.job_id,
      {
        "job_id": args.job_id,
        "status": "failed",
        "step": "error",
        "progress": 1,
        "message": None,
        "error": f"Worker crash: {e}\n{traceback.format_exc()}",
        "outputs": None,
      },
    )
    return 1


if __name__ == "__main__":
  raise SystemExit(main(sys.argv[1:]))
