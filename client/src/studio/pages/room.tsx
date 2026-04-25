import { useParams, Link } from "wouter";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { authFetch } from "@studio/lib/auth-fetch";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  ArrowLeft,
  Circle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Trash2,
  AlertCircle,
  RotateCcw,
  RotateCw,
  Repeat,
  Settings,
  X,
  Check,
  Monitor,
  User,
  Edit3,
  Download,
  Navigation,
} from "lucide-react";
import { useToast } from "@studio/hooks/use-toast";
import { useAuth } from "@studio/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@studio/components/ui/dialog";
import { Button } from "@studio/components/ui/button";
import { Textarea } from "@studio/components/ui/textarea";
import { formatTimecode, parseTimecode, parseUniversalTimecodeToSeconds } from "@studio/lib/timecode";
import { TakeWaveformEditor } from "@studio/components/audio/TakeWaveformEditor";
import { AudioTimelinePositioner } from "@studio/components/audio/AudioTimelinePositioner";
import { cn } from "@studio/lib/utils";

import {
  requestMicrophone,
  releaseMicrophone,
  setGain,
  getAnalyserData,
  type MicrophoneState,
  type VoiceCaptureMode,
} from "@studio/lib/audio/microphoneManager";
import MonitorPanel from "@studio/components/audio/MonitorPanel";


import {
  startCapture,
  stopCapture,
  createPreviewUrl,
  revokePreviewUrl,
  playCountdownBeep,
  type RecordingStatus,
  type RecordingResult,
} from "@studio/lib/audio/recordingEngine";
import { encodeWav, wavToBlob, getDurationSeconds } from "@studio/lib/audio/wavEncoder";
import { analyzeTakeQuality, type QualityMetrics } from "@studio/lib/audio/qualityAnalysis";
import { DailyMeetPanel, CountdownOverlay, DeviceSettingsPanel, type DeviceSettings } from "@studio/components/room";
import { useUserRole } from "@studio/hooks/useUserRole";

interface ScriptLine {
  character: string;
  start: number;
  text: string;
  end?: number;
}

interface RecordingProfile {
  voiceActorName: string;
  characterName: string;
  characterId: string;
  voiceActorId: string;
  userId: string;
  sessionId: string;
  productionId: string;
}

interface Shortcuts {
  playPause: string;
  record: string;
  stop: string;
  loop: string;
  back: string;
  forward: string;
}

const DEFAULT_SHORTCUTS: Shortcuts = {
  playPause: "Space",
  record: "KeyR",
  stop: "KeyS",
  loop: "KeyL",
  back: "ArrowLeft",
  forward: "ArrowRight",
};

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  playPause: "Reproduzir / Pausar",
  record: "Gravar",
  stop: "Parar",
  loop: "Alternar Loop",
  back: "Voltar 2s",
  forward: "Avancar 2s",
};

