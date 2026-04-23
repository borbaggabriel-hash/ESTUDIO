import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@studio/components/ui/button";
import { Play, Pause, Scissors, X } from "lucide-react";
import { drawStaticWaveform } from "@studio/lib/audio/visualizer";

interface AudioTrimEditorProps {
  audioUrl: string;
  durationSeconds: number;
  onSave: (startSeconds: number, endSeconds: number) => void;
  onCancel: () => void;
}

export function AudioTrimEditor({ audioUrl, durationSeconds, onSave, onCancel }: AudioTrimEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(durationSeconds);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);

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
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer.getChannelData(0));
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

  const handleSave = useCallback(() => {
    onSave(selectionStart, selectionEnd);
  }, [onSave, selectionStart, selectionEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[800px] overflow-hidden glass-panel shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-semibold text-foreground">Editor de Take</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={700}
              height={150}
              className="w-full h-[150px] rounded-lg cursor-crosshair"
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0:00</span>
              <span>{formatTime(durationSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePlayPause}>
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
            <span className="text-sm text-muted-foreground w-20 text-right">
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Início</label>
              <input
                type="number"
                value={selectionStart.toFixed(2)}
                onChange={(e) => setSelectionStart(parseFloat(e.target.value))}
                step={0.1}
                min={0}
                max={selectionEnd}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fim</label>
              <input
                type="number"
                value={selectionEnd.toFixed(2)}
                onChange={(e) => setSelectionEnd(parseFloat(e.target.value))}
                step={0.1}
                min={selectionStart}
                max={durationSeconds}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Duração selecionada: {formatTime(selectionEnd - selectionStart)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="gap-2">
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
