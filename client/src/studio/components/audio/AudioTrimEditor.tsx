import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@studio/components/ui/button";
import { Play, Pause, Scissors, X, RotateCcw } from "lucide-react";
import { drawStaticWaveform } from "@studio/lib/audio/visualizer";

interface AudioTrimEditorProps {
  audioUrl: string;
  durationSeconds: number;
  onSave: (startSeconds: number, endSeconds: number) => void;
  onCancel: () => void;
}

function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

export function AudioTrimEditor({ audioUrl, durationSeconds, onSave, onCancel }: AudioTrimEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(durationSeconds);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Audio element setup
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  // Load waveform data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!cancelled) setAudioBuffer(decoded.getChannelData(0));
        await ctx.close();
        audioCtxRef.current = null;
      } catch (err) {
        console.error("[AudioTrimEditor] Failed to load waveform", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close().catch(() => {});
    };
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
      trimStart: durationSeconds > 0 ? selectionStart / durationSeconds : 0,
      trimEnd: durationSeconds > 0 ? selectionEnd / durationSeconds : 1,
      showHandles: true,
    });
  }, [audioBuffer, currentTime, durationSeconds, selectionStart, selectionEnd]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCancel(); return; }
      if (e.key === "Enter") { onSave(selectionStart, selectionEnd); return; }
      if (e.key === " " && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectionStart, selectionEnd, isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime >= selectionEnd || audioRef.current.currentTime < selectionStart) {
        audioRef.current.currentTime = selectionStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, selectionStart, selectionEnd]);

  // Canvas interaction helpers
  const getTimeFromEvent = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return fraction * durationSeconds;
  }, [durationSeconds]);

  const getDragTarget = useCallback((time: number): "start" | "end" => {
    const distToStart = Math.abs(time - selectionStart);
    const distToEnd = Math.abs(time - selectionEnd);
    return distToStart <= distToEnd ? "start" : "end";
  }, [selectionStart, selectionEnd]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const time = getTimeFromEvent(e.clientX);
    const target = getDragTarget(time);
    setIsDragging(target);
    if (target === "start") setSelectionStart(Math.min(time, selectionEnd - 0.05));
    else setSelectionEnd(Math.max(time, selectionStart + 0.05));
  }, [getTimeFromEvent, getDragTarget, selectionStart, selectionEnd]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const time = getTimeFromEvent(e.clientX);
    if (isDragging === "start") setSelectionStart(Math.max(0, Math.min(time, selectionEnd - 0.05)));
    else setSelectionEnd(Math.min(durationSeconds, Math.max(time, selectionStart + 0.05)));
  }, [isDragging, getTimeFromEvent, durationSeconds, selectionStart, selectionEnd]);

  const handleMouseUp = useCallback(() => setIsDragging(null), []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    const time = getTimeFromEvent(e.clientX);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [isDragging, getTimeFromEvent]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const time = getTimeFromEvent(touch.clientX);
    const target = getDragTarget(time);
    setIsDragging(target);
    if (target === "start") setSelectionStart(Math.min(time, selectionEnd - 0.05));
    else setSelectionEnd(Math.max(time, selectionStart + 0.05));
  }, [getTimeFromEvent, getDragTarget, selectionStart, selectionEnd]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const time = getTimeFromEvent(touch.clientX);
    if (isDragging === "start") setSelectionStart(Math.max(0, Math.min(time, selectionEnd - 0.05)));
    else setSelectionEnd(Math.min(durationSeconds, Math.max(time, selectionStart + 0.05)));
  }, [isDragging, getTimeFromEvent, durationSeconds, selectionStart, selectionEnd]);

  const handleTouchEnd = useCallback(() => setIsDragging(null), []);

  const handleReset = useCallback(() => {
    setSelectionStart(0);
    setSelectionEnd(durationSeconds);
  }, [durationSeconds]);

  const selectionDuration = selectionEnd - selectionStart;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[800px] overflow-hidden glass-panel shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Editor de Take</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Arraste as alças amarelas para selecionar a região a manter</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} title="Fechar (Esc)">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Waveform canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-[150px] rounded-lg cursor-crosshair select-none"
              style={{ background: "hsl(var(--muted))", touchAction: "none" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "hsl(var(--muted)/0.8)" }}>
                <span className="text-xs text-muted-foreground animate-pulse">Carregando waveform…</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0:00.0</span>
              <span className="font-medium text-amber-500">
                {formatTimePrecise(selectionStart)} → {formatTimePrecise(selectionEnd)}
              </span>
              <span>{formatTimePrecise(durationSeconds)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={togglePlayPause} title="Play/Pause (Space)">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={durationSeconds}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = value;
                    setCurrentTime(value);
                  }
                }}
                className="w-full"
              />
            </div>
            <span className="text-sm text-muted-foreground w-20 text-right tabular-nums">
              {formatTimePrecise(currentTime)}
            </span>
          </div>

          {/* Selection inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Início (s)</label>
              <input
                type="number"
                value={selectionStart.toFixed(2)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setSelectionStart(Math.max(0, Math.min(v, selectionEnd - 0.05)));
                }}
                step={0.05}
                min={0}
                max={selectionEnd - 0.05}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fim (s)</label>
              <input
                type="number"
                value={selectionEnd.toFixed(2)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setSelectionEnd(Math.min(durationSeconds, Math.max(v, selectionStart + 0.05)));
                }}
                step={0.05}
                min={selectionStart + 0.05}
                max={durationSeconds}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Duração: <span className="font-medium text-foreground tabular-nums">{formatTimePrecise(selectionDuration)}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset} title="Resetar seleção" className="gap-1.5 text-xs">
                <RotateCcw className="w-3 h-3" /> Resetar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} title="Cancelar (Esc)">
                Cancelar
              </Button>
              <Button
                onClick={() => onSave(selectionStart, selectionEnd)}
                className="gap-2"
                disabled={selectionDuration < 0.05}
                title="Cortar e salvar (Enter)"
              >
                <Scissors className="w-4 h-4" />
                Cortar e Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
