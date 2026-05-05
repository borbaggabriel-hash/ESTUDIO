import { useRef, useEffect, useCallback } from "react";
import { formatTimecodeShort } from "@studio/lib/timecode";

interface TimeRulerProps {
  videoDuration: number;
  videoTime: number;
  zoom: number;
  scrollLeft: number;
  width: number;
  onSeek: (t: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const RULER_H = 28;

export function TimeRuler({ videoDuration, videoTime, zoom, scrollLeft, width, onSeek, videoRef }: TimeRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Refs: updated every render, read by the stable RAF loop ─────────────
  const videoTimeRef   = useRef(videoTime);
  const zoomRef        = useRef(zoom);
  const scrollLeftRef  = useRef(scrollLeft);
  const videoDurRef    = useRef(videoDuration);

  videoTimeRef.current  = videoTime;
  zoomRef.current       = zoom;
  scrollLeftRef.current = scrollLeft;
  videoDurRef.current   = videoDuration;

  // ── draw — STABLE (empty deps). All values come from refs. ──────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read live values from refs every frame
    const z  = zoomRef.current;
    const sl = scrollLeftRef.current;
    // Prefer video.currentTime for sub-4Hz accuracy (true 60fps position)
    const vt = videoRef?.current?.currentTime ?? videoTimeRef.current;

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

    ctx.fillStyle = "#060810";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1e2640";
    ctx.fillRect(0, H - 1, W, 1);

    const secondsVisible = W / z;
    let step = 1;
    for (const c of [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) {
      if ((secondsVisible / c) < 60) { step = c; break; }
    }
    const subStep  = step / 5;
    const tStart   = sl / z;
    const tEnd     = tStart + secondsVisible + step;
    const subFirst = Math.floor(tStart / subStep) * subStep;

    ctx.strokeStyle = "#1a2035";
    ctx.lineWidth = 1;
    for (let t = subFirst; t <= tEnd; t += subStep) {
      const x = t * z - sl;
      if (x < 0 || x > W) continue;
      ctx.beginPath(); ctx.moveTo(x, H - 5); ctx.lineTo(x, H - 1); ctx.stroke();
    }

    ctx.font      = `600 9px 'JetBrains Mono', 'Fira Code', ui-monospace, monospace`;
    ctx.textAlign = "left";
    const first   = Math.floor(tStart / step) * step;
    for (let t = first; t <= tEnd; t += step) {
      const x = t * z - sl;
      if (x < -50 || x > W + 50) continue;
      ctx.strokeStyle = "#2d3a52"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, H * 0.25); ctx.lineTo(x, H - 1); ctx.stroke();
      if (x >= 0) { ctx.fillStyle = "#64748b"; ctx.fillText(formatTimecodeShort(t), x + 3, 11); }
    }

    // Playhead — reads live video.currentTime if available
    const px = vt * z - sl;
    if (px >= 0 && px <= W) {
      ctx.save();
      ctx.shadowColor = "#ff3b30"; ctx.shadowBlur = 8;
      ctx.strokeStyle = "#ff3b30"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, H); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#ff3b30";
      ctx.beginPath(); ctx.moveTo(px - 6, 0); ctx.lineTo(px + 6, 0); ctx.lineTo(px, 10);
      ctx.closePath(); ctx.fill();
    }
  }, []); // ← EMPTY DEPS: never recreated, never restarts RAF

  // ── Single eternal RAF loop — started once, never restarted ─────────────
  useEffect(() => {
    let raf: number;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const zoomSnap    = zoomRef;
  const scrollSnap  = scrollLeftRef;
  const durSnap     = videoDurRef;
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left + scrollSnap.current;
    const t    = Math.max(0, Math.min(durSnap.current, x / zoomSnap.current));
    onSeek(t);
  }, [onSeek, scrollSnap, zoomSnap, durSnap]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: RULER_H, display: "block", cursor: "pointer", flexShrink: 0 }}
      onClick={handleClick}
    />
  );
}
