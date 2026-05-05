import { useRef, useCallback, useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";
import {
  GripHorizontal,
  X,
  Check,
  Play,
  Pause,
  Scissors,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  PenLine,
  AlertCircle,
} from "lucide-react";
import { TakeWaveformEditor } from "@studio/components/audio/TakeWaveformEditor";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingTake {
  takeId: string;
  audioUrl: string;
  startTimeSeconds: number;
  durationSeconds: number;
  lineIndex: number;
  characterName: string;
  voiceActorName: string;
  voiceActorId: string;
}

export interface DirectorControlPipProps {
  // Take Approval
  pendingTake: PendingTake | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  directorFeedback: string;
  isDirector: boolean;
  onApprovalTrim: (start: number, end: number) => Promise<void>;
  onTakeDecision: (action: "approve" | "reject", feedback: string) => void;
  onFeedbackChange: (s: string) => void;
  onDirectorPreview?: () => void;
  onDismiss: () => void;
  // Text Control
  presenceRoster: Array<{ userId: string; name: string; role?: string }>;
  textControllerUserIds: Set<string>;
  onToggleTextControl: (userId: string) => void;
  onRevokeAllTextControl: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDur(s: number): string {
  if (!s || !isFinite(s)) return "0.0s";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return m > 0 ? `${m}:${sec.padStart(4, "0")}` : `${sec}s`;
}

function fmtTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Constants ──────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";
const AMBER_DIM = "rgba(245,158,11,0.14)";
const AMBER_BORDER = "rgba(245,158,11,0.3)";
const INDIGO = "#818cf8";
const INDIGO_DIM = "rgba(129,140,248,0.14)";
const INDIGO_BORDER = "rgba(129,140,248,0.3)";
const GREEN = "#34d399";
const GREEN_DIM = "rgba(52,211,153,0.12)";
const GREEN_BORDER = "rgba(52,211,153,0.3)";
const RED = "#f87171";
const RED_DIM = "rgba(248,113,113,0.1)";
const RED_BORDER = "rgba(248,113,113,0.28)";
const BG = "#060810";
const ROW_BG = "#0a0d16";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT_MUTED = "#64748b";
const TEXT_SUB = "#94a3b8";
const TEXT_MAIN = "#f1f5f9";

// ── Component ──────────────────────────────────────────────────────────────────

export const DirectorControlPip = memo(function DirectorControlPip({
  pendingTake,
  approvalStatus,
  directorFeedback,
  isDirector,
  onApprovalTrim,
  onTakeDecision,
  onFeedbackChange,
  onDirectorPreview,
  onDismiss,
  presenceRoster,
  textControllerUserIds,
  onToggleTextControl,
  onRevokeAllTextControl,
}: DirectorControlPipProps) {
  // ── Panel drag, size & position ───────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 80 });
  const sizeRef = useRef({ w: 384, h: 0 }); // h=0 → auto (height grows with content)
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const applyTransform = useCallback(() => {
    if (!panelRef.current) return;
    panelRef.current.style.left = `${posRef.current.x}px`;
    panelRef.current.style.top = `${posRef.current.y}px`;
    panelRef.current.style.width = `${sizeRef.current.w}px`;
    if (sizeRef.current.h > 0) {
      panelRef.current.style.height = `${sizeRef.current.h}px`;
    }
  }, []);

  useEffect(() => {
    posRef.current = { x: Math.max(20, window.innerWidth - 404), y: 80 };
    applyTransform();
  }, [applyTransform]);

  const onDragDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: posRef.current.x,
        origY: posRef.current.y,
      };
    },
    []
  );
  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      posRef.current = {
        x: Math.max(0, dragRef.current.origX + e.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + e.clientY - dragRef.current.startY),
      };
      applyTransform();
    },
    [applyTransform]
  );
  const onDragUp = useCallback(() => { dragRef.current = null; }, []);

  const onResizeDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const h = panelRef.current?.offsetHeight ?? sizeRef.current.h;
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: sizeRef.current.w,
      origH: h,
    };
    sizeRef.current.h = h; // freeze height so resize works from current rendered height
  }, []);
  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    sizeRef.current = {
      w: Math.max(320, resizeRef.current.origW + e.clientX - resizeRef.current.startX),
      h: Math.max(120, resizeRef.current.origH + e.clientY - resizeRef.current.startY),
    };
    applyTransform();
  }, [applyTransform]);
  const onResizeUp = useCallback(() => { resizeRef.current = null; }, []);

  // ── UI state ───────────────────────────────────────────────────────────────
  type Tab = "revisao" | "texto";
  const [activeTab, setActiveTab] = useState<Tab>(isDirector ? "texto" : "revisao");
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTrimEditor, setShowTrimEditor] = useState(false);
  const [localFeedback, setLocalFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Audio player ───────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Reset when new take arrives
  useEffect(() => {
    if (pendingTake) {
      setShowTrimEditor(false);
      setLocalFeedback("");
      setIsSubmitting(false);
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveTab("revisao");
      setIsMinimized(false);
    }
  }, [pendingTake?.takeId]);

  const togglePlay = useCallback(() => {
    if (!pendingTake) return;
    if (!audioRef.current) {
      const audio = new Audio(pendingTake.audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        const dur = audio.duration || pendingTake.durationSeconds || 1;
        setCurrentTime(audio.currentTime);
        setProgress(isFinite(dur) && dur > 0 ? audio.currentTime / dur : 0);
      };
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [pendingTake, isPlaying]);

  const seekAudio = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const dur = audio?.duration || pendingTake?.durationSeconds || 0;
      if (!audio || !dur) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = frac * dur;
    },
    [pendingTake]
  );

  // ── Take decisions ─────────────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onTakeDecision("approve", localFeedback);
    } finally {
      setIsSubmitting(false);
    }
  }, [onTakeDecision, localFeedback, isSubmitting]);

  const handleReject = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onTakeDecision("reject", localFeedback);
    } finally {
      setIsSubmitting(false);
    }
  }, [onTakeDecision, localFeedback, isSubmitting]);

  const handleTrim = useCallback(
    async (start: number, end: number) => {
      await onApprovalTrim(start, end);
      setShowTrimEditor(false);
    },
    [onApprovalTrim]
  );

  // ── Visibility ─────────────────────────────────────────────────────────────
  const hasTakeActivity =
    pendingTake !== null ||
    approvalStatus === "approved" ||
    approvalStatus === "rejected";
  const isVisible = isDirector || hasTakeActivity;
  if (!isVisible) return null;

  // ── Derived ────────────────────────────────────────────────────────────────
  const isWaiting =
    pendingTake !== null &&
    approvalStatus !== "approved" &&
    approvalStatus !== "rejected";
  const authorizedCount = textControllerUserIds.size;
  const tabAccent = activeTab === "revisao" ? AMBER : INDIGO;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const btn = (
    color: string,
    dim: string,
    border: string
  ): React.CSSProperties => ({
    flex: 1,
    height: 36,
    borderRadius: 9,
    background: dim,
    border: `1px solid ${border}`,
    color,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "opacity .15s",
    fontFamily: "inherit",
  });

  const iconBtn = (active?: boolean): React.CSSProperties => ({
    width: 22,
    height: 22,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: active
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.05)",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.5)",
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        zIndex: 9999,
        width: 384,      // overridden by applyTransform
        borderRadius: 14,
        overflow: "hidden",
        minWidth: 320,
        minHeight: 120,
        background: BG,
        boxShadow:
          "0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)",
        border: `1px solid ${tabAccent}33`,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui,-apple-system,sans-serif",
        transition: "border-color .25s",
      }}
    >
      {/* ── Drag handle ─────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: `${tabAccent}0d`,
          borderBottom: `1px solid ${tabAccent}22`,
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <GripHorizontal
            style={{ width: 13, height: 13, color: `${tabAccent}66` }}
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: tabAccent,
              boxShadow: `0 0 6px ${tabAccent}`,
              animation:
                (pendingTake && isDirector) || isWaiting
                  ? "dtl-rec-dot .9s ease-in-out infinite"
                  : "none",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: tabAccent,
            }}
          >
            {pendingTake && isDirector
              ? "Revisão de Take"
              : approvalStatus === "approved"
              ? "Take Aprovado"
              : approvalStatus === "rejected"
              ? "Take Rejeitado"
              : isWaiting
              ? "Aguardando Aprovação"
              : "Studio Control"}
          </span>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsMinimized((m) => !m)}
            style={iconBtn()}
          >
            {isMinimized ? (
              <ChevronDown style={{ width: 11, height: 11 }} />
            ) : (
              <ChevronUp style={{ width: 11, height: 11 }} />
            )}
          </button>
          {!pendingTake && (
            <button onClick={onDismiss} style={iconBtn()}>
              <X style={{ width: 11, height: 11 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tab bar (directors only, when not minimized) ─────────────────────── */}
      {!isMinimized && isDirector && (
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: "revisao" as Tab, label: "✦ Revisão", accent: AMBER },
              { id: "texto" as Tab, label: "✎ Texto", accent: INDIGO },
            ] as const
          ).map(({ id, label, accent }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                height: 34,
                background: activeTab === id ? `${accent}12` : "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === id ? accent : "transparent"}`,
                color: activeTab === id ? accent : TEXT_MUTED,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all .15s",
                fontFamily: "inherit",
              }}
            >
              {label}
              {id === "revisao" && pendingTake && (
                <span
                  style={{
                    marginLeft: 5,
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: AMBER,
                    verticalAlign: "middle",
                    animation: "dtl-rec-dot .9s ease-in-out infinite",
                  }}
                />
              )}
              {id === "texto" && authorizedCount > 0 && (
                <span
                  style={{
                    marginLeft: 5,
                    fontSize: 9,
                    padding: "1px 4px",
                    borderRadius: 4,
                    background: INDIGO_DIM,
                    color: INDIGO,
                    fontWeight: 800,
                  }}
                >
                  {authorizedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Minimized info bar ────────────────────────────────────────────────── */}
      {isMinimized && (
        <div
          style={{
            padding: "6px 14px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {pendingTake && isDirector && (
            <>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: AMBER,
                  animation: "dtl-rec-dot .9s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: TEXT_SUB }}>
                {pendingTake.voiceActorName} — {pendingTake.characterName} (
                {fmtDur(pendingTake.durationSeconds)})
              </span>
            </>
          )}
          {isWaiting && !isDirector && (
            <span style={{ fontSize: 11, color: TEXT_SUB }}>
              ⟳ Aguardando aprovação…
            </span>
          )}
          {approvalStatus === "approved" && !pendingTake && (
            <span style={{ fontSize: 11, color: GREEN }}>✓ Aprovado</span>
          )}
          {approvalStatus === "rejected" && !pendingTake && (
            <span style={{ fontSize: 11, color: RED }}>✗ Rejeitado</span>
          )}
          {isDirector && !pendingTake && !hasTakeActivity && (
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>
              {authorizedCount} autorizado{authorizedCount !== 1 ? "s" : ""} no
              roteiro
            </span>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── CONTENT (not minimized) ──────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!isMinimized && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* ── REVISÃO TAB ─────────────────────────────────────────────────── */}
          {(activeTab === "revisao" || !isDirector) && (
            <>
              {/* Director — pending take */}
              {pendingTake && isDirector && (
                <>
                  {/* Actor info */}
                  <div
                    style={{
                      padding: "13px 14px 11px",
                      borderBottom: `1px solid ${BORDER}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: AMBER_DIM,
                        border: `1px solid ${AMBER_BORDER}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: AMBER,
                      }}
                    >
                      {initials(pendingTake.voiceActorName)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_MAIN,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pendingTake.voiceActorName}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: TEXT_SUB,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: AMBER, fontWeight: 500 }}>
                          {pendingTake.characterName}
                        </span>
                        <span style={{ color: TEXT_MUTED }}>·</span>
                        <span>Linha {pendingTake.lineIndex + 1}</span>
                        <span style={{ color: TEXT_MUTED }}>·</span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            color: "#cbd5e1",
                          }}
                        >
                          {fmtDur(pendingTake.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audio player */}
                  <div
                    style={{
                      padding: "11px 14px 9px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={togglePlay}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: AMBER_DIM,
                          border: `1px solid ${AMBER_BORDER}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: AMBER,
                          fontFamily: "inherit",
                        }}
                      >
                        {isPlaying ? (
                          <Pause style={{ width: 13, height: 13 }} />
                        ) : (
                          <Play
                            style={{ width: 13, height: 13, marginLeft: 1 }}
                          />
                        )}
                      </button>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: "rgba(255,255,255,0.08)",
                            cursor: "pointer",
                            overflow: "hidden",
                          }}
                          onClick={seekAudio}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 2,
                              background: AMBER,
                              width: `${(progress * 100).toFixed(1)}%`,
                              transition: "width .1s linear",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 10,
                            color: TEXT_MUTED,
                            fontFamily: "monospace",
                          }}
                        >
                          <span>{fmtTime(currentTime)}</span>
                          <span>{fmtDur(pendingTake.durationSeconds)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row: Trim */}
                  <div
                    style={{
                      padding: "8px 14px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <button
                      onClick={() => setShowTrimEditor((t) => !t)}
                      style={{
                        width: "100%",
                        height: 28,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        background: showTrimEditor ? AMBER_DIM : ROW_BG,
                        border: `1px solid ${
                          showTrimEditor ? AMBER_BORDER : BORDER
                        }`,
                        color: showTrimEditor ? AMBER : TEXT_SUB,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all .15s",
                        fontFamily: "inherit",
                      }}
                    >
                      <Scissors style={{ width: 10, height: 10 }} />
                      {showTrimEditor ? "Fechar Trim" : "Editar / Trim"}
                    </button>
                  </div>

                  {/* Waveform trim editor (expandable) */}
                  {showTrimEditor && (
                    <div
                      style={{
                        padding: "4px 14px 8px",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      <TakeWaveformEditor
                        audioUrl={pendingTake.audioUrl}
                        durationSeconds={pendingTake.durationSeconds}
                        onTrim={handleTrim}
                      />
                    </div>
                  )}

                  {/* Feedback */}
                  <div
                    style={{
                      padding: "9px 14px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 6,
                      }}
                    >
                      <MessageSquare
                        style={{ width: 10, height: 10, color: TEXT_MUTED }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          color: TEXT_MUTED,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        Feedback (opcional)
                      </span>
                    </div>
                    <textarea
                      value={localFeedback}
                      onChange={(e) => {
                        setLocalFeedback(e.target.value);
                        onFeedbackChange(e.target.value);
                      }}
                      placeholder="Deixe um comentário para o dublador…"
                      rows={2}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        padding: "7px 10px",
                        resize: "vertical",
                        background: ROW_BG,
                        border: `1px solid ${BORDER}`,
                        color: "#e2e8f0",
                        fontSize: 12,
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        minHeight: 54,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = AMBER_BORDER;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = BORDER;
                      }}
                    />
                  </div>

                  {/* Approve / Reject */}
                  <div
                    style={{ padding: "10px 14px", display: "flex", gap: 8 }}
                  >
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      style={{
                        ...btn(RED, RED_DIM, RED_BORDER),
                        opacity: isSubmitting ? 0.5 : 1,
                      }}
                    >
                      {isSubmitting ? (
                        <Loader2
                          style={{
                            width: 12,
                            height: 12,
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <X style={{ width: 12, height: 12 }} />
                      )}
                      Rejeitar
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      style={{
                        ...btn(GREEN, GREEN_DIM, GREEN_BORDER),
                        opacity: isSubmitting ? 0.5 : 1,
                      }}
                    >
                      {isSubmitting ? (
                        <Loader2
                          style={{
                            width: 12,
                            height: 12,
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <Check style={{ width: 12, height: 12 }} />
                      )}
                      Aprovar
                    </button>
                  </div>
                </>
              )}

              {/* Director — idle (no pending take) */}
              {!pendingTake && isDirector && activeTab === "revisao" && (
                <div
                  style={{
                    padding: "28px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle
                    style={{ width: 22, height: 22, color: TEXT_MUTED }}
                  />
                  <span
                    style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center" }}
                  >
                    Nenhum take pendente.
                    <br />
                    <span style={{ fontSize: 11 }}>
                      Aguardando próximo take…
                    </span>
                  </span>
                </div>
              )}

              {/* Voice actor — waiting */}
              {!isDirector && isWaiting && pendingTake && (
                <>
                  <div
                    style={{
                      padding: "14px 14px 10px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: TEXT_MAIN,
                        marginBottom: 3,
                      }}
                    >
                      ✅ Take enviado!
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SUB }}>
                      {pendingTake.characterName} — Linha{" "}
                      {pendingTake.lineIndex + 1} (
                      {fmtDur(pendingTake.durationSeconds)})
                    </div>
                  </div>
                  {/* compact player */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: `1px solid ${BORDER}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={togglePlay}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: AMBER_DIM,
                        border: `1px solid ${AMBER_BORDER}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: AMBER,
                        fontFamily: "inherit",
                      }}
                    >
                      {isPlaying ? (
                        <Pause style={{ width: 11, height: 11 }} />
                      ) : (
                        <Play
                          style={{ width: 11, height: 11, marginLeft: 1 }}
                        />
                      )}
                    </button>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                      onClick={seekAudio}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          background: AMBER,
                          width: `${(progress * 100).toFixed(1)}%`,
                          transition: "width .1s linear",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: TEXT_MUTED,
                        fontFamily: "monospace",
                        flexShrink: 0,
                      }}
                    >
                      {fmtTime(currentTime)}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "12px 14px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <Loader2
                      style={{
                        width: 14,
                        height: 14,
                        color: AMBER,
                        animation: "spin 1s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: TEXT_SUB }}>
                      Aguardando aprovação do diretor…
                    </span>
                  </div>
                </>
              )}

              {/* Voice actor — approved */}
              {!isDirector && approvalStatus === "approved" && !pendingTake && (
                <>
                  <div
                    style={{
                      padding: "16px 14px 12px",
                      borderBottom: directorFeedback
                        ? `1px solid ${BORDER}`
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: GREEN,
                        marginBottom: 4,
                      }}
                    >
                      🎉 Take Aprovado!
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_SUB }}>
                      Seu take foi aceito pelo diretor.
                    </div>
                  </div>
                  {directorFeedback && (
                    <div
                      style={{
                        margin: "10px 14px",
                        borderRadius: 8,
                        padding: "10px 12px",
                        background: GREEN_DIM,
                        border: `1px solid ${GREEN_BORDER}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: GREEN,
                          marginBottom: 4,
                        }}
                      >
                        Feedback do Diretor
                      </div>
                      <div style={{ fontSize: 12, color: "#d1fae5" }}>
                        {directorFeedback}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: "6px 14px 14px" }}>
                    <button
                      onClick={onDismiss}
                      style={btn(GREEN, GREEN_DIM, GREEN_BORDER)}
                    >
                      <Check style={{ width: 12, height: 12 }} />
                      Continuar Gravação
                    </button>
                  </div>
                </>
              )}

              {/* Voice actor — rejected */}
              {!isDirector && approvalStatus === "rejected" && !pendingTake && (
                <>
                  <div
                    style={{
                      padding: "16px 14px 12px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: RED,
                        marginBottom: 4,
                      }}
                    >
                      ✕ Take Rejeitado
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_SUB }}>
                      O diretor solicitou uma nova gravação.
                    </div>
                  </div>
                  <div
                    style={{
                      margin: "10px 14px",
                      borderRadius: 8,
                      padding: "10px 12px",
                      background: RED_DIM,
                      border: `1px solid ${RED_BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: RED,
                        marginBottom: 4,
                      }}
                    >
                      Feedback do Diretor
                    </div>
                    <div style={{ fontSize: 12, color: "#fecaca" }}>
                      {directorFeedback || "O diretor não deixou comentários."}
                    </div>
                  </div>
                  <div style={{ padding: "4px 14px 14px" }}>
                    <button
                      onClick={onDismiss}
                      style={btn(RED, RED_DIM, RED_BORDER)}
                    >
                      <X style={{ width: 12, height: 12 }} />
                      Gravar Novamente
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── TEXTO TAB ───────────────────────────────────────────────────── */}
          {activeTab === "texto" && isDirector && (
            <>
              {/* Header */}
              <div
                style={{
                  padding: "10px 14px 8px",
                  borderBottom: `1px solid ${BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <PenLine
                    style={{ width: 12, height: 12, color: INDIGO }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: TEXT_SUB,
                    }}
                  >
                    {authorizedCount > 0 ? (
                      <>
                        <span style={{ color: INDIGO, fontWeight: 700 }}>
                          {authorizedCount}
                        </span>{" "}
                        autorizado{authorizedCount !== 1 ? "s" : ""} no
                        roteiro
                      </>
                    ) : (
                      "Nenhum autorizado"
                    )}
                  </span>
                </div>
                {authorizedCount > 0 && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Revogar todas as permissões de controle de texto?"
                        )
                      ) {
                        onRevokeAllTextControl();
                      }
                    }}
                    style={{
                      fontSize: 9,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: RED_DIM,
                      color: RED,
                      border: `1px solid ${RED_BORDER}`,
                      cursor: "pointer",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontFamily: "inherit",
                    }}
                  >
                    Revogar tudo
                  </button>
                )}
              </div>

              {/* User list */}
              <div
                style={{
                  overflowY: "auto",
                  maxHeight: 280,
                  padding: "6px 10px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {!presenceRoster.length ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "28px 0",
                      fontSize: 12,
                      color: TEXT_MUTED,
                    }}
                  >
                    Nenhum participante conectado
                  </div>
                ) : (
                  presenceRoster.map((p) => {
                    const authorized = textControllerUserIds.has(p.userId);
                    return (
                      <button
                        key={p.userId}
                        onClick={() => onToggleTextControl(p.userId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px 8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          background: authorized ? `${INDIGO}0d` : ROW_BG,
                          border: `1px solid ${
                            authorized ? INDIGO_BORDER : BORDER
                          }`,
                          borderLeft: `3px solid ${
                            authorized ? INDIGO : "transparent"
                          }`,
                          transition: "all .12s",
                          textAlign: "left",
                          width: "100%",
                          fontFamily: "inherit",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: authorized ? INDIGO_DIM : ROW_BG,
                            border: `1px solid ${
                              authorized ? INDIGO_BORDER : BORDER
                            }`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            color: authorized ? INDIGO : TEXT_MUTED,
                            transition: "all .12s",
                          }}
                        >
                          {String(p.name || "?")[0]?.toUpperCase() || "?"}
                        </div>

                        {/* Name + role */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: authorized ? TEXT_MAIN : TEXT_SUB,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name || "Usuário"}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: TEXT_MUTED,
                              marginTop: 1,
                            }}
                          >
                            {String(p.role || "").replace(/_/g, " ") ||
                              "participante"}
                          </div>
                        </div>

                        {/* Status badge */}
                        {authorized ? (
                          <span
                            style={{
                              fontSize: 8,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: INDIGO_DIM,
                              color: INDIGO,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                              border: `1px solid ${INDIGO_BORDER}`,
                            }}
                          >
                            ● ATIVO
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 8,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "rgba(255,255,255,0.04)",
                              color: TEXT_MUTED,
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                              border: `1px solid ${BORDER}`,
                            }}
                          >
                            Clique
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Resize handle (nwse-resize, bottom-right corner) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          cursor: "nwse-resize",
          zIndex: 10,
        }}
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          style={{ position: "absolute", bottom: 3, right: 3, opacity: 0.4 }}
        >
          <path
            d="M11 1 1 11M11 5 5 11M11 9 9 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>,
    document.body
  );
});
