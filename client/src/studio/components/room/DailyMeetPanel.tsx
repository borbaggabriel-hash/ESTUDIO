import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, ChevronDown, ChevronUp } from "lucide-react";
import { authFetch } from "@studio/lib/auth-fetch";

interface DailyMeetPanelProps {
  sessionId: string;
}

const COLLAPSED_HEIGHT = 48;
const DEFAULT_HEIGHT = 400;
const MIN_HEIGHT = COLLAPSED_HEIGHT;
const MAX_HEIGHT = 700;

export function DailyMeetPanel({ sessionId }: DailyMeetPanelProps) {
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem("vhub_daily_h");
    return saved ? Number(saved) : COLLAPSED_HEIGHT;
  });
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelHeightRef = useRef(panelHeight);

  useEffect(() => {
    panelHeightRef.current = panelHeight;
    localStorage.setItem("vhub_daily_h", String(panelHeight));
  }, [panelHeight]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch("/api/create-room", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
        if (!cancelled && res?.url) {
          setDailyUrl(res.url);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Erro ao criar sala");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.documentElement.style.cursor = "row-resize";
    document.documentElement.style.userSelect = "none";
    const startY = e.clientY;
    const startH = panelHeightRef.current;
    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY; // drag up → bigger
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + delta));
      panelHeightRef.current = newH;
      setPanelHeight(newH);
    };
    const onUp = () => {
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
      localStorage.setItem("vhub_daily_h", String(panelHeightRef.current));
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  const isExpanded = panelHeight > COLLAPSED_HEIGHT + 10;

  return (
    <div 
      className="shrink-0 transition-all duration-300 ease-in-out"
      style={{
        height: `${panelHeight}px`,
        background: 'rgba(15,15,30,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--border) / 0.8)',
        boxShadow: isExpanded ? '0 -4px 24px rgba(0,0,0,0.3)' : 'none'
      }}
      data-testid="panel-daily"
      role="region"
      aria-label="Chat de voz"
    >
      <div
        onPointerDown={handleDragPointerDown}
        className="hidden md:flex shrink-0 items-center justify-center cursor-row-resize group relative select-none"
        style={{ height: '6px', background: 'hsl(var(--border))' }}
      >
        <div className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'hsl(var(--primary) / 0.6)' }} />
      </div>
      <div
        className="flex items-center justify-between px-4 py-3"
        onClick={() => !isExpanded && setPanelHeight(DEFAULT_HEIGHT)}
        style={{ cursor: isExpanded ? 'default' : 'pointer', userSelect: 'none' }}
      >
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">Chat de Voz</span>
          {loading && (
            <span className="text-xs text-muted-foreground ml-2">Carregando...</span>
          )}
          {!isExpanded && (
            <span className="text-xs ml-1" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
              — toque para abrir
            </span>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPanelHeight(isExpanded ? COLLAPSED_HEIGHT : DEFAULT_HEIGHT);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
          style={{ color: 'hsl(var(--foreground) / 0.70)' }}
          data-testid="button-toggle-daily-expand"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Minimizar
            </>
          ) : (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Expandir
            </>
          )}
        </button>
      </div>

      <div 
        className="overflow-hidden px-4 pb-3"
        style={{
          height: isExpanded ? 'calc(100% - 70px)' : '0px',
          visibility: isExpanded ? 'visible' : 'hidden'
        }}
      >
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <span className="text-xs">Criando sala de voz...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-destructive">
            <span className="text-xs">{error}</span>
          </div>
        )}
        {dailyUrl && !loading && (
          <iframe
            src={dailyUrl}
            allow="camera; microphone; autoplay; display-capture"
            className="w-full h-full rounded-lg"
            style={{ border: 'none' }}
            data-testid="iframe-daily-meet"
            title="Daily.co Voice Chat"
          />
        )}
      </div>
    </div>
  );
}
