import itertools
import logging
import math
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import librosa
import numpy as np
import soundfile as sf
from pydub import AudioSegment


def _ffmpeg_exe() -> str:
    """Return the bundled ffmpeg binary path (from imageio_ffmpeg/moviepy)."""
    return imageio_ffmpeg.get_ffmpeg_exe()

logger = logging.getLogger(__name__)

_TARGET_SR = 44100
_TARGET_CHANNELS = 2
_TAKE_PATTERN = re.compile(r'^([A-Za-z0-9]+)_([A-Za-z0-9]+)_(\d{7,9})\.wav$', re.IGNORECASE)


class AudioProcessingError(RuntimeError):
    pass


# ─────────────────────────────────────────────
#  ANÁLISE BÁSICA
# ─────────────────────────────────────────────

def analyze_audio(file_path: str) -> dict:
    try:
        y, sr = librosa.load(file_path, sr=None, mono=True)
    except Exception as exc:
        raise AudioProcessingError(f"Não foi possível carregar o áudio '{file_path}': {exc}") from exc

    if y.size == 0:
        raise AudioProcessingError("Arquivo de áudio vazio ou corrompido")

    duration = librosa.get_duration(y=y, sr=sr)

    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo_array = np.asarray(tempo).reshape(-1)
    bpm = float(tempo_array[0]) if tempo_array.size else 0.0

    if not np.isfinite(bpm) or bpm <= 0:
        fallback_tempo = librosa.beat.tempo(y=y, sr=sr)
        fallback_array = np.asarray(fallback_tempo).reshape(-1)
        bpm = float(fallback_array[0]) if fallback_array.size else 0.0

    return {"duration": round(duration, 2), "bpm": round(max(bpm, 0.0), 1)}


# ─────────────────────────────────────────────
#  PARSER DE NOMENCLATURA DE TAKES
# ─────────────────────────────────────────────

def parse_take_filename(filename: str) -> dict | None:
    """
    Entrada: "HIMMEL_DIEGO_000110346.wav"
    Saída:   {character, actor, timecode_raw, position_ms, timecode_formatted, filename}
    Retorna None se o nome não corresponde ao padrão.
    """
    basename = Path(filename).name
    match = _TAKE_PATTERN.match(basename)
    if not match:
        return None

    character = match.group(1).upper()
    actor = match.group(2).upper()
    tc_raw = match.group(3).zfill(9)

    hh = int(tc_raw[0:2])
    mm = int(tc_raw[2:4])
    ss = int(tc_raw[4:6])
    ms = int(tc_raw[6:9])
    position_ms = (hh * 3600000) + (mm * 60000) + (ss * 1000) + ms

    timecode_formatted = f"{hh:02d}:{mm:02d}:{ss:02d}:{ms:03d}"

    return {
        "character": character,
        "actor": actor,
        "timecode_raw": tc_raw,
        "position_ms": position_ms,
        "timecode_formatted": timecode_formatted,
        "filename": basename,
        "filepath": str(Path(filename).resolve()),
    }


def parse_takes_folder(folder_path: str) -> dict:
    """
    Lê todos os .wav de folder_path.
    Retorna {
        "takes": lista ordenada por position_ms,
        "by_character": {CHAR: [...]},
        "invalid": [filenames que não casaram],
        "characters": set de personagens,
        "actors": set de dubladores,
    }
    """
    folder = Path(folder_path)
    takes = []
    invalid = []

    for wav_file in sorted(folder.glob("*.wav")):
        parsed = parse_take_filename(wav_file.name)
        if parsed is None:
            invalid.append(wav_file.name)
            continue
        parsed["filepath"] = str(wav_file)
        takes.append(parsed)

    takes.sort(key=lambda t: t["position_ms"])

    by_character: dict[str, list] = {}
    for take in takes:
        by_character.setdefault(take["character"], []).append(take)

    characters = {t["character"] for t in takes}
    actors = {t["actor"] for t in takes}

    return {
        "takes": takes,
        "by_character": by_character,
        "invalid": invalid,
        "characters": sorted(characters),
        "actors": sorted(actors),
    }


