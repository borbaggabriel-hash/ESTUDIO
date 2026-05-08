import asyncio
import hashlib
import json
import logging
import math
import mimetypes
import shutil
import threading
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as _np
import soundfile as _sf

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from audio_engine import (
    AudioProcessingError,
    analyze_audio,
    build_combo_audio,
    combo_output_name,
    convert_wav_to_mp3,
    export_video_with_audio,
    generate_combos,
    group_takes,
    mix_dubbing,
    parse_take_filename,
    parse_takes_folder,
    separate_with_demucs,
)
from gemini_bridge import suggest_mix_params

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
JOBS_DIR = BASE_DIR / "jobs"
HISTORY_FILE = OUTPUTS_DIR / "history.json"
STATIC_DIR = BASE_DIR / "static"

for d in (UPLOADS_DIR, OUTPUTS_DIR, JOBS_DIR):
    d.mkdir(exist_ok=True)

ALLOWED_VIDEO = {".mp4", ".mkv", ".mov", ".avi", ".webm"}
ALLOWED_AUDIO = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"}
MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024
MAX_TAKES_BYTES = 500 * 1024 * 1024
MAX_HISTORY = 10

app = FastAPI(title="Dubbing Mixer Pro", version="3.0.0")

jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()
history_lock = threading.RLock()


# ─────────────────────────────────────────────
#  JOB STATE HELPERS
# ─────────────────────────────────────────────

def _job_dir(job_id: str) -> Path:
    d = JOBS_DIR / job_id
    d.mkdir(exist_ok=True)
    return d


def _state_path(job_id: str) -> Path:
    return _job_dir(job_id) / "state.json"


def _load_state(job_id: str) -> dict:
    p = _state_path(job_id)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            logger.warning("state.json corrompido para job %s — retornando vazio", job_id)
    return {}


def _save_state(job_id: str, state: dict) -> None:
    p = _state_path(job_id)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(p)


def _update_job(job_id: str, **kw: Any) -> None:
    with jobs_lock:
        if job_id not in jobs:
            jobs[job_id] = {}
        jobs[job_id].update(kw)
        # Persist inside lock so concurrent threads always serialize writes
        try:
            state = _load_state(job_id)
            state.update(kw)
            _save_state(job_id, state)
        except Exception:
            logger.exception("Falha ao persistir estado do job %s", job_id)


def _set_error(job_id: str, msg: str) -> None:
    _update_job(job_id, status="erro", etapa="erro", percentual=0, error=msg)


def _get_job(job_id: str) -> dict:
    with jobs_lock:
        mem = jobs.get(job_id)
    if mem:
        return mem
    state = _load_state(job_id)
    if state:
        with jobs_lock:
            jobs[job_id] = state
        return state
    raise HTTPException(status_code=404, detail="Job não encontrado")


# ─────────────────────────────────────────────
#  HISTORY
# ─────────────────────────────────────────────

def _load_history() -> list:
    with history_lock:
        if HISTORY_FILE.exists():
            try:
                return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            except Exception:
                return []
        return []


