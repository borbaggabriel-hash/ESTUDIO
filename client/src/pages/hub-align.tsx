import { useMemo } from "react";
import { useLocation } from "wouter";

export default function HubAlign() {
  const [, navigate] = useLocation();
  const src = useMemo(() => import.meta.env.VITE_HUBALIGN_URL || "http://localhost:5004/", []);

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0">
        <iframe
          title="HUB ALIGN"
          src={src}
          className="w-full h-full border-0"
          allow="microphone; autoplay; clipboard-read; clipboard-write"
        />
      </div>
      <button
        type="button"
        className="fixed top-4 left-4 z-50 rounded-full border border-border/60 bg-background/95 backdrop-blur px-4 h-10 text-sm font-medium hover:bg-muted/30 transition-colors"
        onClick={() => navigate("/")}
      >
        Back
      </button>
    </div>
  );
}
