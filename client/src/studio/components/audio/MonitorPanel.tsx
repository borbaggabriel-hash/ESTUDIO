import { useEffect, useRef } from "react";
import type { MicrophoneState } from "@studio/lib/audio/microphoneManager";
import { getTimeDomainData } from "@studio/lib/audio/microphoneManager";
import type { RecordingResult, RecordingStatus } from "@studio/lib/audio/recordingEngine";
import {
  computeRMS,
  rmsToMeterLevel,
  drawOscilloscope,
  drawStaticWaveform,
  drawVuMeter,
} from "@studio/lib/audio/visualizer";

interface MonitorPanelProps {
  micState: MicrophoneState | null;
  recordingStatus: RecordingStatus;
  lastRecording: RecordingResult | null;
  previewAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  savedSamples?: Float32Array | null;
  compact?: boolean;
}

function scaleCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.scale(dpr, dpr);
  return { w, h };
}

export default function MonitorPanel({
  micState,
  recordingStatus,
  lastRecording,
  previewAudioRef,
  savedSamples,
  compact,
}: MonitorPanelProps) {
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const peakRef = useRef<number>(0);
  const peakDecayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPeakLevelRef = useRef<number>(0);
  const peakHoldFramesRef = useRef<number>(0);

  useEffect(() => {
    const waveCanvas = waveCanvasRef.current;
    const vuCanvas = vuCanvasRef.current;
    if (!waveCanvas || !vuCanvas) return;

    const waveCtx = waveCanvas.getContext("2d")!;
    const vuCtx = vuCanvas.getContext("2d")!;

    const { w: wW, h: wH } = scaleCanvas(waveCanvas, waveCtx);
    const { w: vW, h: vH } = scaleCanvas(vuCanvas, vuCtx);

    const PEAK_HOLD_FRAMES = 90;
    const PEAK_DECAY = 0.012;

    function drawFrame() {
      rafRef.current = requestAnimationFrame(drawFrame);

      if (recordingStatus === "recording" && micState) {
        const timeDomain = getTimeDomainData(micState);

        drawOscilloscope({
          ctx: waveCtx,
          timeDomainData: timeDomain,
          width: wW,
          height: wH,
          color: "#ef4444",
        });

        const rms = computeRMS(timeDomain);
        const level = rmsToMeterLevel(rms);

        if (level >= lastPeakLevelRef.current) {
          lastPeakLevelRef.current = level;
          peakHoldFramesRef.current = PEAK_HOLD_FRAMES;
        } else {
          if (peakHoldFramesRef.current > 0) {
            peakHoldFramesRef.current -= 1;
          } else {
            lastPeakLevelRef.current = Math.max(
              0,
              lastPeakLevelRef.current - PEAK_DECAY
            );
          }
        }

        drawVuMeter({
          ctx: vuCtx,
          level,
          peak: lastPeakLevelRef.current,
          width: vW,
          height: vH,
        });
      } else if (
        (recordingStatus === "recorded" || recordingStatus === "previewing") &&
        lastRecording
      ) {
        const audio = previewAudioRef.current;
        const playhead =
          recordingStatus === "previewing" && audio && audio.duration > 0
            ? audio.currentTime / audio.duration
            : -1;

        drawStaticWaveform({
          ctx: waveCtx,
          samples: lastRecording.samples,
          width: wW,
          height: wH,
          playheadPosition: playhead,
          color: "#22c55e",
          playedColor: "#3b82f6",
        });

        vuCtx.clearRect(0, 0, vW, vH);
      } else if (
        recordingStatus === "idle" &&
        savedSamples &&
        savedSamples.length > 0
      ) {
        drawStaticWaveform({
          ctx: waveCtx,
          samples: savedSamples,
          width: wW,
          height: wH,
          color: "#22c55e",
        });

        vuCtx.clearRect(0, 0, vW, vH);
      } else {
        waveCtx.clearRect(0, 0, wW, wH);
        vuCtx.clearRect(0, 0, vW, vH);

        if (recordingStatus === "idle" && micState) {
          const timeDomain = getTimeDomainData(micState);
          const rms = computeRMS(timeDomain);
          const level = rmsToMeterLevel(rms);

          if (level >= lastPeakLevelRef.current) {
            lastPeakLevelRef.current = level;
            peakHoldFramesRef.current = PEAK_HOLD_FRAMES;
          } else {
            if (peakHoldFramesRef.current > 0) {
              peakHoldFramesRef.current -= 1;
            } else {
              lastPeakLevelRef.current = Math.max(
                0,
                lastPeakLevelRef.current - PEAK_DECAY
              );
            }
          }

          drawOscilloscope({
            ctx: waveCtx,
            timeDomainData: timeDomain,
            width: wW,
            height: wH,
            color: "#3f3f46",
          });

          drawVuMeter({
            ctx: vuCtx,
            level,
            peak: lastPeakLevelRef.current,
            width: vW,
            height: vH,
          });
        }
      }
    }

    drawFrame();

    return () => {
      cancelAnimationFrame(rafRef.current);
      waveCtx.clearRect(0, 0, wW, wH);
      vuCtx.clearRect(0, 0, vW, vH);
    };
  }, [micState, recordingStatus, lastRecording, savedSamples]);

  return (
    <div className={compact ? "flex items-center h-full w-full" : "flex items-center gap-1.5 h-full rounded-lg p-1 bg-neutral-900 border border-white/15 shadow-inner"}>
      <canvas
        ref={waveCanvasRef}
        className={compact ? "flex-1 h-full rounded opacity-80" : "flex-1 h-12 rounded opacity-90"}
        style={{ imageRendering: "pixelated" }}
        data-testid="canvas-waveform"
      />
      <canvas
        ref={vuCanvasRef}
        className="w-4 h-12 rounded-sm flex-shrink-0"
        style={{ imageRendering: "pixelated", display: compact ? "none" : undefined }}
        data-testid="canvas-vu-meter"
      />
    </div>
  );
}
