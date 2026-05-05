import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, Scissors, RotateCcw } from "lucide-react";
import { drawStaticWaveform } from "@studio/lib/audio/visualizer";

interface TakeWaveformEditorProps {
  audioUrl: string;
  audioBlob?: Blob;
  durationSeconds: number;
  onTrim: (startSeconds: number, endSeconds: number) => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

const MIN_SELECTION = 0.1;
const HANDLE_GRAB_PX = 18;

export function TakeWaveformEditor({ audioUrl, audioBlob, durationSeconds, onTrim }: TakeWaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);
  const mouseDownPosRef = useRef<number | null>(null);

  // Refs that drive the rAF loop — no setState → no re-render on every frame
  const currentTimeRef = useRef(0);
  const trimStartRef = useRef(0);
  const trimEndRef = useRef(durationSeconds);
  const audioBufferRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);

  // State only for things that must trigger a React re-render (UI labels, buttons)
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(durationSeconds);
  const [isTrimming, setIsTrimming] = useState(false);
  const [waveformReady, setWaveformReady] = useState(false);

  // Keep refs in sync with state (state still drives labels; refs drive canvas)
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  // ── Loading animation RAF (runs when waveform is not yet ready) ────────────
  useEffect(() => {
    if (waveformReady) return;
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
      ctx.fillStyle = "#0a1117";
      ctx.fillRect(0, 0, W, H);
      const BARS  = 52;
      const cycle = (t % 1400) / 1400;
      for (let i = 0; i < BARS; i++) {
        const x   = (i / BARS) * W;
        const bw  = (W / BARS) * 0.58;
        const wave  = 0.5 + 0.5 * Math.sin((i / BARS) * Math.PI * 8 + cycle * Math.PI * 4);
        const shine = 0.5 + 0.5 * Math.sin(cycle * Math.PI * 2 - (i / BARS) * Math.PI * 3);
        const bh    = (0.15 + 0.55 * wave) * H * 0.85;
        const alpha = 0.07 + 0.13 * shine;
        ctx.fillStyle = `rgba(34,197,94,${alpha.toFixed(3)})`;
        ctx.fillRect(x, (H - bh) / 2, bw, bh);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [waveformReady]);

  // ── rAF draw loop ────────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const samples = audioBufferRef.current;
    if (!canvas || !samples) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStaticWaveform({
      ctx,
      samples,
      width: rect.width,
      height: rect.height,
      playheadPosition: durationSeconds > 0 ? currentTimeRef.current / durationSeconds : 0,
      color: "#22c55e",
      playedColor: "#3b82f6",
      trimStart: durationSeconds > 0 ? trimStartRef.current / durationSeconds : 0,
      trimEnd: durationSeconds > 0 ? trimEndRef.current / durationSeconds : 1,
      showHandles: true,
    });
  }, [durationSeconds]);

  const startRaf = useCallback(() => {
    if (rafRef.current !== null) return;
    const loop = () => { drawFrame(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    drawFrame(); // one final paint to show stopped position
  }, [drawFrame]);

  // ── Single fetch: decode waveform + reuse blob for audio playback ────────────
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    let actx: AudioContext | null = null;

    (async () => {
      try {
        let arrayBuf: ArrayBuffer;

        if (audioBlob) {
          // Blob provided directly — zero network, zero CORS
          arrayBuf = await audioBlob.arrayBuffer();
          if (cancelled) return;
          objectUrl = URL.createObjectURL(audioBlob);
        } else {
          // Fetch from server — use credentials for relative URLs only
          const isExternal = audioUrl.startsWith("http") || audioUrl.startsWith("blob:");
          const res = await fetch(audioUrl, isExternal ? {} : { credentials: "include" });
          if (!res.ok || cancelled) return;
          arrayBuf = await res.arrayBuffer();
          if (cancelled) return;
          const blob = new Blob([arrayBuf], { type: "audio/wav" });
          objectUrl = audioUrl.startsWith("blob:") ? audioUrl : URL.createObjectURL(blob);
        }

        // Audio element
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = objectUrl;
        audio.load();
        audioRef.current = audio;

        const onTimeUpdate = () => {
          currentTimeRef.current = audio.currentTime;
          setDisplayTime(audio.currentTime);
        };
        const onEnded = () => { setIsPlaying(false); stopRaf(); };
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);

        // Decode waveform from same ArrayBuffer (already in memory — no extra network)
        actx = new AudioContext();
        const decoded = await actx.decodeAudioData(arrayBuf.slice(0)); // slice to avoid detached buffer
        await actx.close();
        actx = null;
        if (cancelled) return;

        audioBufferRef.current = decoded.getChannelData(0);
        if (!cancelled) {
          setWaveformReady(true);
          drawFrame();
        }
      } catch (e) {
        console.error("[TakeWaveformEditor] load error", e);
      }
    })();

    // Reset state on new URL
    setIsPlaying(false);
    setWaveformReady(false);
    currentTimeRef.current = 0;
    setDisplayTime(0);

    return () => {
      cancelled = true;
      actx?.close().catch(() => {});
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
      // Only revoke URLs we created — never revoke the original blob URL passed as prop
      if (objectUrl && objectUrl !== audioUrl) URL.revokeObjectURL(objectUrl);
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      audioBufferRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, audioBlob]);

  // Redraw when trim handles or waveform ready changes (not on every currentTime)
  useEffect(() => { drawFrame(); }, [trimStart, trimEnd, waveformReady, drawFrame]);

  // ── Trim handle sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    setTrimStart(0);
    setTrimEnd(durationSeconds);
  }, [durationSeconds]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getFraction = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const getHandleAtClientX = useCallback((clientX: number): "start" | "end" | null => {
    const canvas = canvasRef.current;
    if (!canvas || durationSeconds <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const startX = (trimStartRef.current / durationSeconds) * rect.width;
    const endX = (trimEndRef.current / durationSeconds) * rect.width;
    const dStart = Math.abs(x - startX);
    const dEnd = Math.abs(x - endX);
    if (dStart <= HANDLE_GRAB_PX && dStart <= dEnd) return "start";
    if (dEnd <= HANDLE_GRAB_PX) return "end";
    return null;
  }, [durationSeconds]);

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseDownPosRef.current = e.clientX;
    draggingRef.current = getHandleAtClientX(e.clientX);
  }, [getHandleAtClientX]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const time = getFraction(e.clientX) * durationSeconds;
    if (draggingRef.current === "start") {
      const v = Math.max(0, Math.min(time, trimEndRef.current - MIN_SELECTION));
      setTrimStart(v);
    } else {
      const v = Math.min(durationSeconds, Math.max(time, trimStartRef.current + MIN_SELECTION));
      setTrimEnd(v);
    }
  }, [getFraction, durationSeconds]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = draggingRef.current !== null;
    const downPos = mouseDownPosRef.current;
    draggingRef.current = null;
    mouseDownPosRef.current = null;
    if (!wasDragging && downPos !== null && Math.abs(e.clientX - downPos) < 4) {
      const time = getFraction(e.clientX) * durationSeconds;
      if (audioRef.current) { audioRef.current.currentTime = time; currentTimeRef.current = time; setDisplayTime(time); }
    }
  }, [getFraction, durationSeconds]);

  const handleMouseLeave = useCallback(() => { draggingRef.current = null; }, []);

  // ── Touch handlers ───────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    mouseDownPosRef.current = t.clientX;
    draggingRef.current = getHandleAtClientX(t.clientX);
  }, [getHandleAtClientX]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!draggingRef.current) return;
    const time = getFraction(e.touches[0].clientX) * durationSeconds;
    if (draggingRef.current === "start") {
      setTrimStart(Math.max(0, Math.min(time, trimEndRef.current - MIN_SELECTION)));
    } else {
      setTrimEnd(Math.min(durationSeconds, Math.max(time, trimStartRef.current + MIN_SELECTION)));
    }
  }, [getFraction, durationSeconds]);

  const handleTouchEnd = useCallback(() => { draggingRef.current = null; }, []);

  // ── Playback ─────────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      stopRaf();
    } else {
      if (audio.currentTime < trimStartRef.current || audio.currentTime >= trimEndRef.current) {
        audio.currentTime = trimStartRef.current;
        currentTimeRef.current = trimStartRef.current;
      }
      // Optimistic — update UI immediately, revert on error
      setIsPlaying(true);
      startRaf();
      audio.play().catch(() => { setIsPlaying(false); stopRaf(); });
    }
  }, [isPlaying, startRaf, stopRaf]);

  const handleReset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(durationSeconds);
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    currentTimeRef.current = 0;
    setIsPlaying(false);
    setDisplayTime(0);
    stopRaf();
  }, [durationSeconds, stopRaf]);

  const handleTrim = useCallback(async () => {
    setIsTrimming(true);
    try {
      await onTrim(trimStartRef.current, trimEndRef.current);
    } finally {
      setIsTrimming(false);
    }
  }, [onTrim]);

  const selectionDuration = trimEnd - trimStart;

  return (
    <div className="flex flex-col gap-2" style={{ position: "relative" }}>
      {/* Trim overlay — blocks interaction while API call is in-flight */}
      {isTrimming && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "hsl(var(--background) / 0.55)",
            backdropFilter: "blur(2px)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "all",
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
            <div className="w-4 h-4 rounded-full animate-spin border-2 border-muted border-t-primary" />
            Cortando…
          </div>
        </div>
      )}

      {/* Canvas — always visible; loading RAF draws shimmer until real peaks arrive */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[80px] rounded-lg select-none"
          style={{
            background: "#0a1117",
            cursor: waveformReady ? "col-resize" : "default",
            touchAction: "none",
            display: "block",
            transition: "opacity .2s",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-muted-foreground">0:00.0</span>
          <span className="text-amber-500 font-medium tabular-nums">
            {fmtTime(trimStart)} → {fmtTime(trimEnd)}
            <span className="text-muted-foreground ml-1">({fmtTime(selectionDuration)})</span>
          </span>
          <span className="text-muted-foreground">{fmtTime(durationSeconds)}</span>
        </div>
      </div>

      {/* Playback */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className="w-7 h-7 rounded flex items-center justify-center transition-colors shrink-0"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground) / 0.75)" }}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={durationSeconds}
          step={0.01}
          value={displayTime}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            currentTimeRef.current = v;
            setDisplayTime(v);
            if (audioRef.current) { audioRef.current.currentTime = v; }
          }}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">
          {fmtTime(displayTime)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-none flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
          title="Resetar corte"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          onClick={handleTrim}
          disabled={isTrimming || selectionDuration < MIN_SELECTION}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          <Scissors className="w-3 h-3" />
          {isTrimming ? "Cortando…" : `Cortar (manter ${fmtTime(selectionDuration)})`}
        </button>
      </div>
    </div>
  );
}
