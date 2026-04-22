from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
import traceback


def main(argv: list[str]) -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--job-id", required=True)
  parser.add_argument("--input", required=True, help="Public relative path like /uploads/take.wav")
  args = parser.parse_args(argv)

  try:
    from media_pipeline.fs_store import JobStore
    from media_pipeline.settings import get_settings
    from media_pipeline.voice_fix import run_voice_job_with_status_files

    settings = get_settings()
    jobs_dir = Path(os.getenv("VHUB_VOICE_JOBS_DIR", (settings.public_dir / "voice-jobs").as_posix())).resolve()
    store = JobStore(jobs_dir)
    run_voice_job_with_status_files(
      job_id=args.job_id,
      input_public_relpath=args.input,
      settings=settings,
      store=store,
    )
    return 0
  except Exception as e:
    try:
      from media_pipeline.fs_store import JobStatus, JobStore
      from media_pipeline.settings import get_settings

      settings = get_settings()
      jobs_dir = Path(os.getenv("VHUB_VOICE_JOBS_DIR", (settings.public_dir / "voice-jobs").as_posix())).resolve()
      store = JobStore(jobs_dir)
      store.write_status(
        JobStatus(
          job_id=args.job_id,
          status="failed",
          step="error",
          progress=1.0,
          error=f"{e}\n{traceback.format_exc()}",
        )
      )
    except Exception:
      pass
    return 1


if __name__ == "__main__":
  raise SystemExit(main(sys.argv[1:]))

