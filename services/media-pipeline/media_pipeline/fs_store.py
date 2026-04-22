from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class JobStatus:
  job_id: str
  status: str
  step: str | None = None
  progress: float | None = None
  message: str | None = None
  error: str | None = None
  outputs: dict[str, Any] | None = None


class JobStore:
  def __init__(self, jobs_dir: Path):
    self.jobs_dir = jobs_dir
    self.jobs_dir.mkdir(parents=True, exist_ok=True)

  def job_dir(self, job_id: str) -> Path:
    return self.jobs_dir / job_id

  def ensure_job_dir(self, job_id: str) -> Path:
    d = self.job_dir(job_id)
    d.mkdir(parents=True, exist_ok=True)
    return d

  def status_path(self, job_id: str) -> Path:
    return self.job_dir(job_id) / "status.json"

  def write_status(self, status: JobStatus) -> None:
    d = self.ensure_job_dir(status.job_id)
    tmp = d / "status.json.tmp"
    tmp.write_text(json.dumps(asdict(status), ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(self.status_path(status.job_id))

  def read_status(self, job_id: str) -> JobStatus | None:
    p = self.status_path(job_id)
    if not p.exists():
      return None
    raw = json.loads(p.read_text(encoding="utf-8"))
    return JobStatus(**raw)

  def write_output_json(self, job_id: str, name: str, payload: Any) -> Path:
    d = self.ensure_job_dir(job_id)
    out_dir = d / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    p = out_dir / name
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return p

