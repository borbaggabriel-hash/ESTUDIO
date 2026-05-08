"""
audio_quality.py — Cinema-grade audio processing pipeline for MTG-STUDIO.
All processing is offline, open-source, zero cost.
"""
import logging
import math

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

logger = logging.getLogger(__name__)

_TARGET_RMS_DB = -20.0
_TARGET_SR = 44100


# ─────────────────────────────────────────────
#  FILTERS
# ─────────────────────────────────────────────

def highpass_filter(audio: np.ndarray, sr: int, cutoff_hz: float = 80.0) -> np.ndarray:
    """Remove low-frequency room rumble (AC, vibration). Essential for home studio."""
    sos = butter(4, cutoff_hz / (sr / 2), btype="high", output="sos")
    if audio.ndim == 2:
        return np.stack([sosfilt(sos, audio[:, ch]) for ch in range(audio.shape[1])], axis=1).astype(np.float32)
    return sosfilt(sos, audio).astype(np.float32)


def lowpass_filter(audio: np.ndarray, sr: int, cutoff_hz: float = 16000.0) -> np.ndarray:
    """Remove harsh digital artifacts above 16kHz."""
    sos = butter(4, cutoff_hz / (sr / 2), btype="low", output="sos")
    if audio.ndim == 2:
        return np.stack([sosfilt(sos, audio[:, ch]) for ch in range(audio.shape[1])], axis=1).astype(np.float32)
    return sosfilt(sos, audio).astype(np.float32)


# ─────────────────────────────────────────────
#  NOISE REDUCTION
# ─────────────────────────────────────────────

def reduce_noise_take(audio: np.ndarray, sr: int, strength: float = 0.70) -> np.ndarray:
    """
    Spectral noise reduction for stationary background noise (fan, AC, room hum).
    strength: 0.0 = off, 1.0 = maximum (may artifact at high values)
    """
    try:
        import noisereduce as nr
        mono = audio.mean(axis=1) if audio.ndim == 2 else audio
        reduced = nr.reduce_noise(
            y=mono,
            sr=sr,
            stationary=True,
            prop_decrease=strength,
            freq_mask_smooth_hz=500,
            time_mask_smooth_ms=50,
        ).astype(np.float32)
        if audio.ndim == 2:
            return np.stack([reduced, reduced], axis=1)
        return reduced
    except ImportError:
        logger.warning("noisereduce not installed — skipping noise reduction. Run: pip install noisereduce")
        return audio
    except Exception as exc:
        logger.warning("Noise reduction failed (%s) — returning original", exc)
        return audio


# ─────────────────────────────────────────────
#  DYNAMICS
# ─────────────────────────────────────────────

def normalize_take_rms(audio: np.ndarray, target_db: float = _TARGET_RMS_DB) -> np.ndarray:
    """
    Normalize take to a consistent RMS level.
    Ensures all voice actors sit at the same perceived loudness before mixing.
    """
    mono = audio.mean(axis=1) if audio.ndim == 2 else audio
    rms = np.sqrt(np.mean(mono ** 2))
    if rms < 1e-8:
        return audio  # silence — leave untouched

    current_db = 20.0 * math.log10(rms)
    gain_db = target_db - current_db
    gain_linear = 10.0 ** (gain_db / 20.0)

    # Safety ceiling — never clip
    peak = np.max(np.abs(audio))
    if peak * gain_linear > 0.98:
        gain_linear = 0.98 / peak

    return (audio * gain_linear).astype(np.float32)


def soft_compress(
    audio: np.ndarray,
    threshold: float = 0.45,
    ratio: float = 3.5,
    makeup_db: float = 2.0,
) -> np.ndarray:
    """
    Soft-knee compressor for voice dynamics.
    Tames sudden loud syllables, brings up quiet passages.
    threshold: 0.0–1.0 amplitude, ratio: 2–8 (voice: 3–4)
    """
    compressed = audio.copy()
    above = np.abs(compressed) > threshold
    compressed[above] = (
        np.sign(compressed[above]) *
        (threshold + (np.abs(compressed[above]) - threshold) / ratio)
    )

    makeup = 10.0 ** (makeup_db / 20.0)
    peak = np.max(np.abs(compressed)) * makeup
    if peak > 0.98:
        makeup *= 0.98 / peak

    return (compressed * makeup).astype(np.float32)


