from __future__ import annotations

from pathlib import Path
import shutil
import traceback
from typing import Any

from .errors import PipelineError
from .ffmpeg_utils import center_cancel_me, extract_mono_wav, extract_stereo_wav, mix_to_me, restore_me
from .fs_store import JobStatus, JobStore
from .separation_demucs import separate_with_demucs
from .settings import Settings


def _safe_relpath(relpath: str) -> str:
  relpath = relpath.replace("\\", "/").lstrip("/")
  relpath = relpath.replace("..", "")
  return relpath


def process_media_job(
  *,
  job_id: str,
  input_public_relpath: str,
  settings: Settings,
  store: JobStore,
) -> dict[str, Any]:
  """
  Pipeline:
  1) Extrai áudio do arquivo (vídeo/áudio) para WAV mono 16kHz (FFmpeg).
  2) Separa stems com Demucs: vocals / drums / bass / other.
  3) Reconstrói M&E somando drums+bass+other e aplica limpeza/normalização (FFmpeg filters).
  4) Diariza speakers na trilha de voz (VAD + embeddings + clustering).
  5) Transcreve cada segmento diarizado com Whisper (faster-whisper).
  6) Gera JSON para dublagem com id_personagem/texto/start_time/end_time.
  """
  job_dir = store.ensure_job_dir(job_id)
  work_dir = job_dir / "work"
  work_dir.mkdir(parents=True, exist_ok=True)

  input_rel = _safe_relpath(input_public_relpath)
  input_path = (settings.public_dir / input_rel).resolve()

  store.write_status(JobStatus(job_id=job_id, status="running", step="validate", progress=0.02))
  if not input_path.exists() or not input_path.is_file():
    raise PipelineError(f"Arquivo de entrada não encontrado: {input_public_relpath}")

  extracted_wav = work_dir / "source_16k_mono.wav"
  store.write_status(JobStatus(job_id=job_id, status="running", step="extract_audio", progress=0.10))
  extract_mono_wav(settings.ffmpeg_path, input_path, extracted_wav, sample_rate=16000)

  store.write_status(JobStatus(job_id=job_id, status="running", step="separate_demucs", progress=0.25))
  stems_dir: Path | None = None
  vocals_wav: Path | None = None
  try:
    stems_root = work_dir / "demucs"
    stems_dir = separate_with_demucs(settings.demucs_model, extracted_wav, stems_root)
    maybe_vocals = stems_dir / "vocals.wav"
    if maybe_vocals.exists():
      vocals_wav = maybe_vocals
  except Exception as e:
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="running",
        step="separate_demucs",
        progress=0.28,
        message=f"Demucs indisponível, usando fallback (center-cancel). Detalhes: {e}",
      )
    )

  store.write_status(JobStatus(job_id=job_id, status="running", step="build_me", progress=0.40))
  me_raw = work_dir / "me_raw.wav"
  me_clean = work_dir / "me_clean.wav"
  if stems_dir is not None:
    mix_to_me(settings.ffmpeg_path, stems_dir, me_raw)
  else:
    stereo_wav = work_dir / "source_stereo.wav"
    extract_stereo_wav(settings.ffmpeg_path, input_path, stereo_wav, sample_rate=44100)
    center_cancel_me(
      settings.ffmpeg_path,
      stereo_wav,
      me_raw,
      strength=settings.me_center_cancel_strength,
      volume=1.6,
    )
  restore_me(
    settings.ffmpeg_path,
    me_raw,
    me_clean,
    preset=settings.me_restore_preset,
    ai_denoise=bool(settings.me_ai_denoise),
    rnnoise_model_path=settings.rnnoise_model_path,
  )

  outputs: dict[str, Any] = {}
  outputs_dir = job_dir / "outputs"
  outputs_dir.mkdir(parents=True, exist_ok=True)

  out_me = outputs_dir / "me_clean.wav"
  out_vocals = outputs_dir / "vocals.wav"
  shutil.copyfile(me_clean, out_me)
  if vocals_wav and vocals_wav.exists():
    shutil.copyfile(vocals_wav, out_vocals)

  if out_me.is_relative_to(settings.public_dir):
    outputs["me_clean_wav"] = f"/{out_me.relative_to(settings.public_dir).as_posix()}"
  else:
    outputs["me_clean_wav"] = str(out_me)

  if out_vocals.exists():
    if out_vocals.is_relative_to(settings.public_dir):
      outputs["vocals_wav"] = f"/{out_vocals.relative_to(settings.public_dir).as_posix()}"
    else:
      outputs["vocals_wav"] = str(out_vocals)

  store.write_status(JobStatus(job_id=job_id, status="running", step="build_me", progress=0.55, outputs=outputs))

  try:
    from .diarize_speechbrain import diarize_speakers
  except ModuleNotFoundError as e:
    if getattr(settings, "pipeline_strict", 0):
      raise PipelineError(
        "Dependências ausentes para diarização (speechbrain/torch/etc). "
        f"Módulo: {e.name}. Configure PYTHON_BIN para uma venv Python 3.11/3.12 com requirements instalados."
      )
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="completed",
        step="done",
        progress=1.0,
        message=f"Job concluído sem diarização/transcrição (dependência ausente: {e.name}).",
        outputs=outputs,
      )
    )
    return outputs

  store.write_status(JobStatus(job_id=job_id, status="running", step="diarization", progress=0.60, outputs=outputs))
  segments = diarize_speakers(out_vocals if out_vocals.exists() else extracted_wav, vad_aggressiveness=settings.vad_aggressiveness, max_speakers=settings.max_speakers)
  diarized = [(s.start_time, s.end_time, s.speaker_label) for s in segments]

  try:
    from .asr_faster_whisper import transcribe_segmented_audio
  except ModuleNotFoundError as e:
    if getattr(settings, "pipeline_strict", 0):
      raise PipelineError(
        "Dependências ausentes para transcrição (faster-whisper/librosa/etc). "
        f"Módulo: {e.name}. Configure PYTHON_BIN para uma venv Python 3.11/3.12 com requirements instalados."
      )
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="completed",
        step="done",
        progress=1.0,
        message=f"Job concluído sem transcrição (dependência ausente: {e.name}).",
        outputs=outputs,
      )
    )
    return outputs

  store.write_status(JobStatus(job_id=job_id, status="running", step="transcription", progress=0.78, outputs=outputs))
  transcript_dir = work_dir / "transcripts"
  transcripts = transcribe_segmented_audio(
    out_vocals if out_vocals.exists() else extracted_wav,
    diarized,
    transcript_dir,
    whisper_model=settings.whisper_model,
  )

  store.write_status(JobStatus(job_id=job_id, status="running", step="generate_json", progress=0.92, outputs=outputs))
  dub_segments = []
  for t in transcripts:
    dub_segments.append(
      {
        "id_personagem": f"Personagem {t.speaker_label + 1}",
        "texto": t.text,
        "start_time": t.start_time,
        "end_time": t.end_time,
      }
    )

  dub_json = {
    "job_id": job_id,
    "input": {"public_relpath": input_rel},
    "segments": dub_segments,
  }

  dub_json_path = store.write_output_json(job_id, "dub_script.json", dub_json)
  if dub_json_path.is_relative_to(settings.public_dir):
    outputs["dub_script_json"] = f"/{dub_json_path.relative_to(settings.public_dir).as_posix()}"
  else:
    outputs["dub_script_json"] = str(dub_json_path)

  store.write_status(JobStatus(job_id=job_id, status="completed", step="done", progress=1.0, outputs=outputs))
  return outputs


def run_job_with_status_files(
  *,
  job_id: str,
  input_public_relpath: str,
  settings: Settings,
  store: JobStore,
) -> None:
  try:
    store.write_status(JobStatus(job_id=job_id, status="queued", step="queued", progress=0.0))
    process_media_job(job_id=job_id, input_public_relpath=input_public_relpath, settings=settings, store=store)
  except PipelineError as e:
    current = store.read_status(job_id)
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="failed",
        step="error",
        progress=1.0,
        error=str(e),
        outputs=current.outputs if current else None,
      )
    )
  except Exception as e:
    current = store.read_status(job_id)
    store.write_status(
      JobStatus(
        job_id=job_id,
        status="failed",
        step="error",
        progress=1.0,
        error=f"{e}\n{traceback.format_exc()}",
        outputs=current.outputs if current else None,
      )
    )