def _add_to_history(entry: dict) -> None:
    with history_lock:
        entries = _load_history()
        entries.insert(0, entry)
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = HISTORY_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(entries[:MAX_HISTORY], ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(HISTORY_FILE)


# ─────────────────────────────────────────────
#  BACKGROUND JOBS
# ─────────────────────────────────────────────

def _run_demucs_job(job_id: str, video_path: str) -> None:
    def cb(msg, pct):
        _update_job(job_id, etapa="demucs", percentual=pct, mensagem=msg)
        logger.info("[%s] %s (%d%%)", job_id, msg, pct)

    try:
        _update_job(job_id, status="processando", etapa="demucs", percentual=0,
                    mensagem="Iniciando separação Demucs...")
        stems = separate_with_demucs(video_path, str(_job_dir(job_id)), job_id, progress_cb=cb)
        _update_job(job_id, status="aguardando_takes",
                    etapa="demucs_concluido", percentual=100,
                    mensagem="Separação concluída. Aguardando upload dos takes.",
                    me_path=stems["me_path"],
                    vocals_path=stems["vocals_path"],
                    stems=stems)
    except AudioProcessingError as exc:
        _set_error(job_id, str(exc))
    except Exception:
        logger.exception("Erro inesperado no job Demucs %s", job_id)
        _set_error(job_id, "Falha inesperada na separação Demucs.")


def _run_process_job(job_id: str, settings: dict) -> None:
    def cb(msg, pct):
        if pct is not None:
            _update_job(job_id, etapa="processando", percentual=pct, mensagem=msg)
        else:
            state = _load_state(job_id)
            tail = (state.get("log_tail") or []) + [msg]
            _update_job(job_id, mensagem=msg, log_tail=tail[-200:])
        logger.info("[%s] %s", job_id, msg)

    try:
        state = _load_state(job_id)
        me_path = state.get("me_path")
        video_path = state.get("video_path")
        takes = state.get("takes", [])
        video_info = state.get("video_info", {})

        if not me_path:
            _set_error(job_id, "Separação Demucs ainda não concluída.")
            return
        if not takes:
            _set_error(job_id, "Nenhum take carregado.")
            return

        total_ms = int(video_info.get("duration_ms", 0))
        if total_ms == 0:
            total_ms = 60 * 60 * 1000

        lipsync_trim = bool(settings.get("lipsync_trim", True))
        groups = group_takes(takes)
        combos = generate_combos(groups)

        if not combos:
            _set_error(job_id, "Nenhuma combinação de dubladores gerada.")
            return

        _update_job(job_id, status="processando", etapa="combo_mix",
                    percentual=2, mensagem=f"Gerando {len(combos)} combinação(ões)...",
                    warnings=[], combos_results=[])

        combos_results: list[dict] = []
        overall_warnings: list[str] = []

        for i, combo in enumerate(combos):
            overlap_log: list[dict] = []
            combo_label = " + ".join(f"{ch}→{ac}" for ch, ac in combo.items())
            out_name = combo_output_name(combo)
            pct_base = 5 + int(90 * i / len(combos))

            cb(f"Combo {i+1}/{len(combos)}: {combo_label}", pct_base)

            try:
                audio_wav = build_combo_audio(
                    combo=combo,
                    groups=groups,
                    me_path=me_path,
                    total_ms=total_ms,
                    settings=settings,
                    lipsync_trim=lipsync_trim,
                    log_cb=cb,
                    overlap_log=overlap_log,
                    muted_tracks=settings.get("muted_tracks", []),
                    soloed_tracks=settings.get("soloed_tracks", []),
                )

                output_path = str(OUTPUTS_DIR / out_name)
                try:
                    if video_path and Path(video_path).exists():
                        export_video_with_audio(video_path, audio_wav, output_path)
                        result_type = "video"
                    else:
                        wav_out = output_path.replace(".mp4", ".wav")
                        shutil.copy2(audio_wav, wav_out)
                        output_path = wav_out
                        result_type = "audio"
                finally:
                    # R3: always clean up temp WAV, even if export raises.
                    try:
                        Path(audio_wav).unlink(missing_ok=True)
                    except Exception:
                        pass

                combo_result = {
                    "combo_id": f"combo_{i}",
                    "mix": combo,
                    "label": combo_label,
                    "output_file": Path(output_path).name,
                    "result_type": result_type,
                    "overlap_log": overlap_log,
                    "download_url": f"/api/download/{Path(output_path).name}",
                }
                combos_results.append(combo_result)
                overall_warnings.extend([o.get("tipo", "") for o in overlap_log if o.get("tipo")])

                pct_done = 5 + int(90 * (i + 1) / len(combos))
                _update_job(job_id, percentual=pct_done,
                            mensagem=f"Combo {i+1}/{len(combos)} concluído: {out_name}",
                            combos_results=combos_results)

            except Exception as exc:
                logger.exception("Erro no combo %d (%s)", i, combo_label)
                combos_results.append({
                    "combo_id": f"combo_{i}",
                    "mix": combo,
                    "label": combo_label,
                    "error": str(exc),
                })

        _update_job(
            job_id,
            status="concluido",
            etapa="exportado",
            percentual=100,
            mensagem=f"Pipeline concluído. {len(combos_results)} vídeo(s) gerado(s).",
            combos_results=combos_results,
            warnings=overall_warnings,
            result_file=combos_results[0]["output_file"] if combos_results and "output_file" in combos_results[0] else None,
            result_type=combos_results[0].get("result_type", "video") if combos_results else "video",
        )

        _add_to_history({
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "created_at": datetime.now().isoformat(),
            "takes_count": len(takes),
            "combos_count": len(combos_results),
            "combos_results": [{"label": r["label"], "file": r.get("output_file")} for r in combos_results],
        })

    except AudioProcessingError as exc:
        _set_error(job_id, str(exc))
    except Exception:
        logger.exception("Erro inesperado no job de processo %s", job_id)
        _set_error(job_id, "Falha inesperada no processamento.")


# ─────────────────────────────────────────────
#  ENDPOINTS — VÍDEO
# ─────────────────────────────────────────────

@app.post("/api/upload/video")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO:
        raise HTTPException(400, f"Formato de vídeo não suportado. Use: {', '.join(sorted(ALLOWED_VIDEO))}")

    job_id = str(uuid.uuid4())
    dest = _job_dir(job_id) / f"original{ext}"

    size = 0
    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_VIDEO_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "Vídeo excede o limite de 4GB")
            f.write(chunk)

    video_info = {}
    try:
        import subprocess as sp
        import imageio_ffmpeg as _iio_ff
        _ffmpeg_bin = _iio_ff.get_ffmpeg_exe()
        _ffprobe_bin = str(Path(_ffmpeg_bin).parent / Path(_ffmpeg_bin).name.replace("ffmpeg", "ffprobe"))
        if not Path(_ffprobe_bin).exists():
            _ffprobe_bin = "ffprobe"
        r = sp.run([
            _ffprobe_bin, "-v", "quiet", "-print_format", "json",
            "-show_streams", "-show_format", str(dest)
        ], capture_output=True, text=True)
        if r.returncode != 0:
            raise ValueError(f"ffprobe exited {r.returncode}: {r.stderr[:200]}")
        probe = json.loads(r.stdout)
        duration_s = float(probe.get("format", {}).get("duration", 0))
        video_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "video"), {})
        audio_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "audio"), None)
        if not audio_stream:
            dest.unlink(missing_ok=True)  # T8: clean up uploaded file before raising
            raise HTTPException(422, "O vídeo não possui faixa de áudio.")

        w = int(video_stream.get("width", 0))
        h = int(video_stream.get("height", 0))
        fps_str = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate", "25/1")
        num, den = fps_str.split("/") if "/" in fps_str else (fps_str, "1")
        fps = round(int(num) / max(1, int(den)), 2)

        video_info = {
            "duration_ms": int(duration_s * 1000),
            "duration_s": round(duration_s, 2),
            "resolution": f"{w}x{h}",
            "fps": fps,
            "filename": file.filename,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("ffprobe falhou: %s", exc)
        video_info = {"duration_ms": 0, "filename": file.filename}

    _update_job(job_id,
                status="iniciando_demucs",
                etapa="demucs",
                percentual=0,
                mensagem="Aguardando início da separação...",
                video_path=str(dest),
                video_info=video_info,
                takes=[],
                warnings=[])

    thread = threading.Thread(target=_run_demucs_job, args=(job_id, str(dest)), daemon=True)
    thread.start()

    return JSONResponse({"job_id": job_id, "video_info": video_info})


# ─────────────────────────────────────────────
#  ENDPOINTS — TAKES
# ─────────────────────────────────────────────

@app.post("/api/upload/takes/{job_id}")
async def upload_takes(job_id: str, files: list[UploadFile] = File(...)):
    _get_job(job_id)

    saved_dir = _job_dir(job_id) / "takes"
    saved_dir.mkdir(exist_ok=True)

    total_size = 0
    takes = []
    invalid = []

    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext != ".wav":
            invalid.append({"filename": f.filename, "reason": "Apenas arquivos .wav são aceitos"})
            continue

        dest = saved_dir / Path(f.filename).name
        size = 0
        upload_ok = True
        magic_validated = False
        try:
            with open(dest, "wb") as fp:
                while True:
                    chunk = await f.read(512 * 1024)
                    if not chunk:
                        break
                    if not magic_validated:
                        # S3: validate WAV magic bytes (RIFF....WAVE)
                        if len(chunk) < 12 or chunk[:4] != b"RIFF" or chunk[8:12] != b"WAVE":
                            upload_ok = False
                            break
                        magic_validated = True
                    size += len(chunk)
                    total_size += len(chunk)
                    if total_size > MAX_TAKES_BYTES:
                        dest.unlink(missing_ok=True)  # S2: clean up partial file
                        raise HTTPException(413, "Takes excedem o limite de 500MB total")
                    fp.write(chunk)
        except HTTPException:
            raise
        except Exception as exc:
            dest.unlink(missing_ok=True)
            invalid.append({"filename": f.filename, "reason": f"Erro ao salvar arquivo: {exc}"})
            continue
        if not upload_ok:
            # R2: file was opened for writing before magic-byte check broke out of the loop;
            # ensure the (possibly partial) file on disk is removed.
            try:
                dest.unlink(missing_ok=True)
            except Exception:
                pass
            invalid.append({"filename": f.filename, "reason": "Arquivo não é um WAV válido"})
            continue

        parsed = parse_take_filename(f.filename or "")
        if parsed is None:
            invalid.append({"filename": f.filename, "reason": "Nome fora do padrão PERSONAGEM_DUBLADOR_TIMECODE.wav"})
            continue

        parsed["filepath"] = str(dest)
        try:
            parsed["duration_ms"] = int(_sf.info(str(dest)).duration * 1000)
        except Exception:
            parsed["duration_ms"] = 0

        takes.append(parsed)

    takes.sort(key=lambda t: t["position_ms"])

    current_state = _load_state(job_id)
    existing = current_state.get("takes", [])
    existing_filenames = {t["filename"] for t in existing}
    merged = existing + [t for t in takes if t["filename"] not in existing_filenames]
    merged.sort(key=lambda t: t["position_ms"])

    _update_job(job_id, takes=merged, invalid_takes=invalid)

    by_char: dict[str, list] = {}
    for t in merged:
        by_char.setdefault(t["character"], []).append(t)

    return JSONResponse({
        "takes_added": len(takes),
        "takes_total": len(merged),
        "invalid": invalid,
        "by_character": by_char,
        "characters": sorted(by_char.keys()),
    })


@app.post("/api/upload/takes-folder/{job_id}")
async def upload_takes_folder(job_id: str, folder_path: str = Form(...)):
    _get_job(job_id)
    folder = Path(folder_path)
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(404, f"Pasta não encontrada: {folder_path}")

    result = parse_takes_folder(str(folder))
    takes = result["takes"]

    for t in takes:
        try:
            t["duration_ms"] = int(_sf.info(t["filepath"]).duration * 1000)
        except Exception:
            t["duration_ms"] = 0

    current_state = _load_state(job_id)
    existing = current_state.get("takes", [])
    existing_filenames = {t["filename"] for t in existing}
    merged = existing + [t for t in takes if t["filename"] not in existing_filenames]
    merged.sort(key=lambda t: t["position_ms"])

    _update_job(job_id, takes=merged, invalid_takes=[{"filename": f, "reason": "Padrão inválido"} for f in result["invalid"]])

    by_char: dict[str, list] = {}
    for t in merged:
        by_char.setdefault(t["character"], []).append(t)

    return JSONResponse({
        "takes_found": len(takes),
        "takes_total": len(merged),
        "invalid": result["invalid"],
        "by_character": by_char,
        "characters": sorted(by_char.keys()),
    })


# ─────────────────────────────────────────────
#  ENDPOINTS — TAKES (leitura)
# ─────────────────────────────────────────────

@app.get("/api/job/{job_id}/takes")
async def get_takes(job_id: str):
    state = _get_job(job_id)
    takes = state.get("takes", [])
    by_char: dict[str, list] = {}
    for t in takes:
        by_char.setdefault(t["character"], []).append(t)
    return JSONResponse({
        "takes": takes,
        "by_character": by_char,
        "total": len(takes),
        "characters": sorted(by_char.keys()),
        "invalid": state.get("invalid_takes", []),
    })


# ─────────────────────────────────────────────
#  ENDPOINTS — STATUS & PROCESS
# ─────────────────────────────────────────────

@app.get("/api/job/{job_id}/status")
async def get_job_status(job_id: str):
    return JSONResponse(_get_job(job_id))


class ProcessSettings(BaseModel):
    volume_me: float = 0.8
    volume_dialogos: float = 1.0
    lipsync_trim: bool = True
    muted_tracks: list[str] = []   # ["CHAR||ACTOR", ...]
    soloed_tracks: list[str] = []


@app.post("/api/job/{job_id}/process")
async def start_process(job_id: str, settings: ProcessSettings):
    state = _get_job(job_id)
    status = state.get("status", "")
    # T9: also block re-runs when pipeline already completed (prevents duplicate combos).
    if status in ("processando", "iniciando_demucs", "concluido"):
        raise HTTPException(409, "Job já foi processado ou está em andamento. Faça um novo upload de vídeo para reprocessar.")

    _update_job(job_id, status="processando", etapa="iniciando",
                percentual=0, mensagem="Iniciando pipeline...", warnings=[])

    thread = threading.Thread(
        target=_run_process_job,
        args=(job_id, settings.model_dump()),
        daemon=True,
    )
    thread.start()
    return JSONResponse({"job_id": job_id, "status": "iniciado"})


@app.get("/api/job/{job_id}/result")
async def get_result(job_id: str):
    state = _get_job(job_id)
    result_file = state.get("result_file")
    if not result_file:
        raise HTTPException(404, "Resultado ainda não disponível.")

    file_path = OUTPUTS_DIR / result_file
    if not file_path.exists():
        raise HTTPException(404, "Arquivo de resultado não encontrado.")

    media_type = "video/mp4" if result_file.endswith(".mp4") else "audio/wav"
    return FileResponse(str(file_path), media_type=media_type, filename=result_file)


class TakeEdit(BaseModel):
    filename: str
    position_ms: int | None = None
    duration_ms: int | None = None
    deleted: bool = False
    start_trim_ms: int | None = None
    source_file: str | None = None
    is_virtual: bool = False


@app.patch("/api/job/{job_id}/takes")
async def patch_takes(job_id: str, edits: list[TakeEdit]):
    state = _get_job(job_id)
    takes: list[dict] = state.get("takes", [])

    virtual_edits = [e for e in edits if e.is_virtual]
    normal_edits = [e for e in edits if not e.is_virtual]
    edit_map = {e.filename: e for e in normal_edits}

    # Frontend sends the COMPLETE current virtual list on every PATCH (state.virtualTakes
    # is the single source of truth). Drop any previously-persisted virtuals so we can
    # reapply the new set fresh — otherwise re-edits create duplicates and deletions
    # never take effect.
    takes = [t for t in takes if not t.get("is_virtual")]

    updated = []
    for take in takes:
        edit = edit_map.get(take["filename"])
        if edit is None:
            updated.append(take)
            continue
        if edit.deleted:
            continue
        t = dict(take)
        if edit.position_ms is not None:
            t["position_ms"] = edit.position_ms
        if edit.duration_ms is not None:
            t["duration_ms"] = edit.duration_ms
        if edit.start_trim_ms is not None:
            t["start_trim_ms"] = edit.start_trim_ms
        updated.append(t)

    resolved_virtuals: list[dict] = []
    for ve in virtual_edits:
        if ve.deleted:
            continue
        # Look up source in original takes first, then in already-resolved virtuals (chain cuts)
        source = next(
            (t for t in (takes + resolved_virtuals) if t["filename"] == ve.source_file),
            None,
        )
        if source is None:
            continue
        new_take = dict(source)
        new_take["filename"] = ve.filename
        new_take["position_ms"] = ve.position_ms if ve.position_ms is not None else source["position_ms"]
        new_take["duration_ms"] = ve.duration_ms if ve.duration_ms is not None else source.get("duration_ms", 0)
        new_take["start_trim_ms"] = ve.start_trim_ms or 0
        new_take["is_virtual"] = True
        # filepath always points back to the real audio file (inherited via source chain)
        resolved_virtuals.append(new_take)
        updated.append(new_take)

    updated.sort(key=lambda t: t["position_ms"])
    _update_job(job_id, takes=updated)

    return JSONResponse({"takes_updated": len(updated), "takes_total": len(updated)})


@app.post("/api/job/{job_id}/reset_edits")
async def reset_edits(job_id: str):
    """
    Restores all takes to their on-disk originals: drops virtuals, clears
    start_trim_ms, restores duration_ms from the WAV file, and resets
    position_ms to the timecode parsed from the filename.
    """
    state = _get_job(job_id)
    takes: list[dict] = state.get("takes", [])

    restored: list[dict] = []
    for t in takes:
        if t.get("is_virtual"):
            continue
        nt = dict(t)
        nt.pop("start_trim_ms", None)
        # Restore position from filename timecode (survives renames)
        parsed = parse_take_filename(nt.get("filename", ""))
        if parsed and parsed.get("position_ms") is not None:
            nt["position_ms"] = parsed["position_ms"]
        # Restore duration from file
        try:
            nt["duration_ms"] = int(_sf.info(nt["filepath"]).duration * 1000)
        except Exception:
            pass
        restored.append(nt)

    restored.sort(key=lambda t: t["position_ms"])
    _update_job(job_id, takes=restored)
    return JSONResponse({"takes_restored": len(restored)})


def _compute_peaks(audio_path: Path, bins: int) -> list[float]:
    """CPU-bound: read audio and compute normalized peak envelope. Runs in thread executor."""
    data, _ = _sf.read(str(audio_path), always_2d=True)
    mono = data.mean(axis=1).astype(_np.float32)
    total = len(mono)
    bins = max(10, min(bins, 2000))
    window = max(1, total // bins)
    # Vectorised peak extraction — pad to exact multiple, reshape, take column-max
    padded_len = bins * window
    if total < padded_len:
        mono = _np.pad(mono, (0, padded_len - total))
    else:
        mono = mono[:padded_len]
    peaks = _np.abs(mono).reshape(bins, window).max(axis=1)
    mx = peaks.max()
    if mx > 0:
        peaks = peaks / mx
    return peaks.tolist()


@app.get("/api/job/{job_id}/waveform/{filename}")
async def get_waveform_peaks(job_id: str, filename: str, bins: int = 300):
    state = _get_job(job_id)

    if filename == "__vocals__":
        audio_path = state.get("vocals_path")
        if not audio_path or not Path(audio_path).exists():
            raise HTTPException(404, "Vocals stem não encontrado")
        audio_path = Path(audio_path)
    else:
        takes = state.get("takes", [])
        take_entry = next((t for t in takes if t.get("filename") == filename), None)
        if take_entry and take_entry.get("filepath") and Path(take_entry["filepath"]).exists():
            audio_path = Path(take_entry["filepath"])
        else:
            audio_path = _job_dir(job_id) / "takes" / Path(filename).name
            if not audio_path.exists():
                raise HTTPException(404, f"Take não encontrado: {filename}")

    # ETag based on file mtime+size for HTTP caching (P4)
    stat = audio_path.stat()
    etag = hashlib.md5(f"{stat.st_mtime}-{stat.st_size}-{bins}".encode()).hexdigest()

    try:
        loop = asyncio.get_running_loop()
        peaks = await loop.run_in_executor(None, _compute_peaks, audio_path, bins)  # P1+P2
        response = JSONResponse({"peaks": peaks, "bins": len(peaks)})
        response.headers["ETag"] = f'"{etag}"'
        response.headers["Cache-Control"] = "public, max-age=3600"
        return response
    except Exception:
        logger.exception("Erro ao gerar waveform para %s", audio_path)
        raise HTTPException(500, "Erro ao processar waveform do áudio")


@app.get("/api/job/{job_id}/stems/me")
async def get_me_stem(job_id: str):
    state = _get_job(job_id)
    me_path = state.get("me_path")
    if not me_path or not Path(me_path).exists():
        raise HTTPException(404, "M&E stem não encontrado. Faça o upload do vídeo primeiro.")
    return FileResponse(str(me_path), media_type="audio/wav", filename="me_reference.wav")


@app.get("/api/job/{job_id}/stems/vocals")
async def get_vocals_stem(job_id: str):
    state = _get_job(job_id)
    vocals_path = state.get("vocals_path")
    if not vocals_path or not Path(vocals_path).exists():
        raise HTTPException(404, "Vocals stem não encontrado. Faça o upload do vídeo primeiro.")
    return FileResponse(str(vocals_path), media_type="audio/wav", filename="vocals_reference.wav")


class RenameTakeRequest(BaseModel):
    old_filename: str
    character: str
    actor: str
    timecode: str


@app.post("/api/job/{job_id}/rename-take")
async def rename_take(job_id: str, req: RenameTakeRequest):
    from audio_engine import parse_take_filename, analyze_audio as _aa, invalidate_lipsync_cache

    state = _get_job(job_id)
    takes_dir = _job_dir(job_id) / "takes"

    char = req.character.strip().upper()
    actor = req.actor.strip().upper()
    tc = req.timecode.strip()
    new_name = f"{char}_{actor}_{tc}.wav"

    old_path = takes_dir / Path(req.old_filename).name
    if not old_path.exists():
        raise HTTPException(404, f"Arquivo não encontrado: {req.old_filename}")

    new_path = takes_dir / new_name
    old_path.rename(new_path)
    invalidate_lipsync_cache(str(old_path))  # T10: stale cache entry for old path

    parsed = parse_take_filename(new_name)
    if parsed is None:
        new_path.rename(old_path)
        raise HTTPException(422, f"Novo nome ainda fora do padrão: {new_name}")

    parsed["filepath"] = str(new_path)
    try:
        info = _aa(str(new_path))
        parsed["duration_ms"] = int(info["duration"] * 1000)
    except Exception:
        parsed["duration_ms"] = 0

    current = state.get("takes", [])
    invalid = state.get("invalid_takes", [])

    # R1: remove the old take entry so the renamed take doesn't create a duplicate.
    current = [t for t in current if t["filename"] != Path(req.old_filename).name]
    current = sorted(current + [parsed], key=lambda t: t["position_ms"])

    invalid = [iv for iv in invalid if iv.get("filename") != req.old_filename]

    _update_job(job_id, takes=current, invalid_takes=invalid)

    by_char: dict[str, list] = {}
    for t in current:
        by_char.setdefault(t["character"], []).append(t)

    return JSONResponse({
        "take": parsed,
        "takes_total": len(current),
        "invalid_remaining": invalid,
        "by_character": by_char,
        "characters": sorted(by_char.keys()),
    })


@app.get("/api/job/{job_id}/combos")
async def get_combos(job_id: str):
    state = _get_job(job_id)
    takes = state.get("takes", [])
    if not takes:
        return JSONResponse({"total_combos": 0, "personagens": [], "combos": [], "groups": {}})

    groups = group_takes(takes)
    combos = generate_combos(groups)

    combos_list = []
    for i, combo in enumerate(combos):
        combos_list.append({
            "id": f"combo_{i}",
            "mix": combo,
            "label": " + ".join(f"{ch}→{ac}" for ch, ac in combo.items()),
            "output": combo_output_name(combo),
        })

    return JSONResponse({
        "total_combos": len(combos_list),
        "personagens": list(groups.keys()),
        "groups": {
            char: {"actors": list(actors.keys()), "takes_count": sum(len(v) for v in actors.values())}
            for char, actors in groups.items()
        },
        "combos": combos_list,
    })


@app.get("/api/job/{job_id}/results")
async def get_results(job_id: str):
    state = _get_job(job_id)
    combos_results = state.get("combos_results", [])
    return JSONResponse({
        "total": len(combos_results),
        "results": combos_results,
    })


@app.get("/api/job/{job_id}/results-zip")
async def get_results_zip(job_id: str):
    state = _get_job(job_id)
    combos_results = state.get("combos_results", [])
    mp4_files = [
        OUTPUTS_DIR / r["output_file"]
        for r in combos_results
        if r.get("output_file") and (OUTPUTS_DIR / r["output_file"]).exists()
    ]
    if not mp4_files:
        raise HTTPException(404, "Nenhum vídeo gerado ainda.")

    zip_path = OUTPUTS_DIR / f"{job_id}_results.zip"
    zip_tmp  = zip_path.with_suffix(".zip.tmp")

    def _build_zip():
        # T12: write to a temp file then atomically replace to avoid serving a
        # half-written archive when two requests arrive simultaneously.
        with zipfile.ZipFile(str(zip_tmp), "w", zipfile.ZIP_DEFLATED) as zf:
            for fp in mp4_files:
                zf.write(str(fp), fp.name)
        zip_tmp.replace(zip_path)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _build_zip)

    return FileResponse(str(zip_path), media_type="application/zip",
                        filename=f"dubbing_results_{job_id[:8]}.zip")


# ─────────────────────────────────────────────
#  ENDPOINTS LEGADOS (Dubbing Mixer simples)
# ─────────────────────────────────────────────

@app.post("/api/upload/me")
async def upload_me(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_AUDIO:
        raise HTTPException(400, f"Formato não suportado. Use: {', '.join(sorted(ALLOWED_AUDIO))}")
    file_id = str(uuid.uuid4())
    dest = UPLOADS_DIR / f"{file_id}{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        info = analyze_audio(str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(422, f"Não foi possível analisar o áudio M&E: {e}")
    return JSONResponse({"me_id": file_id, "filename": file.filename, "duration": info["duration"], "bpm": info["bpm"]})


@app.post("/api/upload/character")
async def upload_character(file: UploadFile = File(...), name: str = Form(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_AUDIO:
        raise HTTPException(400, "Formato não suportado.")
    name = (name or "").strip()[:100]
    if not name:
        raise HTTPException(400, "Nome do personagem é obrigatório")
    char_id = str(uuid.uuid4())
    dest = UPLOADS_DIR / f"{char_id}{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        info = analyze_audio(str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(422, str(e))
    return JSONResponse({"char_id": char_id, "name": name, "filename": file.filename, "duration": info["duration"]})


class MixRequest(BaseModel):
    me_id: str
    characters: list[dict]
    settings: dict
    notes: str = ""


@app.post("/api/mix")
async def start_mix(req: MixRequest):
    if not req.me_id:
        raise HTTPException(400, "Track M&E obrigatória")
    if not req.characters:
        raise HTTPException(400, "Pelo menos um personagem é necessário")

    def _resolve(fid):
        candidates = sorted(UPLOADS_DIR.glob(f"{fid}.*"))
        return candidates[0] if candidates else None

    me_path = _resolve(req.me_id)
    if not me_path:
        raise HTTPException(404, "Track M&E não encontrada.")

    job_id = str(uuid.uuid4())
    _update_job(job_id, status="iniciando", percentual=0, created_at=datetime.now().isoformat())

    def _run():
        try:
            _update_job(job_id, status="consultando_ia", percentual=30)
            char_names = [c.get("name", "") for c in req.characters]
            ai_params = suggest_mix_params(char_names, req.settings.get("me_description", ""), req.notes)

            merged = {**req.settings}
            if "ducking_intensity" not in merged:
                merged["ducking_intensity"] = ai_params.get("ducking_intensity", 0.7)

            _update_job(job_id, status="mixando", percentual=55)
            resolved = []
            for char in req.characters:
                cid = char.get("char_id", "")
                cp = _resolve(cid)
                if not cp:
                    raise AudioProcessingError(f"Track de '{char.get('name')}' não encontrada.")
                resolved.append({"path": str(cp), "name": char.get("name"), "volume": float(char.get("volume", 100))})

            out_id = str(uuid.uuid4())
            wav_path = str(OUTPUTS_DIR / f"{out_id}.wav")
            mp3_path = str(OUTPUTS_DIR / f"{out_id}.mp3")
            mix_dubbing(str(me_path), resolved, merged, wav_path)
            _update_job(job_id, status="exportando", percentual=85)
            mp3_ok = convert_wav_to_mp3(wav_path, mp3_path)

            analysis = {}
            try:
                analysis = analyze_audio(wav_path)
            except Exception:
                pass

            _update_job(job_id, status="concluido", percentual=100,
                        wav_filename=f"{out_id}.wav",
                        mp3_filename=f"{out_id}.mp3" if mp3_ok else None,
                        analysis=analysis, ai_params=ai_params, settings=merged)
        except AudioProcessingError as exc:
            _set_error(job_id, str(exc))
        except Exception:
            logger.exception("Erro no job simples %s", job_id)
            _set_error(job_id, "Falha inesperada.")

    threading.Thread(target=_run, daemon=True).start()
    return JSONResponse({"job_id": job_id})


# ─────────────────────────────────────────────
#  ENDPOINTS UTILITÁRIOS
# ─────────────────────────────────────────────

@app.get("/api/status/{job_id}")
async def get_status_legacy(job_id: str):
    return JSONResponse(_get_job(job_id))


@app.get("/api/history")
async def get_history():
    return JSONResponse(_load_history())


@app.get("/api/health")
async def health_check():
    return JSONResponse({"status": "ok"})


@app.get("/api/job/{job_id}/video")
async def stream_job_video(job_id: str):
    """Serve o vídeo original do job para o player de referência."""
    state = _get_job(job_id)
    video_path = state.get("video_path")
    if not video_path or not Path(video_path).exists():
        raise HTTPException(404, "Vídeo não encontrado para este job.")
    ext = Path(video_path).suffix.lower()
    _mt = {'.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
           '.avi': 'video/x-msvideo', '.webm': 'video/webm'}
    return FileResponse(str(video_path), media_type=_mt.get(ext, 'video/mp4'))


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    # N5: strip any path component to prevent traversal; only search flat OUTPUTS_DIR
    # and one level deep in JOBS_DIR takes/ subdirectories.
    safe = Path(filename).name
    if not safe or safe != filename.replace("/", "").replace("\\", ""):
        raise HTTPException(400, "Nome de arquivo inválido")
    # First check flat outputs dir (MP4/WAV exports)
    direct = OUTPUTS_DIR / safe
    if direct.exists():
        mt = "video/mp4" if safe.endswith(".mp4") else ("audio/mpeg" if safe.endswith(".mp3") else "audio/wav")
        return FileResponse(str(direct), media_type=mt, filename=safe)
    # Fallback: search takes/ subdirs only (audio takes served to transport player)
    for job_dir in JOBS_DIR.iterdir():
        candidate = job_dir / "takes" / safe
        if candidate.exists():
            return FileResponse(str(candidate), media_type="audio/wav", filename=safe)
    raise HTTPException(404, "Arquivo não encontrado")


@app.get("/")
async def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=False)