function keyLabel(code: string): string {
  const map: Record<string, string> = {
    Space: "Space",
    ArrowLeft: "\u2190",
    ArrowRight: "\u2192",
    ArrowUp: "\u2191",
    ArrowDown: "\u2193",
    Escape: "Esc",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

function useSessionData(studioId: string, sessionId: string) {
  return useQuery({
    queryKey: ["/api/studios", studioId, "sessions", sessionId],
    queryFn: () => authFetch(`/api/studios/${studioId}/sessions/${sessionId}`),
    enabled: !!studioId && !!sessionId,
  });
}

function useProductionScript(studioId: string, productionId?: string) {
  return useQuery({
    queryKey: ["/api/studios", studioId, "productions", productionId],
    queryFn: () =>
      authFetch(`/api/studios/${studioId}/productions/${productionId}`),
    enabled: !!studioId && !!productionId,
  });
}

function useCharactersList(productionId?: string) {
  return useQuery({
    queryKey: ["/api/productions", productionId, "characters"],
    queryFn: () =>
      authFetch(`/api/productions/${productionId}/characters`) as Promise<
        Array<{ id: string; name: string; voiceActorId: string | null }>
      >,
    enabled: !!productionId,
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toSeconds3 = (s: number) => Math.round(s * 1000) / 1000;

function RecordingProfilePanel({
  characters,
  user,
  sessionId,
  productionId,
  onSave,
  onClose,
  existingProfile,
}: {
  characters: Array<{ id: string; name: string; voiceActorId: string | null }>;
  user: any;
  sessionId: string;
  productionId: string;
  onSave: (profile: RecordingProfile) => void;
  onClose?: () => void;
  existingProfile?: RecordingProfile | null;
}) {
  const [actorName, setActorName] = useState(
    existingProfile?.voiceActorName || user?.displayName || user?.fullName || ""
  );
  const [selectedCharId, setSelectedCharId] = useState(
    existingProfile?.characterId || (characters.length > 0 ? characters[0].id : "")
  );
  const [freeCharName, setFreeCharName] = useState(existingProfile?.characterName || "");

  const { toast } = useToast();
  const selectedChar = characters.find((c) => c.id === selectedCharId);
  const hasCharacters = characters.length > 0;
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!actorName.trim()) return;
    if (hasCharacters && selectedChar) {
      // Se o ID vier do script (não é UUID real), persiste o personagem no banco primeiro
      if (!UUID_REGEX.test(selectedChar.id)) {
        setIsCreating(true);
        try {
          const created = await authFetch(`/api/productions/${productionId}/characters`, {
            method: "POST",
            body: JSON.stringify({ name: selectedChar.name, productionId }),
          });
          onSave({
            voiceActorName: actorName.trim(),
            characterName: selectedChar.name,
            characterId: created.id,
            voiceActorId: user?.id || "",
            userId: user?.id || "",
            sessionId,
            productionId,
          });
        } catch (err: any) {
          toast({ title: "Erro ao criar personagem", description: err?.message || "Tente novamente", variant: "destructive" });
        } finally {
          setIsCreating(false);
        }
        return;
      }
      onSave({
        voiceActorName: actorName.trim(),
        characterName: selectedChar.name,
        characterId: selectedChar.id,
        voiceActorId: selectedChar.voiceActorId || user?.id || "",
        userId: user?.id || "",
        sessionId,
        productionId,
      });
    } else if (freeCharName.trim()) {
      setIsCreating(true);
      try {
        const created = await authFetch(`/api/productions/${productionId}/characters`, {
          method: "POST",
          body: JSON.stringify({ name: freeCharName.trim(), productionId }),
        });
        onSave({
          voiceActorName: actorName.trim(),
          characterName: freeCharName.trim(),
          characterId: created.id,
          voiceActorId: user?.id || "",
          userId: user?.id || "",
          sessionId,
          productionId,
        });
      } catch (err: any) {
        toast({ title: "Erro ao criar personagem", description: err?.message || "Tente novamente", variant: "destructive" });
      } finally {
        setIsCreating(false);
      }
    }
  };

  const canSubmit = !isCreating && actorName.trim() && (hasCharacters ? !!selectedCharId : freeCharName.trim());

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[440px] overflow-hidden glass-panel shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Perfil de Gravacao</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="transition-colors text-muted-foreground hover:text-foreground" data-testid="button-close-profile">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Configure seu perfil antes de gravar. Estes dados serao usados automaticamente em todos os takes.
          </p>

          <div>
            <label className="vhub-label mb-1.5 block">
              Nome do Dublador
            </label>
            <input
              type="text"
              value={actorName}
              onChange={(e) => setActorName(e.target.value)}
              placeholder="Seu nome artistico"
              className="w-full h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
              data-testid="input-actor-name"
            />
          </div>

          <div>
            <label className="vhub-label mb-1.5 block">
              Personagem
            </label>
            {hasCharacters ? (
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
                data-testid="select-character"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={freeCharName}
                onChange={(e) => setFreeCharName(e.target.value)}
                placeholder="Nome do personagem"
                className="w-full h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
                data-testid="input-character-name"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="vhub-label mb-1 block">ID Usuario</label>
              <div className="h-8 rounded-lg px-3 flex items-center text-xs font-mono truncate bg-muted/30 text-muted-foreground" data-testid="text-user-id">
                {user?.id?.slice(0, 12)}...
              </div>
            </div>
            <div>
              <label className="vhub-label mb-1 block">Sessao</label>
              <div className="h-8 rounded-lg px-3 flex items-center text-xs font-mono truncate bg-muted/30 text-muted-foreground" data-testid="text-session-id">
                {sessionId?.slice(0, 12)}...
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-border/50">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="vhub-btn-sm vhub-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-save-profile"
          >
            {isCreating ? "Criando personagem..." : "Iniciar Gravacao"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordingRoom() {
  const { studioId, sessionId } = useParams<{ studioId: string; sessionId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentLine, setCurrentLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [loopSelectionMode, setLoopSelectionMode] = useState<"idle" | "selecting-start" | "selecting-end">("idle");
  const [customLoop, setCustomLoop] = useState<{ start: number; end: number } | null>(null);
  const [preRoll, setPreRoll] = useState(3);
  const [postRoll, setPostRoll] = useState(3);
  const [showOnlyMyCharacter, setShowOnlyMyCharacter] = useState(false);
  const [scriptFontScale, setScriptFontScale] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("vhub_script_font_scale"));
      return isNaN(v) || v === 0 ? 1 : Math.min(2, Math.max(0.6, v));
    } catch { return 1; }
  });
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("vhub_split_ratio"));
      return isNaN(v) || v === 0 ? 0.625 : Math.min(0.80, Math.max(0.25, v));
    } catch { return 0.625; }
  });

  const [shortcuts, setShortcuts] = useState<Shortcuts>(() => {
    try {
      const saved = localStorage.getItem("vhub_shortcuts");
      return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });
  const [pendingShortcuts, setPendingShortcuts] = useState<Shortcuts>(shortcuts);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [listeningFor, setListeningFor] = useState<keyof Shortcuts | null>(null);
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
    const defaults: DeviceSettings = { inputDeviceId: "", outputDeviceId: "", inputGain: 1, monitorVolume: 0.8, voiceCaptureMode: "original" };
    try {
      const saved = localStorage.getItem("vhub_device_settings");
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  const [recordingProfile, setRecordingProfile] = useState<RecordingProfile | null>(() => {
    if (!sessionId) return null;
    try {
      const saved = localStorage.getItem(`vhub_rec_profile_${sessionId}`);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!parsed.characterId || !isValidUuid.test(parsed.characterId)) {
        localStorage.removeItem(`vhub_rec_profile_${sessionId}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSessionData(studioId, sessionId);
  const { data: production, isLoading: productionLoading } = useProductionScript(studioId, session?.productionId);
  const { data: charactersList } = useCharactersList(session?.productionId);

  const scriptLines: ScriptLine[] = useMemo(() => {
    if (!production?.scriptJson) return [];
    try {
      const parsed = JSON.parse(production.scriptJson);
      let rawLines: Array<any>;
      if (Array.isArray(parsed)) {
        rawLines = parsed;
      } else if (parsed.lines && Array.isArray(parsed.lines)) {
        rawLines = parsed.lines;
      } else {
        return [];
      }

      const normalized = rawLines.map((line: any) => {
        const character = line.character || line.personagem || line.char || "";
        const text = line.text || line.fala || line.dialogue || line.dialog || "";

        if (typeof line.tempoEmSegundos === "number" && Number.isFinite(line.tempoEmSegundos)) {
          return { character, start: toSeconds3(line.tempoEmSegundos), text };
        }

        const rawTime = line.tempo ?? line.start ?? line.timecode ?? line.tc ?? "00:00:00";
        try {
          return { character, start: toSeconds3(parseUniversalTimecodeToSeconds(rawTime, 24)), text };
        } catch {
          return { character, start: toSeconds3(parseTimecode(rawTime)), text };
        }
      });

      const sorted = [...normalized]
        .sort((a, b) => a.start - b.start);
      return sorted.map((line, i) => ({
        ...line,
        end: Math.max(sorted[i + 1]?.start ?? (line.start + 10), line.start + 0.001),
      }));
    } catch (e) {
      console.error("[Room] Failed to parse scriptJson:", e);
      return [];
    }
  }, [production?.scriptJson]);

  // Personagens extraídos diretamente do scriptJson — usados quando o banco não tem characters cadastrados
  const scriptCharacters = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; voiceActorId: null }> = [];
    for (const line of scriptLines) {
      const name = line.character?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // ID determinístico baseado no nome — evita criar duplicatas entre renders
      result.push({ id: `script-char-${key.replace(/\s+/g, "-")}`, name, voiceActorId: null });
    }
    return result;
  }, [scriptLines]);

  // Script é sempre a fonte da verdade; banco fornece UUID real se o personagem já existir pelo nome
  const effectiveCharactersList = useMemo(() => {
    if (!scriptCharacters.length) return charactersList || [];
    const dbByName = new Map(
      (charactersList || []).map(c => [c.name.toLowerCase().trim(), c])
    );
    return scriptCharacters.map(sc => {
      const dbMatch = dbByName.get(sc.name.toLowerCase().trim());
      return dbMatch ?? sc;
    });
  }, [scriptCharacters, charactersList]);

  // Conjunto de todas as linhas com o mesmo start que currentLine (falas simultâneas)
  const currentLines = useMemo(() => {
    const base = scriptLines[currentLine];
    if (!base) return new Set([currentLine]);
    const set = new Set<number>();
    for (let i = 0; i < scriptLines.length; i++) {
      if (Math.abs((scriptLines[i]?.start ?? -1) - base.start) < 0.1) set.add(i);
    }
    return set;
  }, [scriptLines, currentLine]);

  const calculateEndLine = useCallback((startLineIndex: number, durationSeconds: number): number => {
    if (!scriptLines.length || startLineIndex >= scriptLines.length) return startLineIndex;
    
    const startLine = scriptLines[startLineIndex];
    if (!startLine) return startLineIndex;
    
    const endTime = startLine.start + durationSeconds;
    
    let endLineIndex = startLineIndex;
    for (let i = startLineIndex; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      if (!line) break;
      
      if (line.start <= endTime) {
        endLineIndex = i;
      } else {
        break;
      }
    }
    
    return endLineIndex;
  }, [scriptLines]);

  const { data: takesList = [], refetch: refetchTakes } = useQuery({
    queryKey: ["/api/sessions", sessionId, "takes"],
    queryFn: () => authFetch(`/api/sessions/${sessionId}/takes`),
    enabled: !!sessionId,
  });

  const deleteTakeMutation = useMutation({
    mutationFn: (takeId: string) =>
      authFetch(`/api/takes/${takeId}`, { method: "DELETE" }),
    onSuccess: () => {
      refetchTakes();
      toast({ title: "Take excluido" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao excluir take", description: err?.message || "Permissao negada", variant: "destructive" });
    },
  });

  const updateScriptLineMutation = useMutation({
    mutationFn: async ({ lineIndex, text }: { lineIndex: number; text: string }) => {
      if (!production?.id || !production?.scriptJson) throw new Error("Roteiro nao carregado");
      const target = scriptLines[lineIndex];
      if (!target) throw new Error("Linha invalida");

      const parsed = JSON.parse(production.scriptJson);
      const rawLines: Array<any> = Array.isArray(parsed) ? parsed : (parsed?.lines && Array.isArray(parsed.lines) ? parsed.lines : []);
      if (!rawLines.length) throw new Error("Formato de roteiro invalido");

      const idx = rawLines.findIndex((l: any) => {
        const rawTime = l.tempo ?? l.start ?? l.timecode ?? l.tc ?? "00:00:00";
        const st = typeof l.tempoEmSegundos === "number" && Number.isFinite(l.tempoEmSegundos)
          ? toSeconds3(l.tempoEmSegundos)
          : (() => {
              try {
                return toSeconds3(parseUniversalTimecodeToSeconds(rawTime, 24));
              } catch {
                return toSeconds3(parseTimecode(rawTime));
              }
            })();
        const ch = String(l.character || l.personagem || l.char || "");
        return Math.abs(st - target.start) <= 0.0005 && ch.toLowerCase() === String(target.character || "").toLowerCase();
      });
      const targetIdx = idx >= 0 ? idx : lineIndex;
      if (!rawLines[targetIdx]) throw new Error("Linha nao encontrada no roteiro");

      const updatedLine = { ...rawLines[targetIdx] };
      if ("text" in updatedLine) {
        updatedLine.text = text;
      } else if ("fala" in updatedLine) {
        updatedLine.fala = text;
      } else {
        updatedLine.text = text;
      }

      const nextLines = [...rawLines];
      nextLines[targetIdx] = updatedLine;

      const nextScriptJson = Array.isArray(parsed)
        ? JSON.stringify(nextLines)
        : JSON.stringify({ ...parsed, lines: nextLines });

      return authFetch(`/api/studios/${studioId}/productions/${production.id}`, {
        method: "PATCH",
        body: JSON.stringify({ scriptJson: nextScriptJson }),
      });
    },
    onSuccess: (_data, variables) => {
      setLineEdits((prev) => ({ ...prev, [variables.lineIndex]: variables.text }));
      setEditingLineIndex(null);
      setEditingLineText("");
      queryClient.invalidateQueries({ queryKey: ["/api/studios", studioId, "productions", production?.id] });
      toast({ title: "Linha atualizada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar edicao", description: err?.message || "Falha", variant: "destructive" });
    },
  });

  const handleDownloadTake = useCallback(async (take: any) => {
    try {
      const res = await fetch(`/api/takes/${take.id}/download`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao baixar take");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = take.filename || `take_${take.id}.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: "Falha ao baixar take", variant: "destructive" });
    }
  }, [toast]);

  const [savedTakes, setSavedTakes] = useState<Set<number>>(new Set());
  const [takeCount, setTakeCount] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [countdownValue, setCountdownValue] = useState(0);
  const [lastRecording, setLastRecording] = useState<RecordingResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [micState, setMicState] = useState<MicrophoneState | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  // Approval system states
  const [pendingApprovalTake, setPendingApprovalTake] = useState<{
    takeId: string;
    audioUrl: string;
    startTimeSeconds: number;
    durationSeconds: number;
    lineIndex: number;
    characterName: string;
    voiceActorName: string;
    voiceActorId: string;
  } | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [directorFeedback, setDirectorFeedback] = useState<string>('');
  const [approvalOffset, setApprovalOffset] = useState<number>(0);
  const approvalAudioRef = useRef<HTMLAudioElement | null>(null);
  const approvalPreviewCleanupRef = useRef<(() => void) | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingStartTimecodeRef = useRef(0);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scriptViewportRef = useRef<HTMLDivElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const splitRatioRef = useRef(0.625);
  const isDraggingRef = useRef(false);
  const [scriptAutoFollow, setScriptAutoFollow] = useState(false);
  const scriptAutoFollowRef = useRef(false);
  const scriptProgrammaticScrollRef = useRef(false);
  const scriptUserScrollIntentRef = useRef(false);
  const scriptUserScrollIntentTimerRef = useRef<number | null>(null);
  const telepromptRafRef = useRef<number | null>(null);
  const telepromptLastTsRef = useRef<number | null>(null);
  const telepromptScriptRef = useRef<ScriptLine[]>([]);
  const telepromptVideoTimeRef = useRef(0);
  const telepromptCurrentLineRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prerollRafRef = useRef<number | null>(null);
  const prerollCaptureStartedRef = useRef(false);
  const lastCountdownValueRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const loopStartRef = useRef<number>(0);
  const isRemoteAction = useRef(false);
  const wsReconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const doc = document as any;
    const exit = () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === "function") {
        try {
          doc.webkitExitFullscreen();
        } catch {}
      }
    };

    const onChange = () => {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        exit();
      }
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as any);
    };
  }, []);

  const [globalControlEnabled, setGlobalControlEnabled] = useState(false);
  const [controlPermissions, setControlPermissions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`vhub_control_perm_${sessionId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [controlMenuOpen, setControlMenuOpen] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<Array<{ userId: string; name: string; role?: string }>>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [textControllerUserIds, setTextControllerUserIds] = useState<Set<string>>(new Set());
  const [textControlPopupOpen, setTextControlPopupOpen] = useState(false);
  const [pendingTextControllerUserIds, setPendingTextControllerUserIds] = useState<Set<string>>(new Set());
  const [prerollTargetTime, setPrerollTargetTime] = useState<number | null>(null);
  const [prerollInitiatorUserId, setPrerollInitiatorUserId] = useState<string | null>(null);
  const [takesPopupOpen, setTakesPopupOpen] = useState(false);
  const [editingTakeId, setEditingTakeId] = useState<string | null>(null);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingLineText, setEditingLineText] = useState("");
  const [lineEdits, setLineEdits] = useState<Record<number, string>>({});
  const [takePreviewId, setTakePreviewId] = useState<string | null>(null);
  const takePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [takeCacheBust, setTakeCacheBust] = useState<Record<string, number>>({});
  const [takePreviewProgress, setTakePreviewProgress] = useState(0);


  // Unified role checks via hook
  const { sessionRole: myStudioRole, isPrivileged, isDirector } = useUserRole({ user, session });

  const canControl = useMemo(() => {
    return isPrivileged || globalControlEnabled || controlPermissions.has(user?.id || "");
  }, [isPrivileged, globalControlEnabled, controlPermissions, user]);

  const canTextControl = useMemo(() => {
    if (isPrivileged || isDirector) return true;
    return Boolean(user?.id && textControllerUserIds.has(user.id));
  }, [isPrivileged, isDirector, textControllerUserIds, user?.id]);

  const presenceRoster = useMemo(() =>
    presenceUsers.length
      ? presenceUsers
      : (session?.participants || []).map((p: any) => ({
          userId: p.userId,
          name: p.user?.fullName || p.user?.displayName || p.user?.email || "Usuario",
          role: p.role,
        })),
    [presenceUsers, session?.participants]
  );

  const loopRange = useMemo(() => {
    if (!isLooping) return null;
    if (customLoop) return customLoop;
    const line = scriptLines[currentLine];
    if (!line) return null;
    return {
      start: Math.max(0, line.start - preRoll),
      end: (line.end ?? line.start) + postRoll,
    };
  }, [isLooping, customLoop, scriptLines, currentLine, preRoll, postRoll]);

  const cancelPreroll = useCallback(() => {
    if (prerollRafRef.current) {
      cancelAnimationFrame(prerollRafRef.current);
      prerollRafRef.current = null;
    }
    prerollCaptureStartedRef.current = false;
    lastCountdownValueRef.current = 0;
    setPrerollTargetTime(null);
    setPrerollInitiatorUserId(null);
    setCountdownValue(0);
  }, []);

  const emitTextControlEvent = useCallback(
    (type: string, payload: any) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type, ...payload }));
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const state = await requestMicrophone(deviceSettings.voiceCaptureMode, deviceSettings.inputDeviceId);
        setGain(state, deviceSettings.inputGain);
        setMicState(state);
        setMicReady(true);
      } catch {
        toast({
          title: "Acesso ao microfone negado",
          description: "Permita o acesso ao microfone para gravar takes.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      releaseMicrophone();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (prerollRafRef.current) cancelAnimationFrame(prerollRafRef.current);
      if (telepromptRafRef.current) cancelAnimationFrame(telepromptRafRef.current);
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      if (scriptUserScrollIntentTimerRef.current) clearTimeout(scriptUserScrollIntentTimerRef.current);
      
      // Cleanup preview URLs to prevent memory leaks
      if (previewUrl) {
        try {
          revokePreviewUrl(previewUrl);
        } catch (e) {
          console.warn("Failed to revoke preview URL:", e);
        }
      }
      
      // Cleanup audio elements
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
        previewAudioRef.current = null;
      }
      if (approvalAudioRef.current) {
        approvalAudioRef.current.pause();
        approvalAudioRef.current.src = "";
        approvalAudioRef.current = null;
      }
      if (takePreviewAudioRef.current) {
        takePreviewAudioRef.current.pause();
        takePreviewAudioRef.current.src = "";
        takePreviewAudioRef.current = null;
      }
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (micState) {
      setGain(micState, deviceSettings.inputGain);
    }
  }, [micState, deviceSettings.inputGain]);

  useEffect(() => {
    if (!sessionId || !user?.id) return;

    let destroyed = false;
    let reconnectDelay = 1000;
    const maxReconnectDelay = 30000;

    const connect = () => {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const role = encodeURIComponent(myStudioRole || String(user?.role || ""));
      const name = encodeURIComponent(String((user as any)?.fullName || (user as any)?.displayName || (user as any)?.email || "Usuario"));
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/video-sync?sessionId=${sessionId}&userId=${encodeURIComponent(user.id)}&role=${role}&name=${name}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        reconnectDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            currentTime?: number;
            lineIndex?: number;
            targetUserId?: string;
            targetUserIds?: string[];
            permissions?: string[];
            loopRange?: { start: number; end: number } | null;
            globalControl?: boolean;
            users?: Array<{ userId: string; name: string; role?: string }>;
            controllerUserId?: string | null;
            controllerUserIds?: string[];
            startedByUserId?: string;
            targetTime?: number;
            takeId?: string;
            voiceActorId?: string;
            voiceActorName?: string;
            characterName?: string;
            audioUrl?: string;
            startTimeSeconds?: number;
            durationSeconds?: number;
            feedback?: string;
            isFinal?: boolean;
          };

          // Permission updates
          if (msg.type === "permission-sync" && Array.isArray(msg.permissions)) {
            isRemoteAction.current = true;
            setControlPermissions(new Set(msg.permissions));
            if (typeof msg.globalControl === "boolean") setGlobalControlEnabled(msg.globalControl);
            isRemoteAction.current = false;
            return;
          }
          if (msg.type === "presence-sync" && Array.isArray(msg.users)) {
            setPresenceUsers(msg.users);
            return;
          }
          if (msg.type === "text-control:state") {
            const incoming = Array.isArray(msg.controllerUserIds)
              ? msg.controllerUserIds
              : (msg.controllerUserId ? [msg.controllerUserId] : []);
            setTextControllerUserIds(new Set(incoming.filter(Boolean)));
            
            // Show toast if user gained text control permission
            if (!isPrivileged && incoming.includes(user?.id || "")) {
              toast({ 
                title: "Controle de Texto Concedido",
                description: "Você agora pode clicar nas linhas e editar o roteiro."
              });
            }
            return;
          }
          if (msg.type === "recording:preroll") {
            if (typeof msg.targetTime !== "number") return;
            if (typeof msg.startedByUserId !== "string" || !msg.startedByUserId) return;
            setPrerollTargetTime(msg.targetTime);
            setPrerollInitiatorUserId(msg.startedByUserId);
            return;
          }
          if (msg.type === "text-control:update-line") {
            const idx = (msg as any).lineIndex;
            const text = (msg as any).text;
            if (typeof idx === "number" && typeof text === "string") {
              setLineEdits((prev) => ({ ...prev, [idx]: text }));
              if (editingLineIndex === idx) {
                setEditingLineIndex(null);
                setEditingLineText("");
              }
            }
            return;
          }
          if (msg.type === "permission-granted" || msg.type === "grant-permission") {
            if (msg.targetUserId) {
              setControlPermissions((prev) => {
                const next = new Set(prev);
                next.add(msg.targetUserId!);
                return next;
              });
            }
          } else if (msg.type === "permission-revoked" || msg.type === "revoke-permission") {
            if (msg.targetUserId) {
              setControlPermissions((prev) => {
                const next = new Set(prev);
                next.delete(msg.targetUserId!);
                return next;
              });
            }
          }

          if (msg.type === "sync-loop") {
            setCustomLoop(msg.loopRange ?? null);
            setIsLooping(!!msg.loopRange);
            if (msg.loopRange && videoRef.current) {
              videoRef.current.currentTime = msg.loopRange.start;
            }
            return;
          }

          if (msg.type === "toggle-global-control") {
            setGlobalControlEnabled(!!msg.globalControl);
            if (msg.globalControl) {
              toast({ title: "Controle Livre", description: "Todos os participantes podem agora controlar o player e o roteiro." });
            } else {
              toast({ title: "Controle Restrito", description: "O controle global foi desativado." });
            }
            return;
          }

          if (msg.type === "revoke-all") {
            setControlPermissions(new Set());
            setGlobalControlEnabled(false);
            toast({ title: "Permissoes Revogadas", description: "Todas as permissoes temporarias foram removidas." });
            return;
          }

          if (msg.type === "take:pending-approval") {
            // Director receives notification of new take to approve
            if (isDirector && msg.voiceActorId !== user?.id) {
              const incomingStart = msg.startTimeSeconds ?? 0;
              setPendingApprovalTake({
                takeId: msg.takeId ?? "",
                audioUrl: msg.audioUrl ?? "",
                startTimeSeconds: incomingStart,
                durationSeconds: msg.durationSeconds ?? 0,
                lineIndex: msg.lineIndex ?? 0,
                characterName: msg.characterName ?? "",
                voiceActorName: msg.voiceActorName ?? "",
                voiceActorId: msg.voiceActorId ?? "",
              });
              setApprovalOffset(incomingStart);
              setApprovalStatus(null);
              setDirectorFeedback("");
            }
            return;
          }

          if (msg.type === "take:approved") {
            queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "takes"] });
            if (msg.voiceActorId === user?.id && !isDirector) {
              // Update voice actor's popup to show approval
              setApprovalStatus('approved');
              setDirectorFeedback(msg.feedback || '');
            }
            return;
          }

          if (msg.type === "take:rejected") {
            queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "takes"] });
            if (msg.voiceActorId === user?.id && !isDirector) {
              // Update voice actor's popup to show rejection
              setApprovalStatus('rejected');
              setDirectorFeedback(msg.feedback || '');
            }
            return;
          }

          const video = videoRef.current;
          if (!video) return;

          isRemoteAction.current = true;
          try {
            if (msg.type === "video-seek" || msg.type === "video-play" || msg.type === "video-pause") {
              if (typeof msg.currentTime === "number") video.currentTime = msg.currentTime;
            }

            if (msg.type === "video-play") {
              video.play().catch(() => {});
              setIsPlaying(true);
            } else if (msg.type === "video-pause") {
              video.pause();
              setIsPlaying(false);
            }

            if (msg.type === "video-seek" && msg.lineIndex !== undefined) {
              setCurrentLine(msg.lineIndex);
            }
          } finally {
            isRemoteAction.current = false;
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        setWsConnected(false);
        if (!destroyed) {
          wsReconnectTimer.current = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(maxReconnectDelay, reconnectDelay * 1.5);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Erro na conexão:', (error as any)?.message || error?.type || 'connection error');
        setWsConnected(false);
        ws.close();
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId, user?.id, user?.role, myStudioRole, toast]);

  useEffect(() => {
    if (prerollTargetTime === null) return;

    const isLocalInitiator = Boolean(user?.id && prerollInitiatorUserId === user.id);
    const canShow = isLocalInitiator || isDirector;
    if (!canShow) return;

    const step = () => {
      const v = videoRef.current;
      if (!v) return;

      const remaining = prerollTargetTime - v.currentTime;

      if (
        isLocalInitiator &&
        !prerollCaptureStartedRef.current &&
        remaining <= 1 &&
        micState &&
        micReady &&
        recordingStatus === "countdown"
      ) {
        prerollCaptureStartedRef.current = true;
        recordingStartTimecodeRef.current = v.currentTime;
        setRecordingStatus("recording");
        startCapture(micState);
      }

      if (remaining <= 0) {
        if (lastCountdownValueRef.current !== 0) {
          lastCountdownValueRef.current = 0;
          setCountdownValue(0);
        }
        setPrerollTargetTime(null);
        setPrerollInitiatorUserId(null);
        prerollRafRef.current = null;
        return;
      }

      const nextValue = Math.max(1, Math.min(3, Math.ceil(remaining)));
      if (lastCountdownValueRef.current !== nextValue) {
        lastCountdownValueRef.current = nextValue;
        setCountdownValue(nextValue);
        if (isLocalInitiator && micState) {
          playCountdownBeep(micState.audioContext, nextValue === 1 ? 1320 : 660, nextValue === 1 ? 0.2 : 0.12);
        }
      }

      prerollRafRef.current = requestAnimationFrame(step);
    };

    prerollRafRef.current = requestAnimationFrame(step);
    return () => {
      if (prerollRafRef.current) {
        cancelAnimationFrame(prerollRafRef.current);
        prerollRafRef.current = null;
      }
    };
  }, [prerollTargetTime, prerollInitiatorUserId, user?.id, isDirector, micState, micReady, recordingStatus]);

  useEffect(() => {
    localStorage.setItem("vhub_device_settings", JSON.stringify(deviceSettings));
  }, [deviceSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(`vhub_control_perm_${sessionId}`, JSON.stringify(Array.from(controlPermissions)));
    } catch {
      // ignore storage errors
    }
  }, [controlPermissions, sessionId]);

  const prevSettingsRef = useRef({ mode: deviceSettings.voiceCaptureMode, deviceId: deviceSettings.inputDeviceId });

  useEffect(() => {
    const { voiceCaptureMode, inputDeviceId } = deviceSettings;
    const prev = prevSettingsRef.current;

    if (voiceCaptureMode === prev.mode && inputDeviceId === prev.deviceId) return;

    prevSettingsRef.current = { mode: voiceCaptureMode, deviceId: inputDeviceId };

    if (recordingStatus === "recording") return;

    (async () => {
      try {
        const state = await requestMicrophone(voiceCaptureMode, inputDeviceId);
        setGain(state, deviceSettings.inputGain);
        setMicState(state);
        setMicReady(true);
        
        if (voiceCaptureMode !== prev.mode) {
          toast({
            title: "Modo de captura alterado",
            description: voiceCaptureMode === "studio"
              ? "Studio Mode — filtros de voz ativados"
              : voiceCaptureMode === "high-fidelity" 
              ? "High-End Audio — Controle exclusivo" 
              : "Original Microphone — captura crua",
          });
        } else {
           toast({ title: "Dispositivo de entrada alterado" });
        }
      } catch (e: any) {
        console.error("Mic switch error:", e?.message || e?.name || String(e));
        toast({
          title: "Erro ao acessar dispositivo",
          description: "Verifique se o microfone esta conectado e permitido.",
          variant: "destructive",
        });
        setMicReady(false);
      }
    })();
  }, [deviceSettings.voiceCaptureMode, deviceSettings.inputDeviceId, recordingStatus, deviceSettings.inputGain, toast]);

  

  const handleSaveProfile = useCallback((profile: RecordingProfile) => {
    setRecordingProfile(profile);
    localStorage.setItem(`vhub_rec_profile_${sessionId}`, JSON.stringify(profile));
    setShowProfilePanel(false);
    toast({ title: "Perfil de gravacao definido", description: `${profile.voiceActorName} como ${profile.characterName}` });
  }, [sessionId, toast]);

  const handleChangeCharacter = useCallback((charId: string) => {
    if (!recordingProfile || !charactersList) return;
    const char = charactersList.find((c) => c.id === charId);
    if (!char) return;
    const updated: RecordingProfile = {
      ...recordingProfile,
      characterName: char.name,
      characterId: char.id,
      voiceActorId: char.voiceActorId || recordingProfile.userId,
    };
    setRecordingProfile(updated);
    localStorage.setItem(`vhub_rec_profile_${sessionId}`, JSON.stringify(updated));
    toast({ title: "Personagem alterado", description: `Gravando como ${char.name}` });
  }, [recordingProfile, charactersList, sessionId, toast]);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const t = video.currentTime;
      setVideoTime(t);

      const idx = scriptLines.findIndex(
        (line) => t >= line.start && t < (line.end ?? line.start + 1)
      );
      if (idx !== -1 && idx !== currentLine) {
        setCurrentLine(idx);
      }

      if (isLooping) {
        let loopStart = 0;
        let loopEnd = videoDuration;

        if (customLoop) {
          loopStart = customLoop.start;
          loopEnd = customLoop.end;
        } else if (currentLine >= 0 && currentLine < scriptLines.length) {
          const line = scriptLines[currentLine];
          loopStart = Math.max(0, line.start - preRoll);
          loopEnd = (line.end ?? line.start) + postRoll;
        }

        loopStartRef.current = loopStart;

        if (t >= loopEnd) {
          video.currentTime = loopStart;
        }
      }
    };

    const handleDurationChange = () => {
      if (!isNaN(video.duration)) setVideoDuration(video.duration);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [scriptLines, currentLine, isLooping, customLoop, videoDuration, preRoll, postRoll]);

  useEffect(() => {
    telepromptScriptRef.current = scriptLines;
  }, [scriptLines]);

  useEffect(() => {
    telepromptVideoTimeRef.current = videoTime;
  }, [videoTime]);

  useEffect(() => {
    telepromptCurrentLineRef.current = currentLine;
  }, [currentLine]);

  useEffect(() => {
    scriptAutoFollowRef.current = scriptAutoFollow;
  }, [scriptAutoFollow]);

  const markScriptUserScrollIntent = useCallback(() => {
    scriptUserScrollIntentRef.current = true;
    if (scriptUserScrollIntentTimerRef.current) {
      window.clearTimeout(scriptUserScrollIntentTimerRef.current);
    }
    scriptUserScrollIntentTimerRef.current = window.setTimeout(() => {
      scriptUserScrollIntentRef.current = false;
      scriptUserScrollIntentTimerRef.current = null;
    }, 160);
  }, []);

  const handleScriptViewportScroll = useCallback(() => {
    if (scriptProgrammaticScrollRef.current) return;
    if (!scriptUserScrollIntentRef.current) return;
    if (!scriptAutoFollowRef.current) return;
    setScriptAutoFollow(false);
  }, []);

  useEffect(() => { splitRatioRef.current = splitRatio; }, [splitRatio]);

  const handleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = splitContainerRef.current;
    if (!container) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.documentElement.style.cursor = "col-resize";
    document.documentElement.style.userSelect = "none";
    isDraggingRef.current = true;

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.min(0.80, Math.max(0.25, (ev.clientX - rect.left) / rect.width));
      splitRatioRef.current = ratio;
      setSplitRatio(ratio);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
      localStorage.setItem("vhub_split_ratio", String(splitRatioRef.current));
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, []);

  const scrollScriptToLine = useCallback((idx: number, behavior: ScrollBehavior) => {
    const viewport = scriptViewportRef.current;
    const el = lineRefs.current[idx] || null;
    if (!viewport || !el) return;
    const top = el.offsetTop - (viewport.clientHeight / 2) + (el.offsetHeight / 2);
    const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const target = Math.min(maxScroll, Math.max(0, top));
    scriptProgrammaticScrollRef.current = true;
    viewport.scrollTo({ top: target, behavior });
    queueMicrotask(() => {
      scriptProgrammaticScrollRef.current = false;
    });
  }, []);

  useEffect(() => {
    const viewport = scriptViewportRef.current;
    if (!viewport) return;

    if (!scriptAutoFollow) {
      if (telepromptRafRef.current) {
        cancelAnimationFrame(telepromptRafRef.current);
        telepromptRafRef.current = null;
      }
      telepromptLastTsRef.current = null;
      return;
    }

    if (telepromptRafRef.current) {
      cancelAnimationFrame(telepromptRafRef.current);
      telepromptRafRef.current = null;
    }

    telepromptLastTsRef.current = null;

    const ease = (t: number) => {
      const x = Math.max(0, Math.min(1, t));
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    const computeTarget = () => {
      const vp = scriptViewportRef.current;
      if (!vp) return null;

      const lines = telepromptScriptRef.current;
      if (!lines.length) return null;

      const t = telepromptVideoTimeRef.current;
      let idx = telepromptCurrentLineRef.current;

      let lo = 0;
      let hi = lines.length - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if ((lines[mid]?.start ?? 0) <= t + 0.001) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      idx = Math.max(0, Math.min(lines.length - 1, ans));

      const nextIdx = Math.min(idx + 1, lines.length - 1);
      const el0 = lineRefs.current[idx] || lineRefs.current[telepromptCurrentLineRef.current] || null;
      if (!el0) return null;

      const el1 = lineRefs.current[nextIdx] || el0;
      const y0 = el0.offsetTop;
      const y1 = el1.offsetTop;
      const t0 = lines[idx]?.start ?? 0;
      const t1 = lines[nextIdx]?.start ?? (t0 + 0.5);
      const gap = t1 - t0;
      const denom = gap <= 3 ? Math.max(4.0, gap) : Math.max(0.5, gap);
      const p = ease((t - t0) / denom);
      const y = y0 + (y1 - y0) * p;

      const focusY0 = (vp.clientHeight / 2) - (el0.offsetHeight / 2);
      const focusY1 = (vp.clientHeight / 2) - (el1.offsetHeight / 2);
      const focusY = focusY0 + (focusY1 - focusY0) * p;
      const rawTarget = y - focusY;
      const maxScroll = Math.max(0, vp.scrollHeight - vp.clientHeight);
      return Math.min(maxScroll, Math.max(0, rawTarget));
    };

    const step = (ts: number) => {
      const vp = scriptViewportRef.current;
      if (!vp) return;

      const target = computeTarget();
      if (target === null) {
        telepromptRafRef.current = requestAnimationFrame(step);
        return;
      }

      const last = telepromptLastTsRef.current;
      const dt = last ? Math.max(0.001, Math.min(0.05, (ts - last) / 1000)) : 1 / 60;
      telepromptLastTsRef.current = ts;

      const tau = isPlaying ? 0.50 : 0.28;
      const alpha = 1 - Math.exp(-dt / tau);
      const current = vp.scrollTop;
      scriptProgrammaticScrollRef.current = true;
      vp.scrollTop = current + (target - current) * alpha;
      queueMicrotask(() => {
        scriptProgrammaticScrollRef.current = false;
      });

      telepromptRafRef.current = requestAnimationFrame(step);
    };

    telepromptRafRef.current = requestAnimationFrame(step);

    return () => {
      if (telepromptRafRef.current) {
        cancelAnimationFrame(telepromptRafRef.current);
        telepromptRafRef.current = null;
      }
      telepromptLastTsRef.current = null;
    };
  }, [isPlaying, scriptAutoFollow]);

  useEffect(() => {
    if (!listeningFor) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        setListeningFor(null);
        return;
      }
      setPendingShortcuts((prev) => ({ ...prev, [listeningFor]: e.code }));
      setListeningFor(null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [listeningFor]);

  const emitVideoEvent = useCallback((event: string, data: any) => {
    if (isRemoteAction.current) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) { // WebSocket.OPEN is 1
      ws.send(JSON.stringify({ type: event, ...data }));
    } else {
      console.warn(`[VideoSync] WS not open (state=${ws?.readyState ?? 'null'}), dropped event: ${event}`);
    }
  }, []);

  const playVideo = useCallback(() => {
    if (!videoRef.current) return;
    setScriptAutoFollow(true);
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    emitVideoEvent("video-play", { currentTime: videoRef.current.currentTime });
  }, [emitVideoEvent]);

  const pauseVideo = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    emitVideoEvent("video-pause", { currentTime: videoRef.current.currentTime });
  }, [emitVideoEvent]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

  const handleStopPlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (recordingStatus === "countdown") {
      cancelPreroll();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setRecordingStatus("idle");
    }
    videoRef.current.pause();
    
    let t: number;
    if (isLooping) {
      t = loopStartRef.current;
    } else {
      const line = scriptLines[currentLine];
      t = line?.start ?? 0;
    }
    
    videoRef.current.currentTime = t;
    setIsPlaying(false);
    emitVideoEvent("video-pause", { currentTime: t });
    emitVideoEvent("video-seek", { currentTime: t, lineIndex: currentLine });
  }, [recordingStatus, cancelPreroll, currentLine, scriptLines, emitVideoEvent, isLooping]);

  const seek = useCallback((amount: number) => {
    if (!videoRef.current) return;
    const t = Math.max(0, videoRef.current.currentTime + amount);
    videoRef.current.currentTime = t;
    emitVideoEvent("video-seek", { currentTime: t });
  }, [emitVideoEvent]);

  const scrub = useCallback((fraction: number) => {
    if (!videoRef.current || !videoDuration || !canControl) return;
    const t = fraction * videoDuration;
    videoRef.current.currentTime = t;
    emitVideoEvent("video-seek", { currentTime: t });
  }, [videoDuration, emitVideoEvent, canControl]);

  const handleLineClick = useCallback((idx: number) => {
    if (!canTextControl) return;
    const line = scriptLines[idx];
    if (!line) return;
    setScriptAutoFollow(true);
    queueMicrotask(() => scrollScriptToLine(idx, "smooth"));

    if (loopSelectionMode === "selecting-start") {
      setCustomLoop({ start: line.start, end: line.end || line.start + 1 });
      setLoopSelectionMode("selecting-end");
      toast({ title: "Inicio do loop definido", description: "Clique agora na fala final do loop." });
    } else if (loopSelectionMode === "selecting-end") {
      if (customLoop) {
        const newLoop = { ...customLoop, end: line.end || line.start + 1 };
        setCustomLoop(newLoop);
        setLoopSelectionMode("idle");
        setIsLooping(true);
        if (videoRef.current) videoRef.current.currentTime = newLoop.start;
        emitVideoEvent("sync-loop", { loopRange: newLoop });
        toast({ title: "Loop definido", description: "O trecho selecionado sera repetido." });
      }
    } else {
      setCurrentLine(idx);
      if (videoRef.current) {
        videoRef.current.currentTime = line.start;
        emitVideoEvent("video-seek", { currentTime: line.start, lineIndex: idx });
      }
    }
  }, [canTextControl, scriptLines, loopSelectionMode, customLoop, toast, scrollScriptToLine, emitVideoEvent]);

  const cleanupPreview = useCallback(() => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setLastRecording(null);
    setQualityMetrics(null);
    setRecordingStatus("idle");
  }, [previewUrl]);

  const startCountdown = useCallback(async () => {
    if (!recordingProfile) {
      setShowProfilePanel(true);
      toast({
        title: "Perfil de gravacao necessario",
        description: "Defina seu perfil antes de gravar.",
        variant: "destructive",
      });
      return;
    }
    if (!micState || !micReady) {
      toast({
        title: "Microfone nao esta pronto",
        description: "Permita o acesso ao microfone.",
        variant: "destructive",
      });
      return;
    }
    if (recordingStatus === "recording") {
      stopCapture(micState);
      pauseVideo();
      setRecordingStatus("idle");
      return;
    }
    if (recordingStatus === "countdown") {
      cancelPreroll();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setRecordingStatus("idle");
      return;
    }
    if (recordingStatus === "recorded" || recordingStatus === "previewing") {
      cleanupPreview();
    }

    if (micState.audioContext.state === "suspended") {
      await micState.audioContext.resume();
    }

    const target = scriptLines[currentLine]?.start ?? (videoRef.current?.currentTime ?? 0);
    const startAt = Math.max(0, target - 3);

    if (videoRef.current) {
      videoRef.current.currentTime = startAt;
      emitVideoEvent("video-seek", { currentTime: startAt, lineIndex: currentLine });
    }

    prerollCaptureStartedRef.current = false;
    lastCountdownValueRef.current = 0;
    setRecordingStatus("countdown");
    setCountdownValue(3);
    setPrerollTargetTime(target);
    setPrerollInitiatorUserId(user?.id || null);
    emitVideoEvent("recording:preroll", { targetTime: target, startedByUserId: user?.id });
    playVideo();
  }, [recordingProfile, micState, micReady, recordingStatus, cleanupPreview, toast, pauseVideo, emitVideoEvent, playVideo, cancelPreroll, scriptLines, currentLine, user?.id]);

  const handleStopRecording = useCallback(async () => {
    if (!micState || recordingStatus !== "recording") return;
    const result = stopCapture(micState);
    pauseVideo();

    if (result.samples.length === 0 || result.durationSeconds < 0.1) {
      toast({
        title: "Gravacao muito curta",
        description: "A gravacao esta vazia ou muito curta. Verifique se o microfone esta funcionando.",
        variant: "destructive",
      });
      setRecordingStatus("idle");
      return;
    }

    // Validate profile
    if (!recordingProfile) {
      setShowProfilePanel(true);
      toast({
        title: "Perfil de gravacao necessario",
        description: "Defina seu perfil antes de gravar.",
        variant: "destructive",
      });
      setRecordingStatus("idle");
      return;
    }

    // ➊ Encode synchronously so the popup can open immediately (no upload wait)
    setRecordingStatus("idle");
    const metrics = analyzeTakeQuality(result.samples);
    setQualityMetrics(metrics);
    setLastRecording(result);
    const wavBuffer = encodeWav(result.samples);
    const blob = wavToBlob(wavBuffer);
    const durationSeconds = getDurationSeconds(result.samples);
    const tc = Math.max(0, recordingStartTimecodeRef.current);
    const blobUrl = createPreviewUrl(blob);

    // ➋ Show approval popup immediately with local blob URL (takeId '' while uploading)
    setPendingApprovalTake({
      takeId: '',
      audioUrl: blobUrl,
      startTimeSeconds: tc,
      durationSeconds,
      lineIndex: currentLine,
      characterName: recordingProfile.characterName,
      voiceActorName: recordingProfile.voiceActorName,
      voiceActorId: user?.id || '',
    });
    if (isDirector) {
      setApprovalOffset(tc);
      setApprovalStatus(null);
      setDirectorFeedback('');
    } else {
      setApprovalStatus('pending');
    }
    setPreviewUrl(blobUrl);

    // ➌ Upload in background — popup is already visible
    setIsSaving(true);
    try {
      let activeProfile = recordingProfile;
      const charExistsInProduction = charactersList?.some((c: any) => c.id === activeProfile.characterId);
      const needsCharCreation = !UUID_REGEX.test(activeProfile.characterId) || !charExistsInProduction;

      if (needsCharCreation) {
        if (!session?.productionId || !activeProfile.characterName?.trim()) {
          setShowProfilePanel(true);
          toast({ title: "Perfil invalido", description: "Reconfigure seu personagem antes de salvar.", variant: "destructive" });
          setPendingApprovalTake(null);
          setApprovalStatus(null);
          setIsSaving(false);
          return;
        }
        try {
          const created = await authFetch(`/api/productions/${session.productionId}/characters`, {
            method: "POST",
            body: JSON.stringify({ name: activeProfile.characterName.trim(), productionId: session.productionId }),
          });
          activeProfile = { ...activeProfile, characterId: created.id };
          setRecordingProfile(activeProfile);
          localStorage.setItem(`vhub_rec_profile_${sessionId}`, JSON.stringify(activeProfile));
        } catch (err: any) {
          toast({ title: "Erro ao criar personagem", description: err?.message || "Tente novamente", variant: "destructive" });
          setPendingApprovalTake(null);
          setApprovalStatus(null);
          setIsSaving(false);
          return;
        }
      }

      const tcMs = Math.round(tc * 1000);
      const hh = String(Math.floor(tcMs / 3600000)).padStart(2, "0");
      const mm = String(Math.floor((tcMs % 3600000) / 60000)).padStart(2, "0");
      const ss = String(Math.floor((tcMs % 60000) / 1000)).padStart(2, "0");
      const ms = String(tcMs % 1000).padStart(3, "0");
      const cleanName = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
      const fileName = `${cleanName(activeProfile.characterName)}_${cleanName(activeProfile.voiceActorName)}_${hh}${mm}${ss}${ms}.wav`;

      const formData = new FormData();
      formData.append("audio", blob, fileName);
      formData.append("characterId", activeProfile.characterId);
      formData.append("voiceActorId", activeProfile.voiceActorId);
      formData.append("voiceActorName", activeProfile.voiceActorName);
      formData.append("characterName", activeProfile.characterName);
      formData.append("lineIndex", String(currentLine));
      formData.append("timecode", `${hh}:${mm}:${ss}.${ms}`);
      formData.append("startTimeSeconds", String(tc));
      formData.append("durationSeconds", String(durationSeconds));
      formData.append("qualityScore", String(metrics?.score || 0));

      const response = await fetch(`/api/sessions/${sessionId}/takes`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao salvar take (${response.status}): ${errorBody}`);
      }

      const savedTake = await response.json();

      // Update popup with real takeId and server URL — enables approve/reject buttons
      setPendingApprovalTake(prev => prev ? {
        ...prev,
        takeId: savedTake.id,
        audioUrl: savedTake.audioUrl || prev.audioUrl,
      } : null);

      // Emit WebSocket for other directors in the room
      emitVideoEvent("take:pending-approval", {
        takeId: savedTake.id,
        voiceActorId: user?.id,
        voiceActorName: activeProfile.voiceActorName,
        characterName: activeProfile.characterName,
        lineIndex: currentLine,
        audioUrl: savedTake.audioUrl || blobUrl,
        startTimeSeconds: tc,
        durationSeconds: durationSeconds,
      });

      setSavedTakes((prev) => new Set(prev).add(currentLine));
      setTakeCount((prev) => prev + 1);
      refetchTakes();

    } catch (err: any) {
      console.error("[SaveTake] Auto-save error:", err);
      toast({
        title: "Falha ao salvar",
        description: err?.message || "Nao foi possivel salvar o take.",
        variant: "destructive",
      });
      setPendingApprovalTake(null);
      setApprovalStatus(null);
    } finally {
      setIsSaving(false);
    }
  }, [micState, recordingStatus, toast, pauseVideo, recordingProfile, charactersList, session, sessionId, currentLine, user, emitVideoEvent, refetchTakes, isDirector]);

  const handlePreview = useCallback(() => {
    if (!previewUrl) return;
    if (recordingStatus === "previewing" && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setRecordingStatus("recorded");
      return;
    }
    const audio = new Audio(previewUrl);
    audio.onended = () => setRecordingStatus("recorded");
    audio.play().catch(() => {});
    previewAudioRef.current = audio;
    setRecordingStatus("previewing");
  }, [previewUrl, recordingStatus]);

  const handleSaveTake = useCallback(async () => {
    if (isSaving) return;

    if (!recordingProfile) {
      setShowProfilePanel(true);
      toast({
        title: "Perfil de gravacao necessario",
        description: "Defina seu perfil antes de salvar takes.",
        variant: "destructive",
      });
      return;
    }

    if (!lastRecording || !previewUrl) {
      toast({
        title: "Nenhuma gravacao disponivel",
        description: "Grave um take primeiro antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    if (lastRecording.samples.length === 0) {
      toast({
        title: "Gravacao vazia",
        description: "A gravacao nao capturou audio. Verifique seu microfone.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);
    
    try {
      let activeProfile = recordingProfile;
      const charExistsInProduction = charactersList?.some((c: any) => c.id === activeProfile.characterId);
      const needsCharCreation = !UUID_REGEX.test(activeProfile.characterId) || !charExistsInProduction;

      if (needsCharCreation) {
        if (!session?.productionId || !activeProfile.characterName?.trim()) {
          setShowProfilePanel(true);
          toast({ title: "Perfil invalido", description: "Reconfigure seu personagem antes de salvar.", variant: "destructive" });
          setIsSaving(false);
          return;
        }
        try {
          const created = await authFetch(`/api/productions/${session.productionId}/characters`, {
            method: "POST",
            body: JSON.stringify({ name: activeProfile.characterName.trim(), productionId: session.productionId }),
          });
          activeProfile = { ...activeProfile, characterId: created.id };
          setRecordingProfile(activeProfile);
          localStorage.setItem(`vhub_rec_profile_${sessionId}`, JSON.stringify(activeProfile));
        } catch (err: any) {
          toast({ title: "Erro ao criar personagem", description: err?.message || "Tente novamente", variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      const wavBuffer = encodeWav(lastRecording.samples);
      const blob = wavToBlob(wavBuffer);
      const durationSeconds = getDurationSeconds(lastRecording.samples);

      const tc = Math.max(0, recordingStartTimecodeRef.current);
      const tcMs = Math.round(tc * 1000);
      const hh = String(Math.floor(tcMs / 3600000)).padStart(2, "0");
      const mm = String(Math.floor((tcMs % 3600000) / 60000)).padStart(2, "0");
      const ss = String(Math.floor((tcMs % 60000) / 1000)).padStart(2, "0");
      const ms = String(tcMs % 1000).padStart(3, "0");
      const cleanName = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
      const fileName = `${cleanName(activeProfile.characterName)}_${cleanName(activeProfile.voiceActorName)}_${hh}${mm}${ss}${ms}.wav`;

      const formData = new FormData();
      formData.append("audio", blob, fileName);
      formData.append("characterId", activeProfile.characterId);
      formData.append("voiceActorId", activeProfile.voiceActorId);
      formData.append("voiceActorName", activeProfile.voiceActorName);
      formData.append("characterName", activeProfile.characterName);
      formData.append("lineIndex", String(currentLine));
      formData.append("timecode", `${hh}:${mm}:${ss}.${ms}`);
      formData.append("startTimeSeconds", String(tc));
      formData.append("durationSeconds", String(durationSeconds));
      formData.append("qualityScore", String(qualityMetrics?.score || 0));

      const response = await fetch(`/api/sessions/${sessionId}/takes`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao salvar take (${response.status}): ${errorBody}`);
      }

      const takeData = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setSavedTakes((prev) => new Set(prev).add(currentLine));
      setTakeCount((prev) => prev + 1);
      
      cleanupPreview();
      refetchTakes();
      toast({
        title: `Take salvo`,
        description: `${recordingProfile.characterName} — Linha ${currentLine + 1} (${durationSeconds.toFixed(1)}s)`,
      });
    } catch (err: any) {
      console.error("[SaveTake] Error:", err);
      clearInterval(progressInterval);
      toast({
        title: "Falha ao salvar",
        description: err?.message || "Nao foi possivel salvar o take.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  }, [lastRecording, previewUrl, isSaving, currentLine, sessionId, qualityMetrics, recordingProfile, cleanupPreview, refetchTakes, toast, charactersList, session]);

  const handleDiscard = useCallback(() => {
    cleanupPreview();
    toast({ title: "Take descartado" });
  }, [cleanupPreview, toast]);

  const handleApprovalTrim = useCallback(async (startSec: number, endSec: number) => {
    if (!pendingApprovalTake?.takeId) return;
    try {
      const data = await authFetch(`/api/takes/${pendingApprovalTake.takeId}/trim`, {
        method: "POST",
        body: JSON.stringify({ startSeconds: startSec, endSeconds: endSec }),
      });
      const bustUrl = data.audioUrl + (data.audioUrl.includes("?") ? `&v=${Date.now()}` : `?v=${Date.now()}`);
      setPendingApprovalTake(prev => prev ? { ...prev, audioUrl: bustUrl, durationSeconds: data.durationSeconds } : null);
      // Clamp approvalOffset so block stays within new take length
      const newMax = Math.max(0, videoDuration - data.durationSeconds);
      setApprovalOffset(prev => Math.min(prev, newMax));
      toast({ title: "Take cortado", description: `Nova duração: ${data.durationSeconds.toFixed(1)}s` });
    } catch (err: any) {
      toast({ title: "Erro ao cortar take", description: err.message, variant: "destructive" });
    }
  }, [pendingApprovalTake, videoDuration, toast]);

  const handleDirectorPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video || !pendingApprovalTake) return;

    // Properly tear down any previous preview (removes stale event listeners + restores volume)
    if (approvalPreviewCleanupRef.current) {
      approvalPreviewCleanupRef.current();
      approvalPreviewCleanupRef.current = null;
    }
    if (approvalAudioRef.current) {
      approvalAudioRef.current.pause();
      approvalAudioRef.current = null;
    }

    video.volume = 0;
    video.currentTime = approvalOffset;

    const audio = new Audio(pendingApprovalTake.audioUrl);
    approvalAudioRef.current = audio;

    const endTime = approvalOffset + pendingApprovalTake.durationSeconds;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasCleanedUp = false;

    const cleanup = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      approvalPreviewCleanupRef.current = null;
      if (timeoutId) clearTimeout(timeoutId);
      video.removeEventListener("play", syncPlay);
      video.removeEventListener("pause", syncPause);
      video.removeEventListener("seeked", syncSeek);
      video.removeEventListener("timeupdate", checkEnd);
      video.volume = 1;
      audio.pause();
    };

    const checkEnd = () => { if (video.currentTime >= endTime) { video.pause(); cleanup(); } };
    const syncPlay = () => {
      const offset = video.currentTime - approvalOffset;
      if (offset >= 0 && offset <= pendingApprovalTake.durationSeconds) { audio.currentTime = offset; audio.play().catch(() => {}); }
    };
    const syncPause = () => { audio.pause(); };
    const syncSeek = () => {
      const offset = video.currentTime - approvalOffset;
      if (offset >= 0 && offset <= pendingApprovalTake.durationSeconds) { audio.currentTime = offset; } else { audio.pause(); }
    };

    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPause);
    video.addEventListener("seeked", syncSeek);
    video.addEventListener("timeupdate", checkEnd);
    audio.onended = cleanup;

    timeoutId = setTimeout(() => {
      if (!hasCleanedUp && video.currentTime >= endTime - 0.1) { video.pause(); cleanup(); }
    }, pendingApprovalTake.durationSeconds * 1000 + 200);

    approvalPreviewCleanupRef.current = cleanup;
    video.play().then(() => { audio.play().catch(() => {}); }).catch(() => {});
  }, [pendingApprovalTake, approvalOffset]);

  const handleTakeDecision = useCallback(async (action: "approve" | "reject", feedback: string) => {
    if (!pendingApprovalTake) return;
    if (!pendingApprovalTake.takeId) {
      toast({ title: "Aguarde o upload", description: "O áudio ainda está sendo enviado. Tente em instantes.", variant: "destructive" });
      return;
    }
    const body = action === "approve"
      ? { feedback, setAsFinal: false, startTimeSeconds: approvalOffset }
      : { feedback: feedback || "Sem feedback" };
    const takeId = pendingApprovalTake.takeId;

    // Optimistic close — popup fecha imediatamente, API chama em background
    setPendingApprovalTake(null);
    setApprovalStatus(null);
    setDirectorFeedback("");
    cleanupPreview();

    try {
      await authFetch(`/api/takes/${takeId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      // Rejected takes are deleted from DB + storage after the WS notification is sent
      if (action === "reject") {
        await authFetch(`/api/takes/${takeId}`, { method: "DELETE" });
      }
      toast({ title: action === "approve" ? "Take aprovado!" : "Take rejeitado e excluído", description: action === "approve" ? "Dublador foi notificado." : "Take removido da lista." });
      refetchTakes();
    } catch (err: any) {
      toast({ title: action === "approve" ? "Erro ao aprovar" : "Erro ao rejeitar", description: err.message, variant: "destructive" });
    }
  }, [pendingApprovalTake, approvalOffset, toast, cleanupPreview, refetchTakes]);

  useEffect(() => {
    if (isCustomizing) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const code = e.code;
      const key = e.key;

      if (code === shortcuts.playPause || (shortcuts.playPause === "Space" && key === " ")) {
        e.preventDefault();
        if (recordingStatus === "recorded" || recordingStatus === "previewing") {
          handlePreview();
        } else {
          handlePlayPause();
        }
      } else if (code === shortcuts.record) {
        e.preventDefault();
        if (recordingStatus === "idle" || recordingStatus === "recorded") startCountdown();
      } else if (code === shortcuts.stop) {
        e.preventDefault();
        if (recordingStatus === "recording") {
          handleStopRecording();
        } else {
          handleStopPlayback();
        }
      } else if (code === shortcuts.loop) {
        e.preventDefault();
        setIsLooping((l) => !l);
      } else if (code === shortcuts.back) {
        e.preventDefault();
        seek(-2);
      } else if (code === shortcuts.forward) {
        e.preventDefault();
        seek(2);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, isCustomizing, recordingStatus, handlePlayPause, handlePreview, startCountdown, handleStopRecording, handleStopPlayback, seek]);

  const currentScriptLine = scriptLines[currentLine];

  if (sessionLoading || (session && productionLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full animate-spin border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Carregando sala de gravacao...</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-sm font-medium text-foreground">Erro ao carregar sessao</p>
          <p className="text-xs text-muted-foreground">Verifique se voce tem acesso a este estudio e sessao.</p>
          <Link href={`/hub-dub/studio/${studioId}/sessions`}>
            <button className="mt-2 vhub-btn-sm vhub-btn-primary" data-testid="button-back-sessions">
              Voltar para Sessoes
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none relative bg-background text-foreground">

      {/* Upload Progress Overlay — hidden when approval popup is open (upload runs in background) */}
      {isSaving && !pendingApprovalTake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-xl p-6 w-80" style={{ background: "var(--room-modal-bg)", border: "1px solid hsl(var(--border))", boxShadow: "var(--room-modal-shadow)" }}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full animate-spin border-2 border-muted border-t-primary" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Enviando Take</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{uploadProgress}% concluído</p>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.02]"></div>
      </div>

      {countdownValue > 0 && (prerollInitiatorUserId === user?.id || isDirector) && (
        <CountdownOverlay count={countdownValue} />
      )}

      {isCustomizing && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[420px] overflow-hidden glass-panel shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <span className="text-sm font-semibold text-foreground">Atalhos de Teclado</span>
              <button
                onClick={() => { setIsCustomizing(false); setPendingShortcuts(shortcuts); setListeningFor(null); }}
                className="transition-colors text-muted-foreground hover:text-foreground"
                data-testid="button-close-shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 flex flex-col gap-2">
              {(Object.keys(SHORTCUT_LABELS) as Array<keyof Shortcuts>).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.70)" }}>{SHORTCUT_LABELS[key]}</span>
                  <button
                    onClick={() => setListeningFor(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono min-w-[80px] text-center transition-all ${
                      listeningFor === key
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={listeningFor === key
                      ? { border: "1px solid hsl(var(--primary))", background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }
                      : { border: "1px solid hsl(var(--border))", background: "rgba(255,255,255,0.05)", color: "hsl(var(--foreground) / 0.70)" }
                    }
                    data-testid={`shortcut-btn-${key}`}
                  >
                    {listeningFor === key ? "Pressione tecla\u2026" : keyLabel(pendingShortcuts[key])}
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 flex justify-between gap-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.8)" }}>
              <button
                onClick={() => { setPendingShortcuts(DEFAULT_SHORTCUTS); setListeningFor(null); }}
                className="text-xs transition-colors" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
                data-testid="button-reset-shortcuts"
              >
                Restaurar padroes
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShortcuts(pendingShortcuts); setIsCustomizing(false); toast({ title: "Atalhos atualizados (apenas nesta sessao)" }); }}
                  className="vhub-btn-xs vhub-btn-secondary"
                  data-testid="button-apply-shortcuts"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => {
                    setShortcuts(pendingShortcuts);
                    localStorage.setItem("vhub_shortcuts", JSON.stringify(pendingShortcuts));
                    setIsCustomizing(false);
                    toast({ title: "Atalhos salvos como padrao" });
                  }}
                  className="vhub-btn-xs vhub-btn-primary"
                  data-testid="button-save-shortcuts"
                >
                  Salvar como Padrao
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeviceSettingsPanel
        open={deviceSettingsOpen}
        onClose={() => setDeviceSettingsOpen(false)}
        settings={deviceSettings}
        onSettingsChange={setDeviceSettings}
        micState={micState}
      />

      {showProfilePanel && session?.productionId && (
        <RecordingProfilePanel
          characters={effectiveCharactersList}
          user={user}
          sessionId={sessionId}
          productionId={session.productionId}
          onSave={handleSaveProfile}
          onClose={() => setShowProfilePanel(false)}
          existingProfile={recordingProfile}
        />
      )}

      {takesPopupOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[520px] overflow-hidden" style={{ background: "var(--room-modal-bg)", border: "1px solid hsl(var(--border))", boxShadow: "var(--room-modal-shadow)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Takes da Sessao</span>
              <button
                onClick={() => {
                  setTakesPopupOpen(false);
                  if (takePreviewAudioRef.current) {
                    takePreviewAudioRef.current.pause();
                    takePreviewAudioRef.current.currentTime = 0;
                  }
                  setTakePreviewId(null);
                }}
                className="transition-colors"
                style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
                data-testid="button-close-takes-popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <audio ref={takePreviewAudioRef} preload="none" />
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                {(() => {
                  const visibleTakes = (isPrivileged || isDirector)
                    ? takesList
                    : takesList.filter((t: any) => t.voiceActorId === user?.id || t.userId === user?.id);
                  const sortedTakes = [...visibleTakes].sort((a: any, b: any) => {
                    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return tb - ta;
                  });
                  if (sortedTakes.length === 0) {
                    return <div className="text-sm text-center py-10" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                      Nenhum take gravado nesta sessao
                    </div>;
                  }
                  return sortedTakes.map((take: any, takeIdx: number) => {
                    const isEditing = editingTakeId === take.id;
                    return (
                      <div key={take.id} className="flex flex-col gap-3 px-3 py-3 rounded-lg" style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const audio = takePreviewAudioRef.current;
                              if (!audio) return;
                              if (takePreviewId === take.id) {
                                audio.pause();
                                audio.currentTime = 0;
                                setTakePreviewId(null);
                                setTakePreviewProgress(0);
                                return;
                              }
                              setTakePreviewId(take.id);
                              setTakePreviewProgress(0);
                              audio.onended = () => { setTakePreviewId(null); setTakePreviewProgress(0); };
                              audio.ontimeupdate = () => {
                                if (audio.duration && isFinite(audio.duration)) {
                                  setTakePreviewProgress(audio.currentTime / audio.duration);
                                }
                              };
                              audio.src = `/api/takes/${take.id}/stream?d=${take.durationSeconds || 0}${takeCacheBust[take.id] ? `&t=${takeCacheBust[take.id]}` : ''}`;
                              audio.play().catch(() => {});
                            }}
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                            style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground) / 0.75)" }}
                            data-testid={`button-play-take-${take.id}`}
                          >
                            {takePreviewId === take.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>#{takeIdx + 1}</span>
                              <span className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                                {take.characterName || "Take"}
                              </span>
                              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>—</span>
                              <span className="text-xs truncate" style={{ color: "hsl(var(--foreground) / 0.65)" }}>
                                {take.voiceActorName || take.userName || "Dublador"}
                              </span>
                              <span className="ml-auto text-xs font-mono tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
                                {take.durationSeconds ? `${Number(take.durationSeconds).toFixed(1)}s` : ""}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.8)" }}>
                              Linhas #{take.lineIndex} → #{calculateEndLine(take.lineIndex, take.durationSeconds || 0)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadTake(take)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }}
                            title="Baixar take"
                            data-testid={`button-download-take-popup-${take.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {isDirector && (
                            <button
                              onClick={async () => {
                                if (!window.confirm("Excluir este take definitivamente? O arquivo de áudio também será removido do storage.")) return;
                                try {
                                  await authFetch(`/api/takes/${take.id}`, { method: "DELETE" });
                                  toast({ title: "Take excluído", description: "O take e seu arquivo de áudio foram removidos." });
                                  refetchTakes();
                                } catch (err: any) {
                                  toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
                                }
                              }}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "hsl(0 72% 55%)", background: "rgba(239,68,68,0.08)" }}
                              title="Excluir take"
                              data-testid={`button-delete-take-popup-${take.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {takePreviewId === take.id && (
                          <div className="flex items-center gap-2 px-1">
                            <div
                              className="flex-1 h-1 rounded-full overflow-hidden cursor-pointer"
                              style={{ background: "hsl(var(--muted))" }}
                              onClick={(e) => {
                                const audio = takePreviewAudioRef.current;
                                if (!audio || !audio.duration || !isFinite(audio.duration)) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                audio.currentTime = frac * audio.duration;
                              }}
                            >
                              <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${(takePreviewProgress * 100).toFixed(1)}%`, background: "hsl(var(--primary))" }} />
                            </div>
                            <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                              {(() => { const ct = takePreviewAudioRef.current?.currentTime || 0; const m = Math.floor(ct / 60); const s = Math.floor(ct % 60); return `${m}:${s.toString().padStart(2, '0')}`; })()}
                            </span>
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex flex-col gap-2">
                            <TakeWaveformEditor
                              audioUrl={`/api/takes/${take.id}/stream?d=${take.durationSeconds || 0}${takeCacheBust[take.id] ? `&t=${takeCacheBust[take.id]}` : ''}`}
                              durationSeconds={take.durationSeconds || 0}
                              onTrim={async (start, end) => {
                                try {
                                  const response = await authFetch(`/api/takes/${take.id}/trim`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ startSeconds: start, endSeconds: end }),
                                  });
                                  if (!response.ok) throw new Error("Erro ao cortar take");
                                  await response.json();
                                  const ts = Date.now();
                                  setTakeCacheBust(prev => ({ ...prev, [take.id]: ts }));
                                  refetchTakes();
                                  toast({ title: "Take cortado com sucesso" });
                                  setEditingTakeId(null);
                                } catch (err: any) {
                                  toast({ title: "Erro ao cortar take", description: err?.message, variant: "destructive" });
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingTakeId(null)}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={() => setEditingTakeId(null)}>
                                Salvar
                              </Button>
                            </div>
                          </div>
                        )}
                        {!isEditing && (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => setEditingTakeId(take.id)}>
                            Editar Take
                          </Button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {textControlPopupOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[520px] max-h-[85vh] flex flex-col" style={{ background: "var(--room-modal-bg)", border: "1px solid hsl(var(--border))", boxShadow: "var(--room-modal-shadow)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Controle de Texto</span>
              <button
                onClick={() => setTextControlPopupOpen(false)}
                className="transition-colors"
                style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
                data-testid="button-close-text-control"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 140px)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>Autorizacao (Alunos / Dubladores)</span>
                <button
                  onClick={() => {
                    const ok = window.confirm("Revogar permissoes temporarias e remover autorizacoes de controle de texto?");
                    if (!ok) return;
                    emitVideoEvent("revoke-all", {});
                    emitTextControlEvent("text-control:set-controllers", { targetUserIds: [] });
                    setControlPermissions(new Set());
                    setGlobalControlEnabled(false);
                    setTextControllerUserIds(new Set());
                    setPendingTextControllerUserIds(new Set());
                    setTextControlPopupOpen(false);
                  }}
                  className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors uppercase font-bold"
                  data-testid="button-revoke-all-text-control"
                >
                  Revogar tudo
                </button>
              </div>

              <div className="text-[11px] mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.9)" }}>
                Autorizados:{" "}
                <span style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                  {(() => {
                    const names = presenceRoster
                      .filter((u: any) => pendingTextControllerUserIds.has(u.userId))
                      .map((u: any) => u.name || "Usuario");
                    return names.length ? names.join(", ") : "Nenhum";
                  })()}
                </span>
              </div>

              <div className="flex flex-col gap-2 pr-1">
                {(() => {
                  // Show ALL connected users - no role filter
                  if (!presenceRoster.length) {
                    return (
                      <div className="text-sm text-center py-10" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                        Nenhum usuario conectado
                      </div>
                    );
                  }
                  return presenceRoster.map((p: any) => {
                    const checked = pendingTextControllerUserIds.has(p.userId);
                    return (
                      <label
                        key={p.userId}
                        className="flex items-center justify-between text-xs rounded-lg px-3 py-2 cursor-pointer"
                        style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>
                            {String(p.name || "?")[0] || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate" style={{ color: "hsl(var(--foreground) / 0.85)" }}>{p.name || "Usuario"}</span>
                              {checked && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 uppercase shrink-0" style={{ color: "hsl(var(--primary))" }}>
                                  Autorizado
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] uppercase" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                              {String(p.role || "").replace(/_/g, " ") || "participante"}
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setPendingTextControllerUserIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.userId)) next.delete(p.userId);
                              else next.add(p.userId);
                              return next;
                            });
                          }}
                          className="h-4 w-4 accent-amber-500"
                          data-testid={`checkbox-text-controller-${p.userId}`}
                        />
                      </label>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 shrink-0" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <button
                onClick={() => setTextControlPopupOpen(false)}
                className="vhub-btn-xs vhub-btn-secondary"
                data-testid="button-cancel-text-control"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const targetUserIds = Array.from(pendingTextControllerUserIds);
                  setTextControllerUserIds(new Set(targetUserIds));
                  emitTextControlEvent("text-control:set-controllers", { targetUserIds });
                  setTextControlPopupOpen(false);
                }}
                className="vhub-btn-xs vhub-btn-primary"
                data-testid="button-apply-text-control"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 sm:px-5 py-2 sm:py-0 gap-2 sm:gap-0" style={{ background: "var(--room-header-bg)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--room-header-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href={`/hub-dub/studio/${studioId}/dashboard`}>
            <button className="flex items-center gap-2 text-sm transition-colors" style={{ color: "hsl(var(--muted-foreground))" }} data-testid="button-exit-room">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </Link>
          <div className="hidden sm:block h-4 w-px" style={{ background: "hsl(var(--border))" }} />
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-medium text-sm truncate max-w-[52vw] sm:max-w-none" style={{ color: "hsl(var(--foreground))" }}>{production?.name || "Carregando\u2026"}</span>
            <span className="text-xs truncate max-w-[36vw] sm:max-w-none" style={{ color: "hsl(var(--muted-foreground))" }}>{session?.title}</span>
          </div>
          {recordingStatus === "recording" && (
            <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ color: "hsl(0 72% 65%)", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <Circle className="w-2 h-2 fill-red-500 animate-pulse" /> REC
            </span>
          )}
          {recordingStatus === "recorded" && (isPrivileged || isDirector) && (
            <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ color: "hsl(217 91% 60%)", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <AlertCircle className="w-3 h-3" /> Nao salvo
            </span>
          )}
        </div>

        <div className="relative -mx-2 px-2 sm:mx-0 sm:px-0 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" as any }}>
          <div className="flex items-center gap-3 text-xs whitespace-nowrap">
          {(isPrivileged || isDirector) && (
            <>
              <button
                onClick={() => {
                  setPendingTextControllerUserIds(new Set(textControllerUserIds));
                  setTextControlPopupOpen(true);
                }}
                className="flex items-center gap-1.5 transition-colors"
                style={{ color: textControlPopupOpen ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                data-testid="button-open-text-control"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Controle de Texto</span>
              </button>
              <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
            </>
          )}
          {!micReady && (
            <span className="flex items-center gap-1" style={{ color: "hsl(0 72% 65%)" }}>
              <MicOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sem mic</span>
            </span>
          )}
          {micReady && (
            <span className="flex items-center gap-1" style={{ color: "hsl(160 84% 60%)" }}>
              <Mic className="w-3.5 h-3.5" /> <span className="hidden sm:inline">48kHz / 24bit</span>
            </span>
          )}
          <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
          {/* WebSocket Connection Status */}
          {wsConnected ? (
            <span className="flex items-center gap-1" style={{ color: "hsl(160 84% 60%)" }} title="Sincronização ativa">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline text-[10px]">Sinc</span>
            </span>
          ) : (
            <span className="flex items-center gap-1" style={{ color: "hsl(0 72% 65%)" }} title="Desconectado - sincronização não funciona">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="hidden sm:inline text-[10px]">Offline</span>
            </span>
          )}
          <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
          {recordingProfile ? (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
              <span className="font-medium" style={{ color: "hsl(var(--foreground) / 0.80)" }}>{recordingProfile.voiceActorName}</span>
              <span style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>/</span>
              {charactersList && charactersList.length > 1 ? (
                <select
                  value={recordingProfile.characterId}
                  onChange={(e) => handleChangeCharacter(e.target.value)}
                  className="font-medium bg-transparent border-none text-xs cursor-pointer focus:outline-none pr-1"
                  style={{ color: "hsl(var(--primary))" }}
                  data-testid="select-active-character"
                >
                  {charactersList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <span className="font-medium" style={{ color: "hsl(var(--primary))" }} data-testid="text-active-character">{recordingProfile.characterName}</span>
              )}
              <button
                onClick={() => setShowProfilePanel(true)}
                className="ml-1 transition-colors" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
                data-testid="button-edit-profile"
                title="Editar perfil"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowProfilePanel(true)}
              className="flex items-center gap-1.5 transition-colors" style={{ color: "hsl(217 91% 60%)" }}
              data-testid="button-setup-profile"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Definir Perfil</span>
            </button>
          )}
          <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
          {(isPrivileged || isDirector) && (
            <button
              onClick={() => setTakesPopupOpen(true)}
              className="transition-colors"
              style={{ color: "hsl(var(--muted-foreground))" }}
              data-testid="button-open-takes-popup"
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" style={{ color: "hsl(160 84% 60%)" }} />
              <span className="hidden sm:inline">{takeCount} take{takeCount !== 1 ? "s" : ""}</span>
            </button>
          )}
          <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
          <button
            onClick={() => setDeviceSettingsOpen(true)}
            className="flex items-center gap-1.5 transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}
            data-testid="button-open-device-settings"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dispositivos</span>
          </button>
          <div className="hidden sm:block w-px h-4" style={{ background: "hsl(var(--border))" }} />
          <button
            onClick={() => { setIsCustomizing(true); setPendingShortcuts(shortcuts); }}
            className="flex items-center gap-1.5 transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}
            data-testid="button-open-shortcuts"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atalhos</span>
          </button>
          </div>
        </div>
      </header>

      <div ref={splitContainerRef} className="flex-1 flex flex-row overflow-hidden">
        <div className="flex flex-col min-h-0" style={{ width: `${splitRatio * 100}%`, minWidth: "25%", maxWidth: "80%" }}>
          <div className="flex-1 min-h-[240px] relative overflow-hidden" style={{ background: "rgb(10,10,14)", border: "1px solid rgba(0,0,0,0.15)", margin: "4px 4px 0 4px", borderRadius: "12px" }}>
            {production?.videoUrl ? (
              <video
                ref={videoRef}
                src={production.videoUrl}
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                muted={isMuted}
                playsInline
                disablePictureInPicture
                controls={false}
                controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ color: "rgba(255,255,255,0.50)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <Play className="w-7 h-7" />
                </div>
                <p className="text-xs">Nenhum video anexado a esta producao</p>
              </div>
            )}


            <button
              onClick={() => setIsMuted((m) => !m)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 text-zinc-400 hover:text-white transition-all hover:bg-black/60"
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {videoDuration > 0 && (
            <div className="px-3 sm:px-5 py-2" style={{ background: "hsl(var(--muted) / 0.4)", borderTop: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span>{formatTimecode(videoTime)}</span>
                <div className="flex-1 relative h-1.5 rounded-full cursor-pointer group" style={{ background: "hsl(var(--border))" }} onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  scrub((e.clientX - rect.left) / rect.width);
                }}>
                  {scriptLines.map((line, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 rounded-sm transition-all ${
                        savedTakes.has(i) ? "bg-emerald-400/70" :
                        currentLines.has(i) ? "bg-amber-400/70" :
                        ""
                      }`}
                      style={{
                        left: `${(line.start / videoDuration) * 100}%`,
                        width: `${Math.max(0.5, ((line.end! - line.start) / videoDuration) * 100)}%`,
                        ...(!savedTakes.has(i) && !currentLines.has(i) ? { background: "rgba(255,255,255,0.15)" } : {}),
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md"
                    style={{ left: `${(videoTime / videoDuration) * 100}%`, transform: "translate(-50%,-50%)", background: "hsl(var(--primary))", border: "2px solid hsl(var(--foreground) / 0.80)", boxShadow: "0 0 8px rgba(59,130,246,0.4)" }}
                  />
                </div>
                <span>{formatTimecode(videoDuration)}</span>
              </div>
            </div>
          )}

          <div className="shrink-0 px-3 sm:px-5 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0" style={{ background: "hsl(var(--card))", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -1px 3px rgba(0,0,0,0.04)" }}>
            <div className="hidden sm:flex w-full sm:w-56 shrink-0 flex flex-col justify-center gap-1 py-0 sm:py-3">
              <div className="flex items-center justify-between text-[10px] mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span className="uppercase tracking-wider">
                  {recordingStatus === "recording" ? "Ao Vivo" :
                    recordingStatus === "previewing" ? "Reproduzindo" :
                    recordingStatus === "recorded" ? "Gravado" :
                    micReady ? "Monitorando" : "Sem microfone"}
                </span>
                {recordingStatus === "recording" && (
                  <span className="flex items-center gap-1" style={{ color: "hsl(0 72% 65%)" }}>
                    <Circle className="w-1.5 h-1.5 fill-red-500 animate-pulse" /> REC
                  </span>
                )}
                {(recordingStatus === "recorded" || recordingStatus === "previewing") && lastRecording && (
                  <div className="flex items-center gap-2">
                    {qualityMetrics && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={
                        qualityMetrics.score > 80 ? { background: "hsl(142 72% 95%)", color: "hsl(142 72% 36%)", border: "1px solid hsl(142 72% 80%)" } :
                        qualityMetrics.score > 50 ? { background: "hsl(var(--info-bg))", color: "hsl(var(--info))", border: "1px solid hsl(var(--info-border))" } :
                        { background: "hsl(0 84% 97%)", color: "hsl(0 72% 48%)", border: "1px solid hsl(0 84% 85%)" }
                      }>
                        {qualityMetrics.score}
                      </span>
                    )}
                    <span className="font-mono" style={{ color: "hsl(217 91% 60%)" }}>{lastRecording.durationSeconds.toFixed(1)}s</span>
                  </div>
                )}
              </div>
              <MonitorPanel
                micState={micState}
                recordingStatus={recordingStatus}
                lastRecording={lastRecording}
                previewAudioRef={previewAudioRef}
                savedSamples={null}
              />
            </div>

            <div className="w-full sm:w-auto flex flex-row sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => seek(-2)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }}
                data-testid="button-back-2s"
                title={`Back 2s (${keyLabel(shortcuts.back)})`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all" style={{ background: "hsl(var(--secondary))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                data-testid="button-play-pause"
                title={`Play/Pause (${keyLabel(shortcuts.playPause)})`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={recordingStatus === "recording" ? handleStopRecording : handleStopPlayback}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }}
                data-testid="button-stop"
                title={`Stop (${keyLabel(shortcuts.stop)})`}
              >
                <Square className="w-4 h-4" />
              </button>

              <div className="hidden sm:block w-px h-8 mx-1" style={{ background: "hsl(var(--border))" }} />

              {recordingStatus === "idle" || recordingStatus === "countdown" ? (
                <button
                  onClick={startCountdown}
                  disabled={!micReady || recordingStatus === "countdown"}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style={recordingStatus === "countdown"
                    ? { background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.30)", cursor: "wait", color: "hsl(var(--primary))" }
                    : { background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground) / 0.70)" }
                  }
                  data-testid="button-record"
                  title={`Record (${keyLabel(shortcuts.record)})`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : recordingStatus === "recording" ? (
                <button
                  onClick={handleStopRecording}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all"
                  style={{ background: "hsl(0 72% 55%)", boxShadow: "0 0 24px rgba(239,68,68,0.4), 0 4px 12px rgba(0,0,0,0.3)" }}
                  data-testid="button-stop-recording"
                  title={`Stop recording (${keyLabel(shortcuts.stop)})`}
                >
                  <Square className="w-5 h-5 text-white fill-white" />
                </button>
              ) : null}

              <div className="hidden sm:block w-px h-8 mx-1" style={{ background: "hsl(var(--border))" }} />

              <button
                onClick={() => seek(2)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }}
                data-testid="button-forward-2s"
                title={`Forward 2s (${keyLabel(shortcuts.forward)})`}
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (loopSelectionMode === "idle") {
                    setLoopSelectionMode("selecting-start");
                    setIsLooping(true);
                    toast({ title: "Modo de Selecao de Loop", description: "Clique na primeira fala para iniciar o loop." });
                  } else {
                    setLoopSelectionMode("idle");
                    setCustomLoop(null);
                    setIsLooping(false);
                    emitVideoEvent("sync-loop", { loopRange: null });
                  }
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={isLooping || loopSelectionMode !== "idle"
                  ? { background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))", boxShadow: "0 0 0 1px hsl(var(--primary) / 0.30)" }
                  : { color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }
                }
                data-testid="button-loop"
                title={`Toggle loop (${keyLabel(shortcuts.loop)})`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:flex w-full sm:w-44 shrink-0 flex-col items-start sm:items-end gap-1.5">
              {isLooping && loopRange && (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <span>Loop:</span>
                    <span>{formatTimecode(loopRange.start)}</span>
                    <span>→</span>
                    <span>{formatTimecode(loopRange.end)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setLoopSelectionMode("idle");
                      setCustomLoop(null);
                      setIsLooping(false);
                      emitVideoEvent("sync-loop", { loopRange: null });
                    }}
                    className="text-[10px] underline" style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divisória arrastável — oculta em mobile */}
        <div
          className="hidden md:flex shrink-0 items-center justify-center cursor-col-resize group relative select-none"
          style={{ width: 6, background: "hsl(var(--border))" }}
          onPointerDown={handleDividerPointerDown}
        >
          <div
            className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "hsl(var(--primary) / 0.6)" }}
          />
        </div>

        <div className="flex flex-col min-h-0 flex-1 min-w-0 bg-muted/30">
          <div className="h-11 shrink-0 px-5 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
              Roteiro
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOnlyMyCharacter(!showOnlyMyCharacter)}
                className="text-[10px] font-semibold px-1.5 py-1 rounded-full transition-colors flex items-center gap-1"
                style={showOnlyMyCharacter
                  ? { background: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.25)" }
                  : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                }
                data-testid="button-filter-character"
                title={showOnlyMyCharacter ? `Mostrando apenas ${recordingProfile?.characterName || "personagem"}` : "Filtrar por personagem"}
              >
                <User className="w-3 h-3" />
                <span className="sm:hidden">Pers</span>
                <span className="hidden sm:inline">Apenas personagem</span>
              </button>
              <div className="w-px h-3" style={{ background: "hsl(var(--border))" }} />
              <button
                type="button"
                onClick={() => { setScriptAutoFollow(true); scrollScriptToLine(currentLine, "smooth"); }}
                className="text-[10px] font-semibold px-1.5 py-1 rounded-full transition-colors flex items-center gap-1"
                style={scriptAutoFollow
                  ? { background: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.25)" }
                  : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                }
                data-testid="button-script-follow"
                title={scriptAutoFollow ? "Sincronizacao ativa" : "Ativar sincronizacao"}
              >
                <Navigation className="w-3 h-3" />
                <span className="sm:hidden">Sync</span>
                <span className="hidden sm:inline">SEGUIR</span>
              </button>
              <span className="text-[10px] hidden sm:inline" style={{ color: "hsl(var(--muted-foreground) / 0.55)" }}>
                {scriptAutoFollow ? "texto sincronizado" : "texto livre"}
              </span>
              <div className="w-px h-3" style={{ background: "hsl(var(--border))" }} />
              <button
                type="button"
                onClick={() => { const v = Math.max(0.6, +(scriptFontScale - 0.15).toFixed(2)); setScriptFontScale(v); localStorage.setItem("vhub_script_font_scale", String(v)); }}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors select-none"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))", lineHeight: 1 }}
                title="Diminuir tamanho do texto"
                disabled={scriptFontScale <= 0.6}
              >A-</button>
              <button
                type="button"
                onClick={() => { const v = +(scriptFontScale + 0.15).toFixed(2); setScriptFontScale(v); localStorage.setItem("vhub_script_font_scale", String(v)); }}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors select-none"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))", lineHeight: 1 }}
                title="Aumentar tamanho do texto"
              >A+</button>
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                <span className="font-mono" style={{ color: "hsl(var(--foreground) / 0.75)" }}>{currentLine + 1}</span>
                {" "}/{" "}
                {scriptLines.length}
              </span>
            </div>
          </div>

          <div
            ref={scriptViewportRef}
            className="flex-1 overflow-y-auto py-3 px-4 min-h-0 relative"
            style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" as any }}
            onScroll={handleScriptViewportScroll}
            onWheelCapture={markScriptUserScrollIntent}
            onTouchMoveCapture={markScriptUserScrollIntent}
            onPointerDownCapture={markScriptUserScrollIntent}
          >

            {scriptLines.length > 1 && (
              <div className="absolute right-1 top-3 bottom-3 w-[3px] rounded-full" style={{ background: "hsl(var(--border))", pointerEvents: "none" }}>
                <div
                  className="absolute left-0 right-0 mx-auto w-full rounded-full transition-[top] duration-500 ease-out"
                  style={{
                    height: 34,
                    top: `${(currentLine / Math.max(1, scriptLines.length - 1)) * 100}%`,
                    transform: "translateY(-50%)",
                    background: "hsl(var(--primary) / 0.50)",
                    boxShadow: "0 0 0 1px hsl(var(--primary) / 0.18)",
                  }}
                />
              </div>
            )}
            {scriptLines.length === 0 && !session && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "2px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))" }} />
                <p className="text-sm">Carregando sessao...</p>
              </div>
            )}
            {scriptLines.length === 0 && session && (
              <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                <p className="text-sm">Nenhum roteiro carregado</p>
                <p className="text-xs">Adicione um roteiro a producao para ver as falas aqui</p>
              </div>
            )}
            {scriptLines
              .map((line, originalIndex) => ({ line, originalIndex }))
              .filter(({ line }) => !showOnlyMyCharacter || !recordingProfile || line.character.toLowerCase().trim() === recordingProfile.characterName.toLowerCase().trim())
              .map(({ line, originalIndex: i }) => {
              const isActive = currentLines.has(i);
              const isDone = savedTakes.has(i);
              const isInLoop = customLoop && line.start >= customLoop.start && (line.end || line.start) <= customLoop.end;
              const lineTakes = takesList.filter((t: any) => t.lineIndex === i);
              return (
                <div
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  onClick={canTextControl ? (() => handleLineClick(i)) : undefined}
                  className={`mb-3 px-5 py-4 lg:px-6 lg:py-5 rounded-xl transition-[background,box-shadow,opacity] duration-500 ease-out relative overflow-hidden ${canTextControl ? "cursor-pointer" : "cursor-default"}`}
                  style={{
                    background: isActive
                      ? "linear-gradient(90deg, var(--room-script-active-bg) 0%, transparent 72%)"
                      : isInLoop ? "hsl(var(--primary) / 0.04)" : "transparent",
                    boxShadow: isActive
                      ? "0 2px 16px hsl(217 60% 60% / 0.07)"
                      : isInLoop && !isActive ? "inset 0 0 0 1px hsl(var(--primary) / 0.12)" : "none",
                    ...(canTextControl ? {} : { opacity: 0.92 }),
                  }}
                  data-testid={`script-line-${i}`}
                >
                  {/* Acento esquerdo — ativo (azul) ou em loop (âmbar) */}
                  <div
                    className="absolute left-0 top-2 bottom-2 rounded-full transition-[width,opacity,background-color] duration-500 ease-out"
                    style={{
                      width: isActive ? 3 : isInLoop ? 2 : 0,
                      opacity: isActive ? 0.65 : isInLoop ? 0.45 : 0,
                      background: isActive ? "var(--room-script-active-accent)" : "hsl(38 92% 55%)",
                    }}
                  />
                  <div className="flex items-center gap-3 mb-2 lg:mb-3">
                    <span className="text-[16px] lg:text-[16px] font-mono tabular-nums font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {formatTimecode(line.start)}
                    </span>
                    <span
                      className="font-extrabold uppercase tracking-[0.5px] transition-colors duration-500 ease-out leading-tight"
                      style={{ fontSize: Math.round(24 * scriptFontScale), color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.45)" }}
                    >
                      {line.character}
                    </span>
                    {canTextControl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLineIndex(i);
                          setEditingLineText(lineEdits[i] ?? line.text);
                        }}
                        className="ml-1 p-1 rounded transition-colors"
                        style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
                        title="Editar fala"
                        data-testid={`button-edit-line-${i}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {editingLineIndex === i ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={editingLineText}
                        onChange={(e) => setEditingLineText(e.target.value)}
                        className="w-full rounded-lg p-3 text-[16px] lg:text-[18px] leading-relaxed border focus:border-primary outline-none"
                        style={{ background: "hsl(var(--input))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                        rows={3}
                        data-testid={`textarea-edit-line-${i}`}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingLineIndex(null);
                            setEditingLineText("");
                          }}
                          className="vhub-btn-xs vhub-btn-secondary"
                          data-testid={`button-cancel-edit-line-${i}`}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            if (!canTextControl) return;
                            const nextText = String(editingLineText || "");
                            setLineEdits((prev) => ({ ...prev, [i]: nextText }));
                            emitTextControlEvent("text-control:update-line", { lineIndex: i, text: nextText });
                            setEditingLineIndex(null);
                            setEditingLineText("");
                          }}
                          className="vhub-btn-xs vhub-btn-primary"
                          data-testid={`button-save-edit-line-${i}`}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-[1.7] transition-[color,opacity] duration-500 ease-out" style={{
                      fontSize: Math.round(22 * scriptFontScale),
                      color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      fontWeight: isActive ? 500 : 400,
                      opacity: isActive ? 1 : 0.72,
                    }}>
                      {lineEdits[i] ?? line.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      <DailyMeetPanel sessionId={sessionId} />

      {/* Voice Actor Approval Popup */}
      {!isDirector && pendingApprovalTake && (
        <Dialog open={true} onOpenChange={() => {
          if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
            setPendingApprovalTake(null);
            setApprovalStatus(null);
            setDirectorFeedback('');
            cleanupPreview();
          }
        }}>
          <DialogContent className="max-w-md fixed bottom-4 right-4 translate-x-0 translate-y-0">
            {approvalStatus === 'pending' && (
              <>
                <DialogHeader>
                  <DialogTitle>✅ Take Gravado com Sucesso!</DialogTitle>
                  <DialogDescription>
                    Aguardando aprovação do diretor...
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full animate-spin border-2 border-muted border-t-primary" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {pendingApprovalTake.characterName} - Linha {pendingApprovalTake.lineIndex + 1}
                </p>
              </>
            )}
            
            {approvalStatus === 'approved' && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-green-500">🎉 Take Aprovado!</DialogTitle>
                </DialogHeader>
                {directorFeedback && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                    <p className="text-sm font-medium text-green-500 mb-1">Feedback do Diretor:</p>
                    <p className="text-sm">{directorFeedback}</p>
                  </div>
                )}
                <Button onClick={() => {
                  setPendingApprovalTake(null);
                  setApprovalStatus(null);
                  setDirectorFeedback('');
                  cleanupPreview();
                }} className="w-full">Continuar Gravação</Button>
              </>
            )}
            
            {approvalStatus === 'rejected' && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-destructive">❌ Take Rejeitado</DialogTitle>
                </DialogHeader>
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <p className="text-sm font-medium text-destructive mb-1">Feedback do Diretor:</p>
                  <p className="text-sm">{directorFeedback || 'O diretor solicitou uma nova gravação.'}</p>
                </div>
                <Button onClick={() => {
                  setPendingApprovalTake(null);
                  setApprovalStatus(null);
                  setDirectorFeedback('');
                  cleanupPreview();
                }} className="w-full">Gravar Novamente</Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Director Approval Popup */}
      {isDirector && pendingApprovalTake && !approvalStatus && (
          <div className="fixed bottom-4 left-4 z-50 rounded-xl p-4" style={{ width: 420, background: "var(--room-modal-bg)", border: "1px solid hsl(var(--border))", boxShadow: "var(--room-modal-shadow)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Revisar Take</p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {pendingApprovalTake.voiceActorName} — {pendingApprovalTake.characterName} — Linha {pendingApprovalTake.lineIndex + 1}
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingApprovalTake(null);
                  setApprovalOffset(0);
                  if (approvalAudioRef.current) { approvalAudioRef.current.pause(); approvalAudioRef.current = null; }
                  if (videoRef.current) { videoRef.current.volume = 1; }
                }}
                className="ml-2 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Waveform editor */}
            <div className="mb-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", paddingBottom: 12 }}>
              <TakeWaveformEditor
                key={pendingApprovalTake.audioUrl}
                audioUrl={pendingApprovalTake.audioUrl}
                durationSeconds={pendingApprovalTake.durationSeconds}
                onTrim={handleApprovalTrim}
              />
            </div>

            {/* Timeline positioner */}
            {videoDuration > 0 && (
              <div className="mb-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", paddingBottom: 12 }}>
                <AudioTimelinePositioner
                  key={pendingApprovalTake.durationSeconds}
                  videoDuration={videoDuration}
                  audioDuration={pendingApprovalTake.durationSeconds}
                  startTimeSeconds={approvalOffset}
                  onChange={setApprovalOffset}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={handleDirectorPreview}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <Play className="w-3 h-3 mr-1.5" />
                Play Preview (offset ajustado)
              </Button>
              
              <Textarea
                value={directorFeedback}
                onChange={(e) => setDirectorFeedback(e.target.value)}
                placeholder="Feedback (opcional)..."
                rows={2}
                className="text-xs resize-none"
                style={{ minHeight: "unset" }}
              />
              
              <div className="flex gap-1.5">
                <Button
                  onClick={() => handleTakeDecision("approve", directorFeedback)}
                  className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => handleTakeDecision("reject", directorFeedback)}
                  variant="destructive"
                  className="flex-1 h-8 text-xs"
                  size="sm"
                >
                  <X className="w-3 h-3 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