def format_timecode_ms(ms: int) -> str:
    hh = ms // 3600000
    rem = ms % 3600000
    mm = rem // 60000
    rem = rem % 60000
    ss = rem // 1000
    millis = rem % 1000
    return f"{hh:02d}:{mm:02d}:{ss:02d}:{millis:03d}"


# ─────────────────────────────────────────────
#  SEPARAÇÃO DEMUCS
# ─────────────────────────────────────────────

def separate_with_demucs(video_path: str, output_dir: str, job_id: str, progress_cb=None) -> dict:
    """
    Roda htdemucs no áudio extraído do vídeo.
    Retorna {"me_path": str, "vocals_path": str, "stems_dir": str}
    """
    import torch

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    audio_extract_path = output_dir / f"{job_id}_extracted.wav"

    if progress_cb:
        progress_cb("Extraindo áudio do vídeo...", 5)

    try:
        subprocess.run([
            _ffmpeg_exe(), "-y", "-i", str(video_path),
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "44100", "-ac", "2",
            str(audio_extract_path),
        ], check=True, capture_output=True)
    except subprocess.CalledProcessError as exc:
        raise AudioProcessingError(f"ffmpeg falhou ao extrair áudio: {exc.stderr.decode()[:500]}") from exc

    if progress_cb:
        progress_cb("Iniciando separação Demucs (htdemucs)...", 15)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Demucs device: %s", device)

    demucs_out = output_dir / "demucs_out"
    demucs_out.mkdir(exist_ok=True)

    try:
        result = subprocess.run([
            sys.executable, "-m", "demucs",
            "--two-stems", "vocals",
            "-n", "htdemucs",
            "--device", device,
            "-o", str(demucs_out),
            str(audio_extract_path),
        ], capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise AudioProcessingError(f"Demucs falhou: {result.stderr[-600:]}")
    except subprocess.TimeoutExpired as exc:
        raise AudioProcessingError("Demucs demorou mais de 1 hora — verifique o arquivo.") from exc

    if progress_cb:
        progress_cb("Demucs concluído. Localizando stems...", 70)

    stem_base = demucs_out / "htdemucs" / audio_extract_path.stem
    vocals_path = stem_base / "vocals.wav"
    no_vocals_path = stem_base / "no_vocals.wav"

    if not vocals_path.exists() or not no_vocals_path.exists():
        raise AudioProcessingError(f"Stems não encontrados em {stem_base}")

    if progress_cb:
        progress_cb("Stems prontos.", 90)

    return {
        "me_path": str(no_vocals_path),
        "vocals_path": str(vocals_path),
        "stems_dir": str(stem_base),
        "extracted_audio": str(audio_extract_path),
    }


# ─────────────────────────────────────────────
#  AGRUPAMENTO E COMBINAÇÕES
# ─────────────────────────────────────────────

def group_takes(takes: list) -> dict:
    """
    Agrupa takes em {PERSONAGEM: {DUBLADOR: [takes sorted by position_ms]}}.
    """
    groups: dict[str, dict[str, list]] = {}
    for take in takes:
        char = take["character"]
        actor = take["actor"]
        groups.setdefault(char, {}).setdefault(actor, []).append(take)
    for char in groups:
        for actor in groups[char]:
            groups[char][actor].sort(key=lambda t: t["position_ms"])
    return groups


def generate_combos(groups: dict) -> list[dict]:
    """
    Produto cartesiano dos dubladores por personagem.
    Retorna [{"HIMMEL": "DIEGO", "FRIEREN": "ANA"}, ...]
    """
    personagens = list(groups.keys())
    opcoes = [list(groups[p].keys()) for p in personagens]
    combos = []
    for combo in itertools.product(*opcoes):
        combos.append({personagens[i]: combo[i] for i in range(len(personagens))})
    return combos


def combo_output_name(combo: dict) -> str:
    """
    Gera nome de arquivo para a combinação.
    Ex: {"HIMMEL": "DIEGO", "FRIEREN": "ANA"} → "dub_HIMMEL-DIEGO_FRIEREN-ANA.mp4"
    """
    parts = [f"{char}-{actor}" for char, actor in combo.items()]
    return "dub_" + "_".join(parts) + ".mp4"


# ─────────────────────────────────────────────
#  DETECÇÃO DE SILÊNCIO INICIAL (WHISPER)
# ─────────────────────────────────────────────

_whisper_model = None
_lipsync_cache: dict[str, int] = {}


def invalidate_lipsync_cache(filepath: str) -> None:
    """T10: Remove a cached lipsync offset for a file path (call after rename-take)."""
    _lipsync_cache.pop(filepath, None)


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model


def detect_lipsync_offset(audio_path: str) -> int:
    """
    Usa Whisper tiny para encontrar o timestamp de início da primeira palavra.
    Retorna offset_ms (silêncio inicial a remover). Retorna 0 se falhar.
    """
    try:
        model = _get_whisper_model()
        result = model.transcribe(str(audio_path), language="pt", word_timestamps=True)
        segments = result.get("segments", [])
        if not segments:
            return 0
        first_start = segments[0].get("start", 0.0)
        offset_ms = int(first_start * 1000)
        return max(0, offset_ms - 20)
    except Exception as exc:
        logger.warning("Whisper falhou para %s: %s", audio_path, exc)
        return 0


# ─────────────────────────────────────────────
#  RESOLUÇÃO DE SOBREPOSIÇÕES
# ─────────────────────────────────────────────

def resolve_overlaps(takes: list, overlap_log: list) -> list:
    """
    Recebe lista de takes (ordenada por position_ms) com duration_ms já preenchido.
    Resolve sobreposições: take posterior vence na região sobreposta.
    Caso especial: take novo inteiramente dentro de take anterior → split.
    """
    resolved = []
    i = 0
    while i < len(takes):
        take = dict(takes[i])
        take.setdefault("trimmed", False)
        take.setdefault("split_tail", None)
        take_start = take["position_ms"]
        take_end = take_start + take.get("duration_ms", 0)

        if i + 1 < len(takes):
            next_take = takes[i + 1]
            next_start = next_take["position_ms"]
            next_end = next_start + next_take.get("duration_ms", 0)

            if next_start < take_end:
                if next_end < take_end:
                    tail_start = next_end
                    tail_duration = take_end - next_end
                    take["split_tail"] = {
                        "position_ms": tail_start,
                        "duration_ms": tail_duration,
                        "filepath": take["filepath"],
                        "filename": take["filename"],
                        "character": take["character"],
                        "actor": take["actor"],
                        "timecode_raw": take["timecode_raw"],
                        "timecode_formatted": format_timecode_ms(tail_start),
                        "start_trim_ms": take.get("start_trim_ms", 0) + (tail_start - take_start),
                        "is_tail": True,
                    }
                    overlap_log.append({
                        "tipo": "sobreposição_split",
                        "take_dividido": take["filename"],
                        "take_no_meio": next_take["filename"],
                        "tail_start_ms": tail_start,
                        "tail_duration_ms": tail_duration,
                    })
                else:
                    original_duration = take_end - take_start
                    novo_duration = next_start - take_start
                    overlap_log.append({
                        "tipo": "sobreposição_resolvida",
                        "take_cortado": take["filename"],
                        "cortado_em_ms": next_start,
                        "take_vencedor": next_take["filename"],
                        "duracao_descartada_ms": original_duration - novo_duration,
                    })
                    take["duration_ms"] = max(0, novo_duration)
                    take["trimmed"] = True
                    take["original_duration_ms"] = original_duration
                    take["trim_reason"] = f"Substituído por {next_take['filename']} a partir de {next_start}ms"

        # T11: skip takes that were fully consumed by overlap resolution to avoid
        # overlaying a zero-duration (empty) segment onto dialogue_track.
        if take.get("duration_ms", 0) > 0:
            resolved.append(take)
        i += 1

    return resolved


# ─────────────────────────────────────────────
#  MONTAGEM POR COMBINAÇÃO (pydub)
# ─────────────────────────────────────────────

def build_combo_audio(
    combo: dict,
    groups: dict,
    me_path: str,
    total_ms: int,
    settings: dict,
    lipsync_trim: bool = True,
    log_cb=None,
    overlap_log=None,
    muted_tracks: list | None = None,
    soloed_tracks: list | None = None,
) -> str:
    """
    Monta faixa de diálogos para uma combinação de dubladores.
    Posiciona takes sem alterar velocidade. Lipsync trim via Whisper opcional.
    Retorna caminho do WAV temporário do mix final.
    """
    if overlap_log is None:
        overlap_log = []

    me_vol = _clamp_float(_coerce_float(settings.get("volume_me"), 0.8), 0.0, 1.5)
    dlg_vol = _clamp_float(_coerce_float(settings.get("volume_dialogos"), 1.0), 0.0, 1.5)

    muted_set  = set(muted_tracks  or [])
    soloed_set = set(soloed_tracks or [])

    silence = AudioSegment.silent(duration=total_ms, frame_rate=_TARGET_SR).set_channels(_TARGET_CHANNELS)
    dialogue_track = silence

    for char, actor in combo.items():
        track_key = f"{char}||{actor}"
        # Solo wins over mute: if any tracks are soloed, ONLY those play.
        if soloed_set and track_key not in soloed_set:
            if log_cb: log_cb(f"Track silenciada (solo ativo): {char} → {actor}", None)
            continue
        if not soloed_set and track_key in muted_set:
            if log_cb: log_cb(f"Track silenciada (mute): {char} → {actor}", None)
            continue
        takes_for_actor = list(groups.get(char, {}).get(actor, []))
        takes_for_actor.sort(key=lambda t: t["position_ms"])
        resolved = resolve_overlaps(takes_for_actor, overlap_log)

        def _overlay_take_segment(t: dict) -> None:
            """Overlay a single take segment (or split_tail) onto dialogue_track."""
            nonlocal dialogue_track
            seg = AudioSegment.from_wav(t["filepath"]).set_frame_rate(_TARGET_SR).set_channels(_TARGET_CHANNELS)
            effective_pos = t["position_ms"]

            if t.get("start_trim_ms", 0) > 0:
                seg = seg[t["start_trim_ms"]:]

            if lipsync_trim:
                _fp = t["filepath"]
                _first_time = _fp not in _lipsync_cache
                if _first_time:
                    offset_ms = detect_lipsync_offset(_fp)
                    _lipsync_cache[_fp] = offset_ms
                else:
                    offset_ms = _lipsync_cache[_fp]
                if offset_ms > 0:
                    effective_pos = effective_pos + offset_ms
                    if log_cb and _first_time:
                        log_cb(f"Take {t['filename']}: silêncio inicial de {offset_ms}ms removido", None)
                    seg = seg[offset_ms:]

            _dur = t.get("duration_ms") or 0
            if _dur > 0 and len(seg) > _dur:
                seg = seg[:_dur]

            if effective_pos >= total_ms:
                return

            dialogue_track = dialogue_track.overlay(seg, position=effective_pos)

        for take in resolved:
            try:
                _overlay_take_segment(take)
                # R4: also overlay the split_tail when the overlap resolver produced one.
                tail = take.get("split_tail")
                if tail:
                    try:
                        _overlay_take_segment(tail)
                    except Exception as exc:
                        logger.warning("Falha ao processar split_tail de %s: %s", take.get("filename"), exc)
                        if log_cb:
                            log_cb(f"Aviso: falha ao processar tail de {take.get('filename')}: {exc}", None)

            except Exception as exc:
                logger.warning("Falha ao processar take %s: %s", take.get("filename"), exc)
                if log_cb:
                    log_cb(f"Aviso: falha ao processar {take.get('filename')}: {exc}", None)

    if abs(dlg_vol - 1.0) > 0.01:
        dlg_db = 20.0 * math.log10(max(dlg_vol, 0.001))
        dialogue_track = dialogue_track + dlg_db

    me_seg = AudioSegment.from_file(me_path).set_frame_rate(_TARGET_SR).set_channels(_TARGET_CHANNELS)
    if len(me_seg) < total_ms:
        me_seg = me_seg + AudioSegment.silent(duration=total_ms - len(me_seg), frame_rate=_TARGET_SR).set_channels(_TARGET_CHANNELS)
    else:
        me_seg = me_seg[:total_ms]

    if abs(me_vol - 1.0) > 0.01:
        me_db = 20.0 * math.log10(max(me_vol, 0.001))
        me_seg = me_seg + me_db

    final_mix = me_seg.overlay(dialogue_track, position=0)

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    final_mix.export(tmp.name, format="wav")
    return tmp.name


# ─────────────────────────────────────────────
#  EXPORTAÇÃO DE VÍDEO (ffmpeg stream copy)
# ─────────────────────────────────────────────

def export_video_with_audio(video_path: str, audio_wav_path: str, output_path: str, progress_cb=None) -> None:
    """Substitui o áudio do vídeo pelo mix final via ffmpeg stream copy. Preserva fps/codec/bitrate originais."""
    import subprocess as _sp
    try:
        import imageio_ffmpeg as _iio_ff
        _ffmpeg_bin = _iio_ff.get_ffmpeg_exe()
    except Exception:
        _ffmpeg_bin = "ffmpeg"

    if progress_cb:
        progress_cb("Montando vídeo final...", 92)

    cmd = [
        _ffmpeg_bin, "-y",
        "-i", str(video_path),
        "-i", str(audio_wav_path),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path),
    ]
    try:
        result = _sp.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise AudioProcessingError(f"Falha ao exportar vídeo (ffmpeg): {result.stderr[-400:]}")
    except AudioProcessingError:
        raise
    except Exception as exc:
        raise AudioProcessingError(f"Falha ao exportar vídeo: {exc}") from exc

    if progress_cb:
        progress_cb("Vídeo exportado com sucesso.", 100)


