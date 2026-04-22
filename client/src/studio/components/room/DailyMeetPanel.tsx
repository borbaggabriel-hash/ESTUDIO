import { useState, useEffect } from "react";
import { Mic, ChevronDown, ChevronUp } from "lucide-react";
import { authFetch } from "@studio/lib/auth-fetch";

interface DailyMeetPanelProps {
  sessionId: string;
}

export function DailyMeetPanel({ sessionId }: DailyMeetPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div 
      className="shrink-0 transition-all duration-300 ease-in-out"
      style={{
        height: isExpanded ? 'clamp(400px, 60vh, 1000px)' : '70px',
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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">Chat de Voz</span>
          {loading && (
            <span className="text-xs text-muted-foreground ml-2">Carregando...</span>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
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
