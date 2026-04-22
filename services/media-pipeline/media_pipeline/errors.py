from __future__ import annotations


class PipelineError(Exception):
  pass


class UnsupportedMediaError(PipelineError):
  pass


class ExternalToolError(PipelineError):
  def __init__(self, tool: str, message: str, stdout: str | None = None, stderr: str | None = None):
    super().__init__(message)
    self.tool = tool
    self.stdout = stdout
    self.stderr = stderr

  def __str__(self) -> str:
    base = super().__str__()
    stderr = (self.stderr or "").strip()
    if not stderr:
      return base
    if len(stderr) > 2000:
      stderr = stderr[:2000] + "\n(truncated)"
    return base + "\n" + stderr
