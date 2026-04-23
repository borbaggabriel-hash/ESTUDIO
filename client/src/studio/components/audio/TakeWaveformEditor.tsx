import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { drawStaticWaveform } from "@studio/lib/audio/visualizer";

interface TakeWaveformEditorProps {
  audioUrl: string;
  durationSeconds: number;
  onTrim: (startSeconds: number, endSeconds: number) => void;
}

export function TakeWaveformEditor({ audioUrl, durationSeconds, onTrim }: TakeWaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(durationSeconds);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setIsPlaying(false));
    return () => {
      audio.pause();
      audio.remove();
    };
  }, [audioUrl]);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(decodedBuffer.getChannelData(0));
      } catch (err) {
        console.error("Failed to load audio for waveform", err);
      }
    };
    loadAudio();
  }, [audioUrl]);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    drawStaticWaveform({
      ctx,
      samples: audioBuffer,
      width,
      height,
      playheadPosition: currentTime / durationSeconds,
      color: "#22c55e",
      playedColor: "#3b82f6",
    });
  }, [audioBuffer, currentTime, durationSeconds]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = x / rect.width;
    const time = fraction * durationSeconds;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, [durationSeconds]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = x / rect.width;
    const time = fraction * durationSeconds;
    
    const distToStart = Math.abs(time - selectionStart);
    const distToEnd = Math.abs(time - selectionEnd);
    
    if (distToStart < distToEnd) {
      setIsDragging("start");
      setSelectionStart(time);
    } else {
      setIsDragging("end");
      setSelectionEnd(time);
    }
  }, [durationSeconds, selectionStart, selectionEnd]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    const time = fraction * durationSeconds;
    
    if (isDragging === "start") {
      setSelectionStart(Math.min(time, selectionEnd - 0.1));
    } else {
      setSelectionEnd(Math.max(time, selectionStart + 0.1));
    }
  }, [isDragging, durationSeconds, selectionStart, selectionEnd]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTrim = useCallback(async () => {
    setIsTrimming(true);
    try {
      await onTrim(selectionStart, selectionEnd);
    } finally {
      setIsTrimming(false);
    }
  }, [selectionStart, selectionEnd, onTrim]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-[80px] rounded-lg cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ background: "hsl(var(--muted))" }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0:00</span>
          <span>{formatTime(durationSeconds)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded flex items-center justify-center transition-colors"
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
            const value = parseFloat(e.target.value);
            if (audioRef.current) {
              audioRef.current.currentTime = value;
              setCurrentTime(value);
            }
          }}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-12 text-right">
          {formatTime(currentTime)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Início</label>
          <input
            type="number"
            value={selectionStart.toFixed(2)}
            onChange={(e) => setSelectionStart(parseFloat(e.target.value))}
            step={0.1}
            min={0}
            max={selectionEnd}
            className="w-full px-2 py-1 rounded text-xs"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
          <input
            type="number"
            value={selectionEnd.toFixed(2)}
            onChange={(e) => setSelectionEnd(parseFloat(e.target.value))}
            step={0.1}
            min={selectionStart}
            max={durationSeconds}
            className="w-full px-2 py-1 rounded text-xs"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          />
        </div>
      </div>

      <button
        onClick={handleTrim}
        disabled={isTrimming}
        className="w-full py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        {isTrimming ? "Cortando..." : `Cortar (${formatTime(selectionEnd - selectionStart)})`}
      </button>
    </div>
  );
}
