import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, Scissors, RotateCcw } from "lucide-react";
import { drawStaticWaveform } from "@studio/lib/audio/visualizer";

interface TakeWaveformEditorProps {
  audioUrl: string;
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
const HANDLE_GRAB_PX = 18; // pixels de tolerância para pegar a alça

export function TakeWaveformEditor({ audioUrl, durationSeconds, onTrim }: TakeWaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);
  const mouseDownPosRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(durationSeconds);
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);

  // Audio element — reload when URL changes (e.g. after trim with cache-bust param)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    // Set src after creation to avoid implicit caching of constructor URL
    audio.src = audioUrl;
    audio.load(); // force fresh fetch, bypasses browser cache
    audioRef.current = audio;
    setIsPlaying(false);
    setCurrentTime(0);
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setIsPlaying(false));
    return () => { audio.pause(); audio.src = ""; };
  }, [audioUrl]);

  // Waveform data
  useEffect(() => {
    let cancelled = false;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        const res = await fetch(audioUrl);
        const buf = await res.arrayBuffer();
        ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buf);
        if (!cancelled) setAudioBuffer(decoded.getChannelData(0));
        await ctx.close();
        ctx = null;
      } catch (e) {
        console.error("[TakeWaveformEditor] waveform load error", e);
      }
    })();
    return () => { cancelled = true; ctx?.close().catch(() => {}); };
  }, [audioUrl]);

  // DPR-aware canvas render
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    drawStaticWaveform({
      ctx,
      samples: audioBuffer,
      width: rect.width,
      height: rect.height,
      playheadPosition: durationSeconds > 0 ? currentTime / durationSeconds : 0,
      color: "#22c55e",
      playedColor: "#3b82f6",
      trimStart: durationSeconds > 0 ? trimStart / durationSeconds : 0,
      trimEnd: durationSeconds > 0 ? trimEnd / durationSeconds : 1,
      showHandles: true,
    });
  }, [audioBuffer, currentTime, durationSeconds, trimStart, trimEnd]);

  // Helpers
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
    const startX = (trimStart / durationSeconds) * rect.width;
    const endX = (trimEnd / durationSeconds) * rect.width;
    const distStart = Math.abs(x - startX);
    const distEnd = Math.abs(x - endX);
    // Retorna a alça mais próxima se dentro da tolerância
    if (distStart <= HANDLE_GRAB_PX && distStart <= distEnd) return "start";
    if (distEnd <= HANDLE_GRAB_PX) return "end";
    return null;
  }, [durationSeconds, trimStart, trimEnd]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseDownPosRef.current = e.clientX;
    const handle = getHandleAtClientX(e.clientX);
    draggingRef.current = handle;
  }, [getHandleAtClientX]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const frac = getFraction(e.clientX);
    const time = frac * durationSeconds;
    if (draggingRef.current === "start") {
      setTrimStart(Math.max(0, Math.min(time, trimEnd - MIN_SELECTION)));
    } else {
      setTrimEnd(Math.min(durationSeconds, Math.max(time, trimStart + MIN_SELECTION)));
    }
  }, [getFraction, durationSeconds, trimStart, trimEnd]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = draggingRef.current !== null;
    const downPos = mouseDownPosRef.current;
    draggingRef.current = null;
    mouseDownPosRef.current = null;

    // Clique curto sem drag → seek
    if (!wasDragging && downPos !== null && Math.abs(e.clientX - downPos) < 4) {
      const time = getFraction(e.clientX) * durationSeconds;
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  }, [getFraction, durationSeconds]);

  const handleMouseLeave = useCallback(() => { draggingRef.current = null; }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    mouseDownPosRef.current = touch.clientX;
    draggingRef.current = getHandleAtClientX(touch.clientX);
  }, [getHandleAtClientX]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!draggingRef.current) return;
    const frac = getFraction(e.touches[0].clientX);
    const time = frac * durationSeconds;
    if (draggingRef.current === "start") {
      setTrimStart(Math.max(0, Math.min(time, trimEnd - MIN_SELECTION)));
    } else {
      setTrimEnd(Math.min(durationSeconds, Math.max(time, trimStart + MIN_SELECTION)));
    }
  }, [getFraction, durationSeconds, trimStart, trimEnd]);

  const handleTouchEnd = useCallback(() => { draggingRef.current = null; }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < trimStart || audioRef.current.currentTime >= trimEnd) {
        audioRef.current.currentTime = trimStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, trimStart, trimEnd]);

  const handleTrim = useCallback(async () => {
    setIsTrimming(true);
    try {
      await onTrim(trimStart, trimEnd);
    } finally {
      setIsTrimming(false);
    }
  }, [trimStart, trimEnd, onTrim]);

  // Reset handles whenever durationSeconds changes (reflects new take duration after trim)
  useEffect(() => {
    setTrimStart(0);
    setTrimEnd(durationSeconds);
  }, [durationSeconds]);

  const handleReset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(durationSeconds);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [durationSeconds]);

  const selectionDuration = trimEnd - trimStart;

  return (
    <div className="flex flex-col gap-2">
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[80px] rounded-lg select-none"
          style={{ background: "hsl(var(--muted))", cursor: "col-resize", touchAction: "none" }}
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
          value={currentTime}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (audioRef.current) { audioRef.current.currentTime = v; setCurrentTime(v); }
          }}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">
          {fmtTime(currentTime)}
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
