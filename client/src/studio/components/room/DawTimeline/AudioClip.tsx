import { useRef, useEffect, useCallback, useState, memo, useMemo } from "react";
import type { Peak } from "./types";
import { drawBarWaveform, type WaveColor } from "./waveformUtils";

export interface ActorPalette {
  clipBg: string;
  border: string;
  glow: string;
  wave: WaveColor;
}

interface AudioClipProps {
  id: string;
  startTime: number;
  duration: number;
  zoom: number;
  voiceActorName: string;
  status: "approved" | "pending" | "recording";
  peaks?: Peak[];
  isSelected: boolean;
  isCutMode: boolean;
  trackHeight: number;
  actorPalette?: ActorPalette;
  onSelect: (id: string) => void;
  onSplit: (id: string, splitAt: number) => void;
  onTrimStart: (id: string, newStart: number, newDuration: number) => void;
  onTrimEnd: (id: string, newDuration: number) => void;
  isRemoveSilenceMode?: boolean;
  onRemoveSilence?: (id: string) => void;
}

const HANDLE_W = 10;
const MIN_DUR  = 0.05;

const DEFAULT_PALETTES: Record<string, ActorPalette> = {
  approved:  { clipBg: "linear-gradient(135deg,#0f1e3d,#091629)", border: "#1d4ed8", glow: "rgba(59,130,246,0.3)",  wave: "blue" },
  pending:   { clipBg: "linear-gradient(135deg,#1e1000,#160c00)", border: "#b45309", glow: "rgba(245,158,11,0.3)", wave: "yellow" },
  recording: { clipBg: "linear-gradient(135deg,#0a1e10,#061408)", border: "#16a34a", glow: "rgba(34,197,94,0.3)",  wave: "green" },
};

