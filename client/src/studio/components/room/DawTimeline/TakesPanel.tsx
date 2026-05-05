import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Play, Pause, Download, Trash2, Music2, ChevronRight, ChevronDown, Scissors } from "lucide-react";
import { TakeWaveformEditor } from "@studio/components/audio/TakeWaveformEditor";

// ── Actor accent palette (mirrors index.tsx) ──────────────────────────────────
const ACTOR_ACCENTS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#f43f5e"];

function accentFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return ACTOR_ACCENTS[h % ACTOR_ACCENTS.length];
}

export interface TakesPanelProps {
  takesList: any[];
  isDirectorOrPrivileged: boolean;
  userId?: string;
  takeCacheBust?: Record<string, number>;
  calculateEndLine: (lineIndex: number, durationSeconds: number) => number;
  onDownload: (take: any) => void;
  onDelete: (takeId: string) => void;
  onSeekToTime?: (t: number) => void;
  onTrimTake?: (takeId: string, start: number, end: number) => Promise<void>;
  /** ID do clip selecionado na timeline — abre o editor e faz scroll automaticamente */
  openTakeId?: string | null;
}

export function TakesPanel({
  takesList,
  isDirectorOrPrivileged,
  userId,
  takeCacheBust = {},
  calculateEndLine,
  onDownload,
  onDelete,
  onSeekToTime,
  onTrimTake,
  openTakeId,
}: TakesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const [playingId,     setPlayingId]     = useState<string | null>(null);
  const [progress,      setProgress]      = useState(0);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId,     setEditingId]     = useState<string | null>(null);

  // ── Refs para scroll automático ao take selecionado na timeline ──────────────
  const listRef  = useRef<HTMLDivElement>(null);
  const rowRefs  = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!openTakeId) return;
    // Abrir editor (apenas para diretores com permissão de trim)
    if (isDirectorOrPrivileged && onTrimTake) {
      setEditingId(openTakeId);
    }
    // Scroll suave até a linha do take
    const row = rowRefs.current[openTakeId];
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [openTakeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter by role ──────────────────────────────────────────────────────────
  const visible = isDirectorOrPrivileged
    ? takesList
    : takesList.filter((t: any) => t.voiceActorId === userId || t.userId === userId);

  const sorted = [...visible].sort((a: any, b: any) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // ── Group by voice actor ─────────────────────────────────────────────────────
  // Chave composta: garante que contas distintas com o mesmo nome de perfil
  // nunca se agrupam — espelhando a mesma lógica de voiceActorProfiles em room.tsx.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; actorName: string; accent: string; takes: any[] }>();
    for (const take of sorted) {
      const name = take.voiceActorName || take.userName || "Dublador";
      const key  = `${take.voiceActorId || "anon"}__${name}`;
      if (!map.has(key)) {
        map.set(key, { key, actorName: name, accent: accentFor(name), takes: [] });
      }
      map.get(key)!.takes.push(take);
    }
    return Array.from(map.values());
  }, [sorted]);

  const [collapsedActors, setCollapsedActors] = useState<Set<string>>(new Set());
  const toggleActor = useCallback((key: string) => {
    setCollapsedActors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Audio playback ──────────────────────────────────────────────────────────
  const handlePlay = useCallback((take: any) => {
    if (playingId === take.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      setProgress(0);
      setCurrentTime(0);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    const audio = new Audio();
    audioRef.current = audio;
    const bust = takeCacheBust[take.id];
    audio.src = `/api/takes/${take.id}/stream?d=${take.durationSeconds || 0}${bust ? `&t=${bust}` : ""}`;
    audio.onended = () => { setPlayingId(null); setProgress(0); setCurrentTime(0); };
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    audio.play().catch(() => {});
    setPlayingId(take.id);
    setProgress(0);
    setCurrentTime(0);
    if (take.startTimeSeconds != null && onSeekToTime) {
      onSeekToTime(take.startTimeSeconds);
    }
  }, [playingId, takeCacheBust, onSeekToTime]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = frac * audio.duration;
  }, []);

  // ── Delete with inline confirm ──────────────────────────────────────────────
  const handleDelete = useCallback((takeId: string) => {
    if (confirmDelete === takeId) {
      onDelete(takeId);
      setConfirmDelete(null);
      if (playingId === takeId) {
        audioRef.current?.pause();
        setPlayingId(null);
        setProgress(0);
      }
    } else {
      setConfirmDelete(takeId);
      setTimeout(() => setConfirmDelete(id => id === takeId ? null : id), 3500);
    }
  }, [confirmDelete, onDelete, playingId]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: "#040608",
      borderTop: "1px solid rgba(255,255,255,0.035)",
      overflow: "hidden",
      minHeight: 0,
    }}>

      {/* ── Header bar ── */}
      <div style={{
        height: 30,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 6px 0 14px",
        gap: 8,
        background: "rgba(6,8,16,0.9)",
        borderBottom: `1px solid ${collapsed ? "transparent" : "rgba(255,255,255,0.04)"}`,
        cursor: "pointer",
      }}
        onClick={() => setCollapsed(c => !c)}
      >
        <button style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: 8, fontWeight: 800,
          letterSpacing: "0.18em", textTransform: "uppercase" as const,
          color: collapsed ? "#4a6080" : "#6b8aad",
          userSelect: "none" as const,
          transition: "color .15s",
        }}>
          {collapsed
            ? <ChevronRight size={10} />
            : <ChevronDown  size={10} />}
          TAKES
        </button>
        {sorted.length > 0 && (
          <span style={{
            height: 16, padding: "0 6px", borderRadius: 8,
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "inline-flex", alignItems: "center",
            fontSize: 9, fontWeight: 700, color: "#8aaed4",
            fontFamily: "ui-monospace,monospace",
          }}>
            {sorted.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {sorted.length === 0 && !collapsed && (
          <span style={{ fontSize: 9, color: "#4a6080", letterSpacing: "0.04em" }}>
            Nenhum take gravado
          </span>
        )}
      </div>

      {/* ── Takes list ── */}
      {!collapsed && <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {groups.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, padding: "20px 0",
            color: "#4a6080",
          }}>
            <Music2 size={18} strokeWidth={1.5} />
            <span style={{ fontSize: 10, letterSpacing: "0.05em" }}>Grave um take para começar</span>
          </div>
        ) : (
          groups.map(group => {
            const isCollapsed = collapsedActors.has(group.key);
            const initials = group.actorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={group.key}>
                {/* ── Actor group header ── */}
                  <div
                  onClick={() => toggleActor(group.key)}
                  style={{
                    height: 28,
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "0 10px 0 0",
                    background: `${group.accent}18`,
                    borderBottom: `1px solid ${group.accent}35`,
                    borderLeft: `3px solid ${group.accent}`,
                    cursor: "pointer",
                    userSelect: "none",
                    position: "sticky", top: 0, zIndex: 1,
                    transition: "background .12s",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginLeft: 7,
                    background: `${group.accent}38`,
                    border: `1px solid ${group.accent}70`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, fontWeight: 800, color: group.accent,
                  }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#c8d8ee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {group.actorName}
                  </span>
                  <span style={{
                    height: 14, padding: "0 5px", borderRadius: 7,
                    background: `${group.accent}30`,
                    border: `1px solid ${group.accent}55`,
                    display: "inline-flex", alignItems: "center",
                    fontSize: 8, fontWeight: 700, color: group.accent,
                    fontFamily: "ui-monospace,monospace",
                  }}>
                    {group.takes.length}
                  </span>
                  {isCollapsed
                    ? <ChevronRight size={10} color={group.accent} style={{ flexShrink: 0 }} />
                    : <ChevronDown  size={10} color={group.accent} style={{ flexShrink: 0 }} />}
                </div>

                {/* ── Takes within this group ── */}
                {!isCollapsed && group.takes.map((take: any, idx: number) => {
            const isPlaying    = playingId === take.id;
            const isConfirming = confirmDelete === take.id;
            const accent       = group.accent;
            const endLine      = calculateEndLine(take.lineIndex ?? 0, take.durationSeconds ?? 0);
            const takeNum      = group.takes.length - idx;
            const dur          = take.durationSeconds ? Number(take.durationSeconds) : 0;

            const isSelected = openTakeId === take.id;

            return (
              <div
                key={take.id}
                ref={el => { rowRefs.current[take.id] = el; }}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.055)",
                  background: isPlaying
                    ? `${accent}20`
                    : isSelected
                      ? `${accent}14`
                      : "#0d1119",
                  borderLeft: isSelected ? `3px solid ${accent}` : "3px solid transparent",
                  transition: "background .2s, border-left-color .2s",
                }}
              >
                {/* ── Main row ── */}
                <div style={{
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "0 10px",
                }}>

                  {/* Actor stripe */}
                  <div style={{
                    width: 2, height: 20, borderRadius: 1,
                    background: accent,
                    opacity: isPlaying ? 1 : 0.7,
                    flexShrink: 0,
                    boxShadow: isPlaying ? `0 0 6px ${accent}88` : "none",
                    transition: "all .2s",
                  }} />

                  {/* Index */}
                  <span style={{
                    fontSize: 8, fontWeight: 700, color: "#5a7a9a",
                    fontFamily: "ui-monospace,monospace",
                    width: 18, textAlign: "right", flexShrink: 0,
                    letterSpacing: "0.02em",
                  }}>
                    #{takeNum}
                  </span>

                  {/* ── Play button ── */}
                  <button
                    onClick={() => handlePlay(take)}
                    data-testid={`button-play-take-panel-${take.id}`}
                    title={isPlaying ? "Parar" : "Reproduzir take"}
                    style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${isPlaying ? accent + "70" : "rgba(255,255,255,0.14)"}`,
                      background: isPlaying ? `${accent}30` : "rgba(255,255,255,0.06)",
                      color: isPlaying ? accent : "#7a9ab8",
                      cursor: "pointer",
                      transition: "all .12s",
                    }}
                  >
                    {isPlaying
                      ? <Pause size={9} />
                      : <Play size={9} style={{ marginLeft: 1 }} />
                    }
                  </button>

                  {/* ── Info block ── */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    display: "flex", alignItems: "center", gap: 5,
                    overflow: "hidden",
                  }}>
                    {/* Character */}
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: "#f0f0f0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: 110,
                    }}>
                      {take.characterName || "Take"}
                    </span>

                    <ChevronRight size={9} color="#4a6a8a" style={{ flexShrink: 0 }} />

                    {/* Line range */}
                    <span style={{
                      fontSize: 11, color: "#888888",
                      fontFamily: "ui-monospace,monospace",
                      flexShrink: 0, marginLeft: 2,
                    }}>
                      L{take.lineIndex ?? 0}→{endLine}
                    </span>

                    {/* Duration */}
                    <span style={{
                      marginLeft: "auto", flexShrink: 0,
                      fontSize: 11, fontWeight: 600, color: "#888888",
                      fontFamily: "ui-monospace,monospace",
                    }}>
                      {dur > 0 ? `${dur.toFixed(1)}s` : "—"}
                    </span>
                  </div>

                  {/* ── Download ── */}
                  <button
                    onClick={() => onDownload(take)}
                    data-testid={`button-download-take-panel-${take.id}`}
                    title="Baixar take"
                    style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)", color: "#6a8aaa",
                      cursor: "pointer", transition: "all .12s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#c0d8f0";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#6a8aaa";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                  >
                    <Download size={10} />
                  </button>

                  {/* ── Edit (director only) ── */}
                  {isDirectorOrPrivileged && onTrimTake && (
                    <button
                      onClick={() => {
                        if (playingId === take.id) {
                          audioRef.current?.pause();
                          setPlayingId(null);
                          setProgress(0);
                        }
                        setEditingId(prev => prev === take.id ? null : take.id);
                      }}
                      title={editingId === take.id ? "Fechar editor" : "Editar take"}
                      style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${editingId === take.id ? accent + "70" : "rgba(255,255,255,0.12)"}`,
                        background: editingId === take.id ? `${accent}30` : "rgba(255,255,255,0.04)",
                        color: editingId === take.id ? accent : "#6a8aaa",
                        cursor: "pointer", transition: "all .12s",
                      }}
                      onMouseEnter={e => {
                        if (editingId !== take.id) {
                          (e.currentTarget as HTMLButtonElement).style.color = "#c0d8f0";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingId !== take.id) {
                          (e.currentTarget as HTMLButtonElement).style.color = "#6a8aaa";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                        }
                      }}
                    >
                      <Scissors size={10} />
                    </button>
                  )}

                  {/* ── Delete (director only) ── */}
                  {isDirectorOrPrivileged && (
                    <button
                      onClick={() => handleDelete(take.id)}
                      data-testid={`button-delete-take-panel-${take.id}`}
                      title={isConfirming ? "Confirmar exclusão?" : "Excluir take"}
                      style={{
                        width: isConfirming ? 36 : 24,
                        height: 24, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${isConfirming ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.12)"}`,
                        background: isConfirming ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.04)",
                        color: isConfirming ? "#f87171" : "#6a8aaa",
                        cursor: "pointer",
                        transition: "all .15s",
                        fontSize: isConfirming ? 8 : undefined,
                        fontWeight: isConfirming ? 800 : undefined,
                        letterSpacing: isConfirming ? "0.04em" : undefined,
                        overflow: "hidden",
                      }}
                      onMouseEnter={e => {
                        if (!isConfirming) {
                          (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.14)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isConfirming) {
                          (e.currentTarget as HTMLButtonElement).style.color = "#6a8aaa";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                        }
                      }}
                    >
                      {isConfirming ? "DEL?" : <Trash2 size={10} />}
                    </button>
                  )}
                </div>

                {/* ── Progress bar (when playing) ── */}
                {isPlaying && (
                  <div style={{
                    height: 4,
                    margin: "0 10px 5px 35px",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <div
                      style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                        cursor: "pointer", overflow: "hidden",
                      }}
                      onClick={handleProgressClick}
                    >
                      <div style={{
                        height: "100%",
                        width: `${(progress * 100).toFixed(1)}%`,
                        background: accent,
                        borderRadius: 2,
                        transition: "width .1s linear",
                      }} />
                    </div>
                    <span style={{
                      fontSize: 8, fontFamily: "ui-monospace,monospace",
                      color: "#7a9ab8", flexShrink: 0,
                    }}>
                      {fmtTime(currentTime)}{dur > 0 ? ` / ${fmtTime(dur)}` : ""}
                    </span>
                  </div>
                )}

                {/* ── Inline waveform editor ── */}
                {editingId === take.id && onTrimTake && (
                  <div style={{
                    margin: "0 10px 8px 10px",
                    padding: "10px 10px 8px",
                    borderRadius: 8,
                    background: "#0a0e18",
                    border: `1px solid ${accent}40`,
                  }}>
                    <TakeWaveformEditor
                      audioUrl={`/api/takes/${take.id}/stream?d=${dur}${takeCacheBust[take.id] ? `&t=${takeCacheBust[take.id]}` : ""}`}
                      durationSeconds={dur}
                      onTrim={async (start, end) => {
                        await onTrimTake(take.id, start, end);
                        setEditingId(null);
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          height: 24, padding: "0 10px", borderRadius: 6,
                          fontSize: 10, fontWeight: 600,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.05)", color: "#8aaabf",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
              </div>
            );
          })
        )}
      </div>}
    </div>
  );
}
