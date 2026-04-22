from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import librosa
import numpy as np
import soundfile as sf
import torch
import webrtcvad
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score
from speechbrain.inference.speaker import EncoderClassifier


@dataclass(frozen=True)
class SpeechSegment:
  start_time: float
  end_time: float
  speaker_label: int


_spk_model: EncoderClassifier | None = None


def _get_speaker_model() -> EncoderClassifier:
  global _spk_model
  if _spk_model is None:
    _spk_model = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")
  return _spk_model


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


def _frames_30ms(pcm16: bytes, sample_rate: int = 16000, frame_ms: int = 30) -> Iterable[bytes]:
  frame_len = int(sample_rate * (frame_ms / 1000.0) * 2)
  offset = 0
  while offset + frame_len <= len(pcm16):
    yield pcm16[offset : offset + frame_len]
    offset += frame_len


def _vad_speech_regions(y: np.ndarray, sr: int, aggressiveness: int) -> list[tuple[float, float]]:
  vad = webrtcvad.Vad(aggressiveness)
  pcm16 = (np.clip(y, -1.0, 1.0) * 32767.0).astype(np.int16).tobytes()
  frame_ms = 30
  regions: list[tuple[float, float]] = []
  in_speech = False
  speech_start = 0.0
  t = 0.0
  for frame in _frames_30ms(pcm16, sample_rate=sr, frame_ms=frame_ms):
    is_speech = vad.is_speech(frame, sr)
    if is_speech and not in_speech:
      in_speech = True
      speech_start = t
    if not is_speech and in_speech:
      in_speech = False
      regions.append((speech_start, t))
    t += frame_ms / 1000.0
  if in_speech:
    regions.append((speech_start, t))

  merged: list[tuple[float, float]] = []
  max_gap = 0.35
  for start, end in regions:
    if not merged:
      merged.append((start, end))
      continue
    prev_start, prev_end = merged[-1]
    if start - prev_end <= max_gap:
      merged[-1] = (prev_start, end)
    else:
      merged.append((start, end))

  min_len = 0.4
  return [(s, e) for (s, e) in merged if (e - s) >= min_len]


def _embed_segment(y: np.ndarray, sr: int) -> np.ndarray:
  model = _get_speaker_model()
  wav = torch.from_numpy(y).unsqueeze(0)
  emb = model.encode_batch(wav).squeeze(0).squeeze(0).detach().cpu().numpy()
  return emb.astype(np.float32)


def _l2_normalize_rows(x: np.ndarray) -> np.ndarray:
  denom = np.linalg.norm(x, axis=1, keepdims=True)
  denom = np.maximum(denom, 1e-12)
  return x / denom


def _merge_segments(
  segments: list[SpeechSegment],
  *,
  max_gap_same_speaker: float = 0.25,
  min_duration: float = 0.35,
  short_merge_threshold: float = 0.55,
  short_max_gap: float = 0.3,
) -> list[SpeechSegment]:
  if not segments:
    return []

  segments = sorted(segments, key=lambda s: (s.start_time, s.end_time))

  merged: list[SpeechSegment] = []
  for seg in segments:
    if not merged:
      merged.append(seg)
      continue
    prev = merged[-1]
    if seg.speaker_label == prev.speaker_label and seg.start_time - prev.end_time <= max_gap_same_speaker:
      merged[-1] = SpeechSegment(
        start_time=prev.start_time,
        end_time=max(prev.end_time, seg.end_time),
        speaker_label=prev.speaker_label,
      )
    else:
      merged.append(seg)

  merged = [s for s in merged if (s.end_time - s.start_time) >= min_duration]
  if len(merged) <= 1:
    return merged

  i = 0
  out: list[SpeechSegment] = []
  while i < len(merged):
    cur = merged[i]
    dur = cur.end_time - cur.start_time
    if dur >= short_merge_threshold:
      out.append(cur)
      i += 1
      continue

    prev = out[-1] if out else None
    nxt = merged[i + 1] if i + 1 < len(merged) else None

    gap_prev = cur.start_time - prev.end_time if prev else float("inf")
    gap_next = nxt.start_time - cur.end_time if nxt else float("inf")

    if prev and gap_prev <= short_max_gap and (not nxt or gap_prev <= gap_next):
      out[-1] = SpeechSegment(
        start_time=prev.start_time,
        end_time=max(prev.end_time, cur.end_time),
        speaker_label=prev.speaker_label,
      )
      i += 1
      continue

    if nxt and gap_next <= short_max_gap:
      merged[i + 1] = SpeechSegment(
        start_time=min(cur.start_time, nxt.start_time),
        end_time=max(cur.end_time, nxt.end_time),
        speaker_label=nxt.speaker_label,
      )
      i += 1
      continue

    out.append(cur)
    i += 1

  return out


def diarize_speakers(
  audio_wav_path: Path,
  vad_aggressiveness: int = 2,
  max_speakers: int = 6,
) -> list[SpeechSegment]:
  """
  Diarização offline sem serviços externos:
  - VAD (webrtcvad) detecta trechos de fala.
  - SpeechBrain ECAPA gera embeddings por trecho.
  - Clustering (Agglomerative) agrupa embeddings em locutores.

  Retorna segmentos com speaker_label 0..N-1 em ordem temporal.
  """
  y, sr = _load_audio_16k_mono(audio_wav_path)
  regions = _vad_speech_regions(y, sr, aggressiveness=vad_aggressiveness)
  if len(regions) == 0:
    return []

  max_chunk_seconds = 14.0
  chunked_regions: list[tuple[float, float]] = []
  for start, end in regions:
    dur = end - start
    if dur <= max_chunk_seconds:
      chunked_regions.append((start, end))
      continue
    cursor = start
    while cursor < end:
      next_end = min(end, cursor + max_chunk_seconds)
      chunked_regions.append((cursor, next_end))
      cursor = next_end

  embeddings: list[np.ndarray] = []
  embed_regions: list[tuple[float, float]] = []
  for start, end in chunked_regions:
    s = int(start * sr)
    e = int(end * sr)
    seg = y[s:e]
    if seg.size < int(0.5 * sr):
      continue
    embeddings.append(_embed_segment(seg, sr))
    embed_regions.append((start, end))

  if len(embeddings) == 0:
    return []

  X = _l2_normalize_rows(np.vstack(embeddings))
  n_segments = X.shape[0]
  best_k = 1
  best_score = -1.0
  max_k = min(max_speakers, n_segments)
  for k in range(2, max_k + 1):
    try:
      labels = AgglomerativeClustering(n_clusters=k).fit_predict(X)
      if len(set(labels)) < 2:
        continue
      score = silhouette_score(X, labels)
      if score > best_score:
        best_score = score
        best_k = k
    except Exception:
      continue

  final_labels = (
    np.zeros(n_segments, dtype=np.int32)
    if best_k == 1
    else AgglomerativeClustering(n_clusters=best_k).fit_predict(X)
  )

  first_seen: dict[int, float] = {}
  mapped: dict[int, int] = {}
  next_id = 0
  for idx, raw_label in enumerate(final_labels.tolist()):
    if raw_label not in first_seen:
      first_seen[raw_label] = float(embed_regions[idx][0])
  for raw_label, _ in sorted(first_seen.items(), key=lambda kv: kv[1]):
    mapped[raw_label] = next_id
    next_id += 1

  out: list[SpeechSegment] = []
  for idx, (start, end) in enumerate(embed_regions):
    out.append(
      SpeechSegment(
        start_time=float(start),
        end_time=float(end),
        speaker_label=int(mapped[int(final_labels[idx])]),
      )
    )

  return _merge_segments(out)