export function AudioClip({
  id, startTime, duration, zoom, voiceActorName,
  status, peaks, isSelected, isCutMode, trackHeight,
  actorPalette, onSelect, onSplit, onTrimStart, onTrimEnd,
  isRemoveSilenceMode = false, onRemoveSilence,
}: AudioClipProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cutLineX, setCutLineX]   = useState<number | null>(null);

  // Local visual state for trim preview (so dragging feels instant, API called only on release)
  const [visualStart, setVisualStart] = useState(startTime);
  const [visualDur,   setVisualDur]   = useState(duration);
  const [isTrimming,  setIsTrimming]  = useState(false);

  // Sync visual state when props change (e.g. after API commit)
  useEffect(() => { if (!isTrimming) { setVisualStart(startTime); setVisualDur(duration); } }, [startTime, duration, isTrimming]);

  // When NOT dragging a handle: derive width/position DIRECTLY from props so any
  // external update (optimistic trim, refetch) is visible in the same render.
  // When dragging: use local visual state for instant drag feedback.
  const activeDur   = isTrimming ? visualDur   : duration;
  const activeStart = isTrimming ? visualStart : startTime;
  const clipW   = Math.max(2, activeDur * zoom);
  const palette = actorPalette ?? DEFAULT_PALETTES[status] ?? DEFAULT_PALETTES.approved;
  const border  = isSelected
    ? "#e2e8f0"
    : status === "pending"
      ? "#b45309"
      : palette.border;

  const glowStr = isSelected
    ? `0 0 0 2px ${palette.glow}, 0 0 16px ${palette.glow}`
    : isHovered
      ? `0 0 12px ${palette.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
      : `0 0 6px ${palette.glow.replace("0.3", "0.15")}, inset 0 1px 0 rgba(255,255,255,0.04)`;

  // ── Extract RGB from palette.glow for the shimmer ─────────────────────────
  // palette.wave is always a CSS named color like "blue" — cannot set alpha on it.
  // palette.glow is always "rgba(r,g,b,a)" and holds the correct actor color.
  const shimmerRgb = useMemo(() => {
    const match = palette.glow.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? `${match[1]},${match[2]},${match[3]}` : "99,102,241";
  }, [palette.glow]);

  // ── Shimmer RAF — runs only when peaks are loading (empty) ────────────────
  const isLoading = !peaks || peaks.length === 0;
  useEffect(() => {
    if (!isLoading) return;
    let raf: number;
    const dpr = window.devicePixelRatio || 1;
    const animate = (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(animate); return; }
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (!W || !H) { raf = requestAnimationFrame(animate); return; }
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width  = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(animate); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const BARS  = 28;
      const cycle = (t % 1200) / 1200;
      for (let i = 0; i < BARS; i++) {
        const x     = (i / BARS) * W;
        const bw    = (W / BARS) * 0.6;
        const wave  = 0.5 + 0.5 * Math.sin((i / BARS) * Math.PI * 6 + cycle * Math.PI * 4);
        const shine = 0.5 + 0.5 * Math.sin(cycle * Math.PI * 2 - (i / BARS) * Math.PI * 4);
        const bh    = (0.1 + 0.5 * wave) * H * 0.8;
        const alpha = 0.06 + 0.1 * shine;
        ctx.fillStyle = `rgba(${shimmerRgb},${alpha.toFixed(3)})`;
        ctx.fillRect(x, (H - bh) / 2, bw, bh);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isLoading, shimmerRgb]);

  // ── Canvas waveform ──────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;
    if (!W || !H) return;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (peaks && peaks.length > 0) {
      drawBarWaveform(ctx, peaks, W, H, palette.wave);
    }
  }, [peaks, palette.wave]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, clipW]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(drawCanvas);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawCanvas]);

  // ── Pointer interactions ────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect   = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;

    // ── Remove silence mode ──
    if (isRemoveSilenceMode) {
      onRemoveSilence?.(id);
      return;
    }

    // ── Cut mode ──
    if (isCutMode) {
      const splitAt = localX / zoom;
      if (splitAt > MIN_DUR && splitAt < duration - MIN_DUR) {
        onSplit(id, splitAt);
      }
      return;
    }

    // ── Trim start handle (left edge) ──
    if (localX < HANDLE_W) {
      e.preventDefault();
      const startX    = e.clientX;
      const origStart = startTime;
      const origDur   = duration;
      let   latestStart = origStart;
      let   latestDur   = origDur;
      setIsTrimming(true);
      const onMove = (ev: PointerEvent) => {
        const delta    = (ev.clientX - startX) / zoom;
        latestStart    = Math.max(0, origStart + delta);
        latestDur      = Math.max(MIN_DUR, origDur - delta);
        setVisualStart(latestStart);
        setVisualDur(latestDur);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup",   onUp);
        setIsTrimming(false);
        onTrimStart(id, latestStart, latestDur);   // ← single API call on release
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup",   onUp);
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return;
    }

    // ── Trim end handle (right edge) ──
    if (localX > clipW - HANDLE_W) {
      e.preventDefault();
      const startX  = e.clientX;
      const origDur = duration;
      let   latestDur = origDur;
      setIsTrimming(true);
      const onMove = (ev: PointerEvent) => {
        latestDur = Math.max(MIN_DUR, origDur + (ev.clientX - startX) / zoom);
        setVisualDur(latestDur);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup",   onUp);
        setIsTrimming(false);
        onTrimEnd(id, latestDur);   // ← single API call on release
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup",   onUp);
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return;
    }

    onSelect(id);
  }, [id, isCutMode, isRemoveSilenceMode, onRemoveSilence, zoom, duration, startTime, onSplit, onSelect, onTrimStart, onTrimEnd, clipW]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCutMode) { setCutLineX(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setCutLineX(e.clientX - rect.left);
  }, [isCutMode]);

  const durationLabel = activeDur >= 1
    ? `${activeDur.toFixed(1)}s`
    : `${Math.round(activeDur * 1000)}ms`;
  const showDuration = clipW > 70;

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setIsHovered(false); setCutLineX(null); }}
      onMouseEnter={() => setIsHovered(true)}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute",
        left: activeStart * zoom,
        width: clipW,
        height: trackHeight - 4,
        top: 2,
        borderRadius: 6,
        background: palette.clipBg,
        border: `${isSelected ? 2 : 1.5}px solid ${border}`,
        boxShadow: glowStr,
        cursor: isRemoveSilenceMode ? "cell" : isCutMode ? "crosshair" : isTrimming ? "ew-resize" : "pointer",
        overflow: "hidden",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        willChange: "left, width",
        boxSizing: "border-box",
        transition: isTrimming ? "none" : "box-shadow .15s, border-color .15s",
        animation: isTrimming
          ? "none"
          : status === "pending"
            ? "dtl-clip-in .2s ease-out both, dtl-pending .9s ease-in-out infinite"
            : "dtl-clip-in .2s ease-out both",
      }}
    >
      {/* Label superior */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "3px 6px 3px 5px",
        flexShrink: 0,
        background: "rgba(0,0,0,0.35)",
        borderBottom: `1px solid ${border}22`,
        gap: 4,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: "#ffffff",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          letterSpacing: "0.02em", flex: 1,
        }}>
          {voiceActorName || (status === "pending" ? "Em revisão" : "Take")}
        </span>
        {showDuration && (
          <span style={{
            fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.85)",
            flexShrink: 0, fontVariantNumeric: "tabular-nums",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}>
            {durationLabel}
          </span>
        )}
      </div>

      {/* Canvas de waveform */}
      <canvas ref={canvasRef} style={{ flex: 1, width: "100%", display: "block", minHeight: 0 }} />

      {/* Indicador de corte (linha tracejada vertical) */}
      {isCutMode && cutLineX !== null && (
        <div style={{
          position: "absolute",
          left: cutLineX,
          top: 0, bottom: 0, width: 1,
          background: "rgba(239,68,68,0.9)",
          boxShadow: "0 0 6px #ef4444",
          pointerEvents: "none",
          borderLeft: "1px dashed rgba(239,68,68,0.6)",
        }} />
      )}

      {/* Handle esquerdo */}
      <div style={{
        position: "absolute", left: 0, top: 0, width: HANDLE_W, height: "100%",
        background: `linear-gradient(to right, ${border}55, transparent)`,
        cursor: isCutMode ? "crosshair" : "ew-resize",
      }} />
      {/* Handle direito */}
      <div style={{
        position: "absolute", right: 0, top: 0, width: HANDLE_W, height: "100%",
        background: `linear-gradient(to left, ${border}55, transparent)`,
        cursor: isCutMode ? "crosshair" : "ew-resize",
      }} />

      {/* Barra de status (pending = pulsante) */}
      {status === "pending" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: "#f59e0b",
          animation: "dtl-pulse .9s ease-in-out infinite",
        }} />
      )}
    </div>
  );
}

export const AudioClipMemo = memo(AudioClip);
