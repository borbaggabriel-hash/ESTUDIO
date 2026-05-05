import type React from "react";
import { MousePointer2, Scissors, Play, Square, ZoomIn, ZoomOut, Trash2, Check, X, Repeat2, ChevronDown, ChevronUp } from "lucide-react";
import type { DawTool } from "./types";

interface DawToolbarProps {
  tool: DawTool;
  onToolChange: (t: DawTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedClipId: string | null;
  onDeleteClip: () => void;
  isPreviewing: boolean;
  isPreviewLoading?: boolean;
  onPreviewToggle: () => void;
  canPreview: boolean;
  isReviewMode: boolean;
  reviewTakeName?: string;
  directorFeedback: string;
  onFeedbackChange: (s: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onDirectorPreview?: () => void;
  isRecording: boolean;
  timelineCollapsed?: boolean;
  onToggleTimeline?: () => void;
  loopActive: boolean;
  loopPhase: 0 | 1;
  onLoopClear: () => void;
  showPreview: boolean;
  isProcessingSilence?: boolean;
}

// ── Estilos base ─────────────────────────────────────────────────────────────
const SEP: React.CSSProperties = {
  width: 1, height: 22, background: "rgba(255,255,255,0.07)",
  margin: "0 6px", flexShrink: 0,
};

function toolBtn(active: boolean, color: "white" | "red" | "blue" | "green" = "white"): React.CSSProperties {
  const accents = {
    white:  { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.3)", text: "#f0f0f0" },
    red:    { bg: "rgba(239,68,68,0.18)",   border: "rgba(239,68,68,0.5)",   text: "#fca5a5" },
    blue:   { bg: "rgba(59,130,246,0.18)",  border: "rgba(59,130,246,0.5)",  text: "#93c5fd" },
    green:  { bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.5)",   text: "#86efac" },
  };
  const a = accents[color];
  return {
    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${active ? a.border : "rgba(255,255,255,0.07)"}`,
    background: active ? a.bg : "transparent",
    color: active ? a.text : "#475569",
    cursor: "pointer",
    transition: "all 0.12s",
  };
}

function actionBtn(variant: "red" | "blue" | "green" | "default" = "default"): React.CSSProperties {
  const v = {
    default: { bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.12)", text: "#94a3b8" },
    red:     { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   text: "#fca5a5" },
    blue:    { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",  text: "#93c5fd" },
    green:   { bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.4)",   text: "#86efac" },
  }[variant];
  return {
    height: 28, padding: "0 10px", borderRadius: 7, flexShrink: 0,
    display: "flex", alignItems: "center", gap: 5,
    border: `1px solid ${v.border}`,
    background: v.bg, color: v.text,
    fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
    cursor: "pointer", whiteSpace: "nowrap" as const,
    transition: "all 0.12s",
  };
}

export function DawToolbar({
  tool, onToolChange, onZoomIn, onZoomOut,
  selectedClipId, onDeleteClip,
  isPreviewing, isPreviewLoading = false, onPreviewToggle, canPreview,
  isReviewMode, reviewTakeName, directorFeedback,
  onFeedbackChange, onApprove, onReject, onDirectorPreview,
  isRecording,
  timelineCollapsed = false, onToggleTimeline,
  loopActive, loopPhase, onLoopClear, showPreview, isProcessingSilence = false,
}: DawToolbarProps) {
  return (
    <div style={{
      height: 48, display: "flex", alignItems: "center", gap: 4,
      padding: "0 14px",
      background: "#060810",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0,
    }}>
      {/* ── Wordmark / collapse toggle ── */}
      <button
        onClick={onToggleTimeline}
        title={timelineCollapsed ? "Expandir timeline" : "Minimizar timeline"}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: onToggleTimeline ? "pointer" : "default",
          padding: "0 4px 0 0", marginRight: 4,
          color: timelineCollapsed ? "#475569" : "#334155",
          transition: "color .15s",
          userSelect: "none",
        }}
      >
        {onToggleTimeline && (
          timelineCollapsed
            ? <ChevronDown size={10} style={{ color: "#475569" }} />
            : <ChevronUp   size={10} style={{ color: "#334155" }} />
        )}
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          DAW
        </span>
      </button>

      <div style={SEP} />

      {/* ── Ferramentas (icon-only com tooltip) ── */}
      <button onClick={() => onToolChange("pointer")} style={toolBtn(tool === "pointer")} title="Ponteiro (V)">
        <MousePointer2 size={13} />
      </button>
      <button
        onClick={() => onToolChange("removeSilence")}
        style={toolBtn(tool === "removeSilence" || isProcessingSilence, "red")}
        title={isProcessingSilence ? "Analisando silêncios…" : "Remover silêncio — clique no take para analisar (C)"}
        disabled={isProcessingSilence}
      >
        <Scissors size={13} />
      </button>
      <button
        onClick={() => {
          if (loopActive || tool === "loop") { onLoopClear(); }
          else { onToolChange("loop"); }
        }}
        style={toolBtn(tool === "loop" || loopActive, "blue")}
        title={
          loopActive
            ? "Loop ativo — clique para remover (L)"
            : tool === "loop" && loopPhase === 1
              ? "Loop: clique para definir o fim"
              : tool === "loop"
                ? "Loop: clique na timeline para definir o início"
                : "Ativar loop — 2 cliques definem a região (L)"
        }
      >
        <Repeat2 size={13} />
      </button>

      <div style={SEP} />

      {/* ── Ações de clip ── */}
      {selectedClipId && (
        <>
          <button onClick={onDeleteClip} style={actionBtn("red")} title="Excluir take selecionado">
            <Trash2 size={11} /> Excluir
          </button>
          <div style={SEP} />
        </>
      )}

      {/* ── Preview / Revisão ── */}
      {isReviewMode ? (
        <>
          {onDirectorPreview && (
            <button onClick={onDirectorPreview} style={actionBtn("blue")} title="Preview sincronizado com vídeo">
              <Play size={10} /> Preview
            </button>
          )}
          <input
            value={directorFeedback}
            onChange={e => onFeedbackChange(e.target.value)}
            placeholder="Feedback para o ator..."
            style={{
              height: 28, padding: "0 10px", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0", fontSize: 11, outline: "none", width: 160,
              transition: "border-color .15s",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          <button onClick={onApprove} style={actionBtn("green")}>
            <Check size={11} /> Aprovar
          </button>
          <button onClick={onReject} style={actionBtn("red")}>
            <X size={11} /> Rejeitar
          </button>
        </>
      ) : showPreview ? (
        <button
          onClick={onPreviewToggle}
          disabled={!canPreview || isRecording}
          style={{ ...actionBtn("blue"), opacity: (!isRecording && canPreview) ? 1 : 0.3 }}
          title={isPreviewLoading ? "Carregando áudio…" : isPreviewing ? "Parar preview (Space)" : "Preview do take (Space)"}
        >
          {isPreviewLoading ? (
            <>
              <span style={{
                width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                border: "1.5px solid rgba(147,197,253,0.35)",
                borderTopColor: "#93c5fd",
                display: "inline-block",
                animation: "dtl-spin .7s linear infinite",
              }} />
              Carregando…
            </>
          ) : isPreviewing ? (
            <><Square size={10} /> Parar</>
          ) : (
            <><Play  size={10} /> Preview</>
          )}
        </button>
      ) : null}

      <div style={{ flex: 1 }} />

      {/* ── Status badges ── */}
      {isRecording && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 20,
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          fontSize: 10, fontWeight: 700, color: "#fca5a5",
          letterSpacing: "0.1em",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
            display: "inline-block", animation: "dtl-rec-dot .9s ease-in-out infinite", flexShrink: 0,
          }} />
          AO VIVO
        </div>
      )}
      {isReviewMode && !isRecording && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 20,
          background: "rgba(245,158,11,0.15)",
          border: "1px solid rgba(245,158,11,0.4)",
          fontSize: 10, fontWeight: 700, color: "#fde68a",
          letterSpacing: "0.06em", maxWidth: 180,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ✦ REVISÃO
          {reviewTakeName && (
            <span style={{ color: "#fbbf24", fontWeight: 500 }}>— {reviewTakeName}</span>
          )}
        </div>
      )}

      <div style={SEP} />

      {/* ── Zoom ── */}
      <button onClick={onZoomOut} style={toolBtn(false)} title="Zoom out (-)">
        <ZoomOut size={13} />
      </button>
      <button onClick={onZoomIn} style={toolBtn(false)} title="Zoom in (+)">
        <ZoomIn size={13} />
      </button>
    </div>
  );
}
