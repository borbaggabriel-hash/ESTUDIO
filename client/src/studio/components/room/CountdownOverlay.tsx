interface CountdownOverlayProps {
  count: number;
}

export function CountdownOverlay({ count }: CountdownOverlayProps) {
  return (
    <div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full animate-in fade-in duration-150 pointer-events-none"
      style={{
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <span
        className="text-sm font-mono tabular-nums font-semibold"
        style={{ color: "hsl(0 72% 65%)" }}
      >
        {count}
      </span>
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        gravando em...
      </span>
    </div>
  );
}