# ─────────────────────────────────────────────
#  HELPERS LEGADOS (mantidos para compatibilidade)
# ─────────────────────────────────────────────

def convert_wav_to_mp3(wav_path: str, mp3_path: str) -> bool:
    try:
        from pydub import AudioSegment as AS
        audio = AS.from_wav(wav_path)
        audio.export(mp3_path, format="mp3", bitrate="192k")
        return True
    except Exception as exc:
        logger.warning("Falha ao exportar MP3 '%s': %s", mp3_path, exc)
        return False


def mix_dubbing(me_path: str, characters: list, settings: dict, output_path_wav: str) -> None:
    from pydub import AudioSegment as AS

    def _vol_db(pct):
        p = max(0.001, pct / 100.0)
        return 20.0 * math.log10(p)

    me_vol_pct = _clamp_float(_coerce_float(settings.get("me_volume"), 80.0), 0.0, 150.0)
    dlg_vol_pct = _clamp_float(_coerce_float(settings.get("dialogue_volume"), 100.0), 0.0, 150.0)
    ducking = bool(settings.get("ducking", False))
    ducking_intensity = _clamp_float(_coerce_float(settings.get("ducking_intensity"), 0.7), 0.0, 1.0)

    me_seg = AS.from_file(me_path).set_frame_rate(44100).set_channels(2)
    if abs(_vol_db(me_vol_pct)) > 0.05:
        me_seg = me_seg + _vol_db(me_vol_pct)

    max_ms = len(me_seg)
    char_segs = []
    for char in characters:
        vol = _clamp_float(_coerce_float(char.get("volume"), 100.0), 0.0, 150.0)
        seg = AS.from_file(char["path"]).set_frame_rate(44100).set_channels(2)
        if abs(_vol_db(vol)) > 0.05:
            seg = seg + _vol_db(vol)
        char_segs.append(seg)
        max_ms = max(max_ms, len(seg))

    silence = AS.silent(duration=max_ms, frame_rate=44100).set_channels(2)
    dlg_mix = silence
    for seg in char_segs:
        dlg_mix = dlg_mix.overlay(seg, position=0)

    if abs(_vol_db(dlg_vol_pct)) > 0.05:
        dlg_mix = dlg_mix + _vol_db(dlg_vol_pct)

    final = me_seg.overlay(dlg_mix, position=0)
    final.export(output_path_wav, format="wav")


# ─────────────────────────────────────────────
#  UTILS
# ─────────────────────────────────────────────

def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp_float(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))
