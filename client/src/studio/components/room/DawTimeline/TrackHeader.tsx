interface TrackHeaderProps {
  index: number;
  label: string;
  character: string;
  lineText?: string;
  isMuted: boolean;
  isSoloed: boolean;
  isArmed: boolean;
  isRecording: boolean;
  volume: number;
  onMute: () => void;
  onSolo: () => void;
  onArm: () => void;
  onVolumeChange: (v: number) => void;
  isMaster?: boolean;
  accentColor?: string;
}

export function TrackHeader({
  index, label, character, lineText,
  isMuted, isSoloed, isArmed, isRecording,
  volume, onMute, onSolo, onArm, onVolumeChange,
  isMaster = false, accentColor = "#3b82f6",
}: TrackHeaderProps) {

  const isHot = isArmed || isRecording;
  const bg = isHot ? "#180808" : isMaster ? "#080e1c" : "#0d1120";
  const stripeColor = isHot ? "#ef4444" : accentColor;

  // Iniciais do label (máximo 2 chars)
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div style={{
      width: "100%", height: "100%",
      background: bg,
      borderRight: "1px solid #1e2640",
      borderBottom: "1px solid #1e2640",
      display: "flex", flexDirection: "row",
      boxSizing: "border-box",
      transition: "background .2s",
      overflow: "hidden",
    }}>
      {/* Stripe colorida lateral */}
      <div style={{
        width: 4, flexShrink: 0,
        background: stripeColor,
        opacity: isHot ? 1 : 0.7,
        boxShadow: `0 0 8px ${stripeColor}66`,
        transition: "all .2s",
      }} />

      {/* Conteúdo */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 6,
        padding: "8px 8px 8px 8px",
        minWidth: 0,
      }}>
        {/* Linha topo: avatar + nome + indicador */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Avatar com iniciais */}
          <div style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${stripeColor}44, ${stripeColor}22)`,
            border: `1px solid ${stripeColor}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, fontWeight: 800, color: stripeColor,
            letterSpacing: "0.03em",
            boxShadow: isHot ? `0 0 8px ${stripeColor}44` : "none",
          }}>
            {isMaster ? "M" : initials}
          </div>

          {/* Nome */}
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: isHot ? "#fca5a5" : "#ffffff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
            letterSpacing: "0.01em",
          }}>
            {label}
          </span>

          {/* Status dot */}
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: isHot ? "#ef4444" : isMuted ? "#f59e0b" : "#22c55e",
            boxShadow: `0 0 5px ${isHot ? "#ef444488" : isMuted ? "#f59e0b88" : "#22c55e88"}`,
            animation: isRecording ? "dtl-rec-dot .9s ease-in-out infinite" : "none",
          }} />
        </div>

        {/* Personagem / lineText */}
        {!isMaster && (character || lineText) && (
          <div style={{
            fontSize: 12, lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            paddingLeft: 30,
            color: character ? "#aaaaaa" : "#666666",
            fontWeight: 500,
          }}>
            {character || lineText}
          </div>
        )}
      </div>
    </div>
  );
}
