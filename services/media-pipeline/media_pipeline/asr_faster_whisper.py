from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import uuid

import librosa
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel


@dataclass(frozen=True)
class TranscriptSegment:
  start_time: float
  end_time: float
  text: str
  speaker_label: int


_whisper: WhisperModel | None = None


def _get_whisper(model_name: str) -> WhisperModel:
  global _whisper
  if _whisper is None:
    _whisper = WhisperModel(model_name, device="cpu", compute_type="int8")
  return _whisper


def _load_audio_16k_mono(audio_path: Path) -> tuple[np.ndarray, int]:
  y, sr = sf.read(str(audio_path))
  if y.ndim > 1:
    y = np.mean(y, axis=1)
  if sr != 16000:
    y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=16000)
    sr = 16000
  if y.dtype != np.float32:
    y = y.astype(np.float32)
  return y, sr


def transcribe_segmented_audio(
  audio_wav_path: Path,
  diarized_segments: list[tuple[float, float, int]],
  out_dir: Path,
  whisper_model: str,
) -> list[TranscriptSegment]:
  """
  Transcrição por segmentos diarizados:
  - Recorta cada trecho (start/end) do áudio base.
  - Chama faster-whisper com VAD interno (vad_filter) para reduzir ruído.
  - Atribui o texto ao speaker_label do trecho.

  Observação: O texto retornado deve ser interpretado como "rascunho sincronizado".
  Em produção, é comum fazer pós-processamento (pontuação, normalização e revisão).
  """
  out_dir.mkdir(parents=True, exist_ok=True)
  y, sr = _load_audio_16k_mono(audio_wav_path)
  model = _get_whisper(whisper_model)

  results: list[TranscriptSegment] = []
  for start, end, spk in diarized_segments:
    s = int(start * sr)
    e = int(end * sr)
    seg = y[s:e]
    if seg.size < int(0.3 * sr):
      continue
    tmp = out_dir / f"seg_{uuid.uuid4().hex}.wav"
    sf.write(str(tmp), seg, sr)
    segments, _info = model.transcribe(str(tmp), language="pt", vad_filter=True, word_timestamps=False)
    wrote_any = False
    for seg_out in segments:
      text = (seg_out.text or "").strip()
      if not text:
        continue
      wrote_any = True
      results.append(
        TranscriptSegment(
          start_time=float(start + float(seg_out.start)),
          end_time=float(start + float(seg_out.end)),
          text=text,
          speaker_label=int(spk),
        )
      )

    if not wrote_any:
      pass
    try:
      tmp.unlink(missing_ok=True)
    except Exception:
      pass

  results.sort(key=lambda r: (r.start_time, r.end_time))
  return results
