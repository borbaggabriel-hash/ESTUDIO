// Utilitários de renderização de waveform — compartilhados entre AudioClip, Master e Live

import type { Peak } from "./types";

// ── Esquemas de cor por contexto ───────────────────────────────────────────────
export const WAVE_COLORS = {
  blue:   { dark: "#0c1d40", mid: "#1d4ed8", bright: "#60a5fa", rim: "#bfdbfe", base: "#3b82f6" },
  green:  { dark: "#0a1e10", mid: "#15803d", bright: "#4ade80", rim: "#bbf7d0", base: "#22c55e" },
  yellow: { dark: "#1e1000", mid: "#b45309", bright: "#fbbf24", rim: "#fde68a", base: "#f59e0b" },
  purple: { dark: "#150b2a", mid: "#6d28d9", bright: "#a78bfa", rim: "#ddd6fe", base: "#8b5cf6" },
  rose:   { dark: "#1e0a12", mid: "#be185d", bright: "#fb7185", rim: "#fecdd3", base: "#f43f5e" },
} as const;
export type WaveColor = keyof typeof WAVE_COLORS;

// ── Suavização gaussiana 5-tap ─────────────────────────────────────────────────
export function smoothPeaks(raw: Peak[]): Peak[] {
  const n = raw.length;
  if (n < 5) return raw;
  const w = [0.06, 0.24, 0.4, 0.24, 0.06];
  const out: Peak[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let mn = 0, mx = 0;
    for (let k = 0; k < 5; k++) {
      const idx = Math.min(n - 1, Math.max(0, i + k - 2));
      mn += raw[idx].min * w[k];
      mx += raw[idx].max * w[k];
    }
    out[i] = { min: mn, max: mx };
  }
  return out;
}

// ── Interpolação linear entre bins de pico ─────────────────────────────────────
export function lerpPeak(arr: Peak[], pos: number): Peak {
  if (!arr.length) return { min: 0, max: 0 };
  const lo = Math.max(0, Math.min(arr.length - 1, Math.floor(pos)));
  const hi = Math.min(arr.length - 1, lo + 1);
  const f  = pos - Math.floor(pos);
  return {
    min: arr[lo].min * (1 - f) + (arr[hi]?.min ?? arr[lo].min) * f,
    max: arr[lo].max * (1 - f) + (arr[hi]?.max ?? arr[lo].max) * f,
  };
}

// ── Calcula picos a partir de Float32Array (com suavização) ────────────────────
export function computePeaks(samples: Float32Array, numBins: number): Peak[] {
  if (!samples.length || numBins <= 0) return [];
  const binSize = samples.length / numBins;
  const raw: Peak[] = [];
  for (let i = 0; i < numBins; i++) {
    const start = Math.floor(i * binSize);
    const end   = Math.min(samples.length, Math.ceil((i + 1) * binSize));
    let mn = 0, mx = 0;
    for (let j = start; j < end; j++) {
      if (samples[j] < mn) mn = samples[j];
      if (samples[j] > mx) mx = samples[j];
    }
    raw.push({ min: mn, max: mx });
  }
  return smoothPeaks(raw);
}

// ── Renderiza waveform com gradiente estilo Logic Pro ──────────────────────────
// peaks: array de picos (qualquer tamanho)
// sx: x inicial no canvas
// pw: largura em pixels a renderizar
// midY: centro vertical
// halfH: metade da altura máxima
// colorKey: esquema de cor
export function drawWaveformGradient(
  ctx: CanvasRenderingContext2D,
  peaks: Peak[],
  sx: number,
  pw: number,
  midY: number,
  halfH: number,
  colorKey: WaveColor,
  buildScale = 1,
): void {
  if (!peaks.length || pw <= 0) return;
  const c = WAVE_COLORS[colorKey];
  const h = halfH * buildScale;

  const getPeak = (x: number): Peak => {
    if (peaks.length === 1) return peaks[0];
    const pos = (x / Math.max(1, pw - 1)) * (peaks.length - 1);
    return lerpPeak(peaks, pos);
  };

  // Polígono preenchido (superior + inferior)
  ctx.beginPath();
  ctx.moveTo(sx, midY - getPeak(0).max * h);
  for (let i = 1; i < pw; i++) ctx.lineTo(sx + i, midY - getPeak(i).max * h);
  for (let i = pw - 1; i >= 0; i--) ctx.lineTo(sx + i, midY - getPeak(i).min * h);
  ctx.closePath();

  const fg = ctx.createLinearGradient(0, midY - h, 0, midY + h);
  fg.addColorStop(0,    c.dark);
  fg.addColorStop(0.28, c.mid);
  fg.addColorStop(0.5,  c.bright);
  fg.addColorStop(0.72, c.mid);
  fg.addColorStop(1,    c.dark);
  ctx.fillStyle = fg;
  ctx.fill();

  // Contorno superior
  ctx.strokeStyle = c.rim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, midY - getPeak(0).max * h);
  for (let i = 1; i < pw; i++) ctx.lineTo(sx + i, midY - getPeak(i).max * h);
  ctx.stroke();

  // Contorno inferior
  ctx.strokeStyle = c.base;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, midY - getPeak(0).min * h);
  for (let i = 1; i < pw; i++) ctx.lineTo(sx + i, midY - getPeak(i).min * h);
  ctx.stroke();
}

// ── Barra-por-pixel a partir de Peak[] — mesmo estilo visual do TakeWaveformEditor ──
// Usado pelo AudioClip para que a forma de onda na timeline e no editor de take
// tenham aparência idêntica.
export function drawBarWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: Peak[],
  W: number,
  H: number,
  colorKey: WaveColor,
): void {
  if (!peaks.length || !W || !H) return;
  const c    = WAVE_COLORS[colorKey];
  const midY = H / 2;
  const halfH = H * 0.44;

  // Barra de fundo (track escura) para contraste
  ctx.fillStyle = c.dark;
  ctx.fillRect(0, Math.round(midY - halfH), W, Math.round(halfH * 2));

  ctx.fillStyle = c.base;
  for (let x = 0; x < W; x++) {
    const pos  = (x / Math.max(1, W - 1)) * (peaks.length - 1);
    const pk   = lerpPeak(peaks, pos);
    const top  = midY - pk.max * halfH;
    const bot  = midY - pk.min * halfH;
    ctx.fillRect(x, top, 1, Math.max(1, bot - top));
  }
}
