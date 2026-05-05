// ── Detector de regiões com áudio (removedor de silêncio) ────────────────────

const FRAME_MS       = 10;   // tamanho de frame em ms para análise de amplitude
const MIN_REGION_SEC = 0.1; // regiões menores que 100ms são descartadas

export interface AudioRegion {
  /** Início em segundos, relativo ao início do AudioBuffer */
  start: number;
  /** Fim em segundos, relativo ao início do AudioBuffer */
  end: number;
}

export interface SilenceDetectorOptions {
  thresholdDb?:  number; // default -40 dB
  preAttackSec?: number; // default 0.08 s — preserva o onset do áudio
  postTailSec?:  number; // default 0.50 s — preserva a cauda após o áudio
}

/**
 * Analisa um AudioBuffer e retorna os segmentos com áudio acima do limiar.
 * Aplica pre-attack e cauda configurados em cada região detectada.
 * Regiões adjacentes separadas por menos que postTailSec são mescladas.
 */
export function detectAudioRegions(
  audioBuffer: AudioBuffer,
  opts: SilenceDetectorOptions = {},
): AudioRegion[] {
  const {
    thresholdDb  = -40,
    preAttackSec = 0.08,
    postTailSec  = 0.5,
  } = opts;

  const sampleRate = audioBuffer.sampleRate;
  const length     = audioBuffer.length;
  const data       = audioBuffer.getChannelData(0);
  const threshold  = 10 ** (thresholdDb / 20);

  const frameSize  = Math.max(1, Math.round(sampleRate * FRAME_MS / 1000));
  const numFrames  = Math.ceil(length / frameSize);
  const isAudio    = new Uint8Array(numFrames);

  // 1. Detecta frames com amplitude pico acima do limiar
  for (let f = 0; f < numFrames; f++) {
    const s = f * frameSize;
    const e = Math.min(s + frameSize, length);
    for (let i = s; i < e; i++) {
      if (Math.abs(data[i]) >= threshold) { isAudio[f] = 1; break; }
    }
  }

  // 2. Expande cada frame ativo pelo pre-attack (para trás) e cauda (para frente)
  const preFrames  = Math.ceil(preAttackSec / (FRAME_MS / 1000));
  const postFrames = Math.ceil(postTailSec  / (FRAME_MS / 1000));
  const expanded   = new Uint8Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    if (!isAudio[f]) continue;
    const from = Math.max(0, f - preFrames);
    const to   = Math.min(numFrames - 1, f + postFrames);
    for (let g = from; g <= to; g++) expanded[g] = 1;
  }

  // 3. Agrupa frames contíguos em regiões
  const regions: AudioRegion[] = [];
  let regionStart = -1;

  for (let f = 0; f <= numFrames; f++) {
    const on = f < numFrames ? expanded[f] : 0;
    if (on && regionStart < 0) {
      regionStart = f;
    } else if (!on && regionStart >= 0) {
      regions.push({
        start: (regionStart * frameSize) / sampleRate,
        end:   Math.min((f * frameSize) / sampleRate, audioBuffer.duration),
      });
      regionStart = -1;
    }
  }

  // 4. Descarta regiões muito curtas (artefatos, pops isolados)
  return regions.filter(r => r.end - r.start >= MIN_REGION_SEC);
}

/**
 * Formata um tempo em segundos como HH:MM:SS.
 * Exemplos: 0 → "00:00:00", 90 → "00:01:30", 3723 → "01:02:03"
 */
export function formatTimecode(totalSeconds: number): string {
  const t  = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