# ─────────────────────────────────────────────
#  DUCKING
# ─────────────────────────────────────────────

def apply_ducking(
    me: np.ndarray,
    dialogue: np.ndarray,
    sr: int,
    reduction_db: float = 5.0,
    attack_ms: float = 30.0,
    release_ms: float = 200.0,
) -> np.ndarray:
    """
    Dynamic M&E ducking: lowers M&E volume automatically during speech.
    reduction_db: how much to lower M&E when voice is detected (default 5dB)
    """
    frame_size = max(1, int(sr * 0.01))  # 10ms frames

    dialogue_mono = dialogue.mean(axis=1) if dialogue.ndim == 2 else dialogue
    me_work = me.copy()

    total_samples = min(len(dialogue_mono), len(me_work))
    num_frames = total_samples // frame_size

    if num_frames < 2:
        return me_work

    # Compute dialogue energy per frame
    energy = np.array([
        np.sqrt(np.mean(dialogue_mono[i * frame_size:(i + 1) * frame_size] ** 2))
        for i in range(num_frames)
    ])

    energy_max = energy.max()
    if energy_max < 1e-8:
        return me_work

    energy_norm = energy / energy_max
    speech_threshold = 0.04
    reduction_linear = 10.0 ** (-reduction_db / 20.0)

    attack_frames = max(1, int(attack_ms / 10))
    release_frames = max(1, int(release_ms / 10))

    gain_curve = np.ones(num_frames, dtype=np.float32)
    state = 1.0
    for i in range(num_frames):
        target = reduction_linear if energy_norm[i] > speech_threshold else 1.0
        alpha = (1.0 - 1.0 / attack_frames) if target < state else (1.0 - 1.0 / release_frames)
        state = alpha * state + (1.0 - alpha) * target
        gain_curve[i] = state

    # Interpolate gain to sample level
    frame_centers = np.arange(num_frames) * frame_size + frame_size // 2
    sample_indices = np.arange(total_samples)
    gain_samples = np.interp(sample_indices, frame_centers, gain_curve).astype(np.float32)

    if me_work.ndim == 2:
        gain_samples = gain_samples[:, np.newaxis]

    me_work[:total_samples] *= gain_samples
    return me_work.astype(np.float32)


# ─────────────────────────────────────────────
#  PIPELINE ENTRY POINT
# ─────────────────────────────────────────────

def process_take(audio_path: str, sr_out: int = _TARGET_SR) -> tuple[np.ndarray, int]:
    """
    Full quality pipeline for a single take WAV file.
    Returns (processed_audio_float32, sample_rate)

    Chain:
      1. High-pass filter (remove room rumble < 80Hz)
      2. Noise reduction (stationary background noise)
      3. Low-pass filter (remove harshness > 16kHz)
      4. Soft compression (tame dynamics)
      5. RMS normalization (consistent loudness)
    """
    audio, sr = sf.read(audio_path, always_2d=True, dtype="float32")

    if sr != sr_out:
        import librosa
        mono = audio.mean(axis=1)
        resampled = librosa.resample(mono, orig_sr=sr, target_sr=sr_out)
        audio = np.stack([resampled, resampled], axis=1)
        sr = sr_out

    audio = highpass_filter(audio, sr, cutoff_hz=80.0)
    audio = reduce_noise_take(audio, sr, strength=0.70)
    audio = lowpass_filter(audio, sr, cutoff_hz=16000.0)
    audio = soft_compress(audio, threshold=0.45, ratio=3.5, makeup_db=2.0)
    audio = normalize_take_rms(audio, target_db=_TARGET_RMS_DB)

    return audio, sr


def numpy_to_audiosegment(audio: np.ndarray, sr: int):
    """Convert float32 numpy array → pydub AudioSegment."""
    from pydub import AudioSegment
    import io

    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    sf.write(buf, pcm, sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return AudioSegment.from_wav(buf)
