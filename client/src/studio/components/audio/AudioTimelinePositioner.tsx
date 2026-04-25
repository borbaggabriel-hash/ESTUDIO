import { useRef, useCallback, useEffect, useState } from "react";

interface AudioTimelinePositionerProps {
  videoDuration: number;
  audioDuration: number;
  startTimeSeconds: number;
  onChange: (newStart: number) => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

const TICK_COUNT = 5;
const BUFFER_RATIO = 0.25; // 25% of audio on each side

export function AudioTimelinePositioner({
  videoDuration,
  audioDuration,
  startTimeSeconds,
  onChange,
}: AudioTimelinePositionerProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastClientXRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);

  // --- Window geometry --------------------------------------------------
  // The rail always shows a window of `windowDuration = 1.5 × audioDuration`
  // so the take block fills ~66% of the rail with 25% buffer on each side.
  const windowDuration = audioDuration > 0
    ? Math.min(1.5 * audioDuration, videoDuration)
    : videoDuration;

  const maxOffset = Math.max(0, videoDuration - audioDuration);

  const windowStart = audioDuration > 0
    ? Math.max(0, Math.min(startTimeSeconds - BUFFER_RATIO * audioDuration, videoDuration - windowDuration))
    : 0;

  // Block position within the window
  const blockLeftPct = windowDuration > 0
    ? ((startTimeSeconds - windowStart) / windowDuration) * 100
    : 0;
  const blockWidthPct = windowDuration > 0
    ? (audioDuration / windowDuration) * 100
    : 66.67;

  // --- Drag handlers ----------------------------------------------------
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      lastClientXRef.current = e.clientX;
      isDraggingRef.current = true;
      setIsDragging(true);
      document.documentElement.style.cursor = "ew-resize";
      document.documentElement.style.userSelect = "none";
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const rail = railRef.current;
      if (!rail) return;
      const deltaX = e.clientX - lastClientXRef.current;
      lastClientXRef.current = e.clientX;
      const deltaSeconds = (deltaX / rail.getBoundingClientRect().width) * windowDuration;
      onChange(Math.max(0, Math.min(maxOffset, startTimeSeconds + deltaSeconds)));
    },
    [windowDuration, startTimeSeconds, maxOffset, onChange],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    document.documentElement.style.cursor = "";
    document.documentElement.style.userSelect = "";
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
    };
  }, []);

  // --- Ticks ------------------------------------------------------------
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const pct = (i / (TICK_COUNT - 1)) * 100;
    const t = windowStart + (i / (TICK_COUNT - 1)) * windowDuration;
    return { t, pct };
  });

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
          Posição na timeline
        </span>
        <span
          className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded"
          style={{
            background: "hsl(var(--primary) / 0.12)",
            color: "hsl(var(--primary))",
          }}
        >
          {fmtTime(startTimeSeconds)} → {fmtTime(Math.min(startTimeSeconds + audioDuration, videoDuration))}
        </span>
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        className="relative w-full rounded-md overflow-hidden"
        style={{
          height: 36,
          background: "hsl(var(--muted))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* Tick marks */}
        {ticks.map(({ t, pct }) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          >
            <div
              className="w-px opacity-30 mb-4"
              style={{ height: 10, background: "hsl(var(--muted-foreground))" }}
            />
          </div>
        ))}

        {/* Audio block — draggable */}
        <div
          className="absolute top-1 bottom-1 rounded flex items-center justify-center"
          style={{
            left: `${blockLeftPct}%`,
            width: `${Math.max(blockWidthPct, 4)}%`,
            background: isDragging
              ? "hsl(var(--primary) / 0.90)"
              : "hsl(var(--primary) / 0.70)",
            border: "1px solid hsl(var(--primary))",
            cursor: "ew-resize",
            boxShadow: isDragging ? "0 0 0 2px hsl(var(--primary) / 0.35)" : undefined,
            transition: isDragging ? "none" : "background 0.15s",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            className="text-[9px] font-mono tabular-nums truncate px-1 pointer-events-none"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            {fmtTime(audioDuration)}
          </span>
        </div>
      </div>

      {/* Tick labels */}
      <div className="relative w-full" style={{ height: 12 }}>
        {ticks.map(({ t, pct }) => (
          <span
            key={pct}
            className="absolute text-[9px] tabular-nums"
            style={{
              left: `${pct}%`,
              transform: "translateX(-50%)",
              color: "hsl(var(--muted-foreground) / 0.7)",
            }}
          >
            {fmtTime(t)}
          </span>
        ))}
      </div>

      {/* Nudge buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, startTimeSeconds - 0.5))}
          className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-mono tabular-nums transition-colors"
          style={{
            background: "hsl(var(--muted))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground) / 0.8)",
            cursor: "pointer",
          }}
          title="Recuar 0.5s"
        >
          ← −0.5s
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(maxOffset, startTimeSeconds + 0.5))}
          className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-mono tabular-nums transition-colors"
          style={{
            background: "hsl(var(--muted))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground) / 0.8)",
            cursor: "pointer",
          }}
          title="Avançar 0.5s"
        >
          +0.5s →
        </button>
      </div>

      {startTimeSeconds > 0 && (
        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
          Offset: <span className="font-mono text-amber-500">+{fmtTime(startTimeSeconds)}</span> em relação ao início
        </p>
      )}
    </div>
  );
}
