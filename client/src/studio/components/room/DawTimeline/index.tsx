import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import type { MicrophoneState } from "@studio/lib/audio/microphoneManager";
import { getTimeDomainData } from "@studio/lib/audio/microphoneManager";
import type { RecordingStatus } from "@studio/lib/audio/recordingEngine";
import { drawWaveformGradient, type WaveColor } from "./waveformUtils";
import type { Peak } from "./types";

import { useDawTimeline }  from "./useDawTimeline";
import { TimeRuler }       from "./TimeRuler";
import { TrackHeader }     from "./TrackHeader";
import { AudioClipMemo, type ActorPalette } from "./AudioClip";
import { DawToolbar }      from "./DawToolbar";
import { TakesPanel }      from "./TakesPanel";
import { detectAudioRegions, formatTimecode } from "./silenceDetector";
import type { ApprovedTake, PendingReviewTake, ScriptLine, DawTrack, DawClip, VoiceActorProfile } from "./types";

// ── Constantes de layout ──────────────────────────────────────────────────────
const TOOLBAR_H  = 48;
const RULER_H    = 28;
export const TRACK_H    = 80;
export const HEADER_W   = 210;
const MAX_VIS_TRACKS = 7;

// ── Paletas por ator (Studio Glass — até 5 cores distintas) ──────────────────
const ACTOR_PALETTES: ActorPalette[] = [
  { clipBg: "linear-gradient(135deg,#0f1e3d,#091629)", border: "#1d4ed8", glow: "rgba(59,130,246,0.28)",  wave: "blue"   },
  { clipBg: "linear-gradient(135deg,#0a1e10,#061408)", border: "#15803d", glow: "rgba(34,197,94,0.28)",  wave: "green"  },
  { clipBg: "linear-gradient(135deg,#1e1000,#160c00)", border: "#b45309", glow: "rgba(245,158,11,0.28)", wave: "yellow" },
  { clipBg: "linear-gradient(135deg,#150b2a,#100820)", border: "#7c3aed", glow: "rgba(139,92,246,0.28)", wave: "purple" },
  { clipBg: "linear-gradient(135deg,#1e0a12,#160810)", border: "#be185d", glow: "rgba(244,63,94,0.28)",  wave: "rose"   },
];
const ACTOR_ACCENTS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#f43f5e"];
function getActorPalette(trackIndex: number): ActorPalette {
  return ACTOR_PALETTES[trackIndex % ACTOR_PALETTES.length];
}
function getActorAccent(trackIndex: number): string {
  return ACTOR_ACCENTS[trackIndex % ACTOR_ACCENTS.length];
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DawTimelineProps {
  scriptLines: ScriptLine[];
  currentLine: number;
  videoUrl?: string;
  videoDuration: number;
  videoTime: number;
  isPlaying: boolean;
  micState: MicrophoneState | null;
  recordingStatus: RecordingStatus;
  lastRecording: { samples: Float32Array; durationSeconds: number } | null;
  recordingStartTime: number;
  /** Perfil do ator local (undefined/null quando diretor não está gravando) */
  recordingProfile?: { voiceActorId: string; voiceActorName: string; characterName: string } | null;
  /** Perfis conhecidos — um por dublador online com perfil definido */
  voiceActorProfiles: VoiceActorProfile[];
  remoteRecording?: {
    startTimeSeconds: number;
    peaks: { min: number; max: number }[];
    voiceActorId?: string;
    voiceActorName?: string;
    characterName?: string;
  } | null;
  approvedTakes: ApprovedTake[];
  pendingApprovalTake: PendingReviewTake | null;
  approvalOffset: number;
  onSeekToTime: (t: number) => void;
  onApprovalOffsetChange: (s: number) => void;
  onApprovalTrim: (start: number, end: number) => void;
  onTakeDecision: (action: "approve" | "reject", feedback: string) => void;
  directorFeedback: string;
  onFeedbackChange: (s: string) => void;
  onDirectorPreview?: () => void;
  onLoopChange?: (range: { start: number; end: number } | null) => void;
  onTakeSplit?: (takeId: string, splitAt: number) => void;
  onTakeTrim?: (takeId: string, startSec: number, endSec: number) => void;
  onTakeDelete?: (takeId: string) => void;
  onSamplesEdited?: (samples: Float32Array) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onMuteVideo?: () => void;
  onUnmuteVideo?: () => void;
  onPlayVideo?: () => void;
  // ── Takes panel ──────────────────────────────────────────────────────────
  takesList?: any[];
  isDirectorOrPrivileged?: boolean;
  userId?: string;
  takeCacheBust?: Record<string, number>;
  calculateEndLine?: (lineIndex: number, durationSeconds: number) => number;
  onDownloadTake?: (take: any) => void;
  onTakeSilenceRemove?: (takeId: string, regions: Array<{ start: number; end: number; name: string }>) => void;
}

// Re-exporta tipos para uso em room.tsx
export type { ApprovedTake, PendingReviewTake };

// ── Componente principal ──────────────────────────────────────────────────────
// ── Canvas de waveform ao vivo (lê peaks de um ref, redesenha via RAF) ──────
const LiveWaveformCanvas = memo(function LiveWaveformCanvas({
  peaksRef, height, colorScheme = "green",
}: {
  peaksRef: React.RefObject<Peak[]>;
  height: number;
  colorScheme?: WaveColor;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf: number;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      const peaks = peaksRef.current;
      if (!ctx || !peaks || !peaks.length) { raf = requestAnimationFrame(draw); return; }
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawWaveformGradient(ctx, peaks, 0, W, H / 2, H * 0.42, colorScheme);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [peaksRef, colorScheme]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
});


// ── Grade de fundo da faixa — FORA da função para referência estável (fix frame-by-frame) ──
const GridBackground = memo(function GridBackground({ height, zoom }: { height: number; zoom: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        height,
        pointerEvents: "none",
        backgroundImage: [
          `repeating-linear-gradient(90deg, #12172a 0px, #12172a 1px, transparent 1px, transparent ${zoom}px)`,
          `repeating-linear-gradient(90deg, #18203a 0px, #18203a 1px, transparent 1px, transparent ${zoom * 4}px)`,
        ].join(", "),
      }}
    />
  );
});

export function DawTimeline({
  scriptLines, currentLine, videoUrl, videoDuration, videoTime, isPlaying,
  micState, recordingStatus, lastRecording, recordingStartTime,
  recordingProfile, voiceActorProfiles,
  remoteRecording, approvedTakes, pendingApprovalTake, approvalOffset,
  onSeekToTime, onApprovalOffsetChange, onApprovalTrim, onTakeDecision,
  directorFeedback, onFeedbackChange, onDirectorPreview,
  onLoopChange, onTakeSplit, onTakeTrim, onTakeDelete, onTakeSilenceRemove,
  onMuteVideo, onUnmuteVideo, onPlayVideo,
  videoRef,
  takesList = [], isDirectorOrPrivileged = false, userId,
  takeCacheBust, calculateEndLine, onDownloadTake,
}: DawTimelineProps) {

  const daw = useDawTimeline();
  const scrollRef    = useRef<HTMLDivElement>(null);
  const leftRef      = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // ── Refs for 60fps RAF animation (bypass React reconciler) ──────────────
  const playheadRef       = useRef<HTMLDivElement>(null);
  const videoTimeRef      = useRef(videoTime);
  const scrollLeftRef     = useRef(scrollLeft);
  const dawZoomRef        = useRef(daw.zoom);
  const recStartRef       = useRef(recordingStartTime);
  videoTimeRef.current    = videoTime;
  scrollLeftRef.current   = scrollLeft;
  dawZoomRef.current      = daw.zoom;
  recStartRef.current     = recordingStartTime;

  // Single RAF loop — updates playhead DOM directly at 60fps
  useEffect(() => {
    let raf: number;
    const loop = () => {
      const vt = videoRef?.current?.currentTime ?? videoTimeRef.current;
      const z  = dawZoomRef.current;
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${Math.round(vt * z - 1)}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isPreviewing,      setIsPreviewing]      = useState(false);
  const [isPreviewLoading,  setIsPreviewLoading]  = useState(false);
  const [isRemovingSilence, setIsRemovingSilence] = useState(false);
  const previewAudioRef         = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioRef        = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioUrlRef     = useRef<string | null>(null);
  const preloadedBlobUrlRef      = useRef<string | null>(null);       // revogado ao trocar clip
  const preloadFetchAbortRef     = useRef<AbortController | null>(null);
  const previewRafRef            = useRef<number | null>(null);

  // Live peaks ref — updated inside RAF, never causes re-render
  const liveRollingPeaksRef     = useRef<Peak[]>([]);
  const liveRafRef              = useRef<number | null>(null);
  const lastLiveTsRef           = useRef<number>(0);
  // Remote recording peaks ref — updated each render so LiveWaveformCanvas sees latest data
  const remoteRecordingPeaksRef = useRef<Peak[]>([]);
  remoteRecordingPeaksRef.current = remoteRecording?.peaks ?? [];

  // Waveform congelada — mantém a waveform visível entre o fim da gravação e a aprovação
  const frozenPeaksRef         = useRef<Peak[]>([]);
  const frozenActorIdRef       = useRef<string | null>(null);
  const frozenStartTimeRef     = useRef<number>(0);
  const frozenDurationRef      = useRef<number>(0);
  const [hasFrozenPeaks, setHasFrozenPeaks] = useState(false);
  const prevRecordingStatusRef = useRef(recordingStatus);


  // ── Estados derivados ──────────────────────────────────────────────────
  const isRecording  = recordingStatus === "recording" || recordingStatus === "countdown";
  const isReviewMode = !!pendingApprovalTake;
  const effectiveDur = videoDuration > 0 ? videoDuration : 60;
  const innerW       = Math.max(800, effectiveDur * daw.zoom + 200);

  // ── Faixas (tracks) — uma por dublador com perfil definido ──────────────────
  const tracks = useMemo((): DawTrack[] => {
    const list: DawTrack[] = [];
    voiceActorProfiles.forEach((actor, i) => {
      list.push({
        index: i,
        label: actor.voiceActorName,
        character: actor.characterName,
        voiceActorId: actor.voiceActorId,
        lineText: actor.characterName,
      });
    });
    return list;
  }, [voiceActorProfiles]);

  // ── Clips de áudio aprovados ────────────────────────────────────────────────
  const clips = useMemo((): DawClip[] => {
    return approvedTakes.map(t => {
      const bust = takeCacheBust?.[t.id];
      const sep  = t.audioUrl?.includes("?") ? "&" : "?";
      const audioUrl = bust ? `${t.audioUrl}${sep}t=${bust}` : t.audioUrl;
      return {
        id: t.id,
        voiceActorId: t.voiceActorId ?? t.voiceActorName,
        lineIndex: t.lineIndex ?? 0,
        startTime: t.startTimeSeconds,
        duration: t.durationSeconds,
        audioUrl,
        voiceActorName: t.voiceActorName,
        characterName: t.characterName ?? "",
        status: "approved" as const,
      };
    });
  }, [approvedTakes, takeCacheBust]);

  // Clip do take pendente de revisão
  const pendingClip = useMemo((): DawClip | null => {
    if (!pendingApprovalTake) return null;
    return {
      id: `pending-${pendingApprovalTake.takeId}`,
      voiceActorId: pendingApprovalTake.voiceActorId,
      lineIndex: pendingApprovalTake.lineIndex,
      startTime: approvalOffset,
      duration: pendingApprovalTake.durationSeconds,
      audioUrl: pendingApprovalTake.audioUrl,
      voiceActorName: pendingApprovalTake.voiceActorName,
      characterName: pendingApprovalTake.characterName,
      status: "pending" as const,
    };
  }, [pendingApprovalTake, approvalOffset]);

  // ── Carregar picos de waveform ────────────────────────────────────────────────
  useEffect(() => {
    for (const clip of clips) {
      daw.loadPeaks(clip.id, clip.audioUrl);
    }
  }, [clips]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Invalidar cache de picos quando um take é cortado (takeCacheBust muda) ──
  const prevCacheBustRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!takeCacheBust) return;
    for (const [id, ts] of Object.entries(takeCacheBust)) {
      if (prevCacheBustRef.current[id] !== ts) {
        daw.evictPeaks(id);
        const clip = clips.find(c => c.id === id);
        if (clip?.audioUrl) daw.loadPeaks(id, clip.audioUrl);
      }
    }
    prevCacheBustRef.current = { ...takeCacheBust };
  }, [takeCacheBust]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingClip) daw.loadPeaks(pendingClip.id, pendingClip.audioUrl);
  }, [pendingClip]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RAF: captura picos do microfone em tempo real ──────────────────────
  useEffect(() => {
    const isActuallyRecording = recordingStatus === "recording";
    if (!isActuallyRecording || !micState) {
      if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
      if (!isActuallyRecording) liveRollingPeaksRef.current = [];
      return;
    }
    liveRollingPeaksRef.current = [];
    lastLiveTsRef.current = 0;
    const tick = (ts: number) => {
      if (ts - lastLiveTsRef.current >= 30) {
        const data = getTimeDomainData(micState);
        let mn = 0, mx = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        liveRollingPeaksRef.current.push({ min: mn, max: mx });
        lastLiveTsRef.current = ts;
      }
      liveRafRef.current = requestAnimationFrame(tick);
    };
    liveRafRef.current = requestAnimationFrame(tick);
    return () => { if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current); };
  }, [recordingStatus, micState]);

  // ── Congela waveform ao vivo quando gravação termina ───────────────────────
  useEffect(() => {
    const prev = prevRecordingStatusRef.current;
    prevRecordingStatusRef.current = recordingStatus;
    if (prev === "recording" && recordingStatus !== "recording") {
      if (liveRollingPeaksRef.current.length > 0 && recordingProfile) {
        frozenPeaksRef.current   = [...liveRollingPeaksRef.current];
        frozenActorIdRef.current  = recordingProfile.voiceActorId || recordingProfile.voiceActorName;
        frozenStartTimeRef.current = recordingStartTime;
        frozenDurationRef.current  = Math.max(0.5, videoTime - recordingStartTime);
        setHasFrozenPeaks(true);
      }
    }
  }, [recordingStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Semente peaks do pending clip + limpa waveform congelada ───────────────
  useEffect(() => {
    if (!pendingApprovalTake) return;
    const clipId = `pending-${pendingApprovalTake.takeId}`;
    if (frozenPeaksRef.current.length > 0) {
      daw.seedPeaks(clipId, frozenPeaksRef.current);
      frozenPeaksRef.current  = [];
      frozenActorIdRef.current = null;
      setHasFrozenPeaks(false);
    } else if (liveRollingPeaksRef.current.length > 0) {
      daw.seedPeaks(clipId, [...liveRollingPeaksRef.current]);
    }
  }, [pendingApprovalTake?.takeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preload de áudio via fetch (garante que o blob está 100% em memória antes do preview) ──
  useEffect(() => {
    const clip = daw.selectedClipId ? clips.find(c => c.id === daw.selectedClipId) : null;
    if (!clip?.audioUrl) return;
    if (preloadedAudioUrlRef.current === clip.audioUrl) return; // já baixado

    // Aborta fetch anterior ainda em voo
    preloadFetchAbortRef.current?.abort();

    // Descarta blob e áudio anteriores (mas não toca no áudio em reprodução)
    if (preloadedBlobUrlRef.current) {
      URL.revokeObjectURL(preloadedBlobUrlRef.current);
      preloadedBlobUrlRef.current = null;
    }
    if (preloadedAudioRef.current && preloadedAudioRef.current !== previewAudioRef.current) {
      preloadedAudioRef.current.src = "";
    }
    preloadedAudioRef.current    = null;
    preloadedAudioUrlRef.current = null;

    const controller = new AbortController();
    preloadFetchAbortRef.current = controller;
    const targetUrl = clip.audioUrl;

    fetch(targetUrl, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then(blob => {
        if (controller.signal.aborted) return;
        const blobUrl = URL.createObjectURL(blob);
        const audio   = new Audio(blobUrl);
        preloadedBlobUrlRef.current  = blobUrl;
        preloadedAudioRef.current    = audio;
        preloadedAudioUrlRef.current = targetUrl;
      })
      .catch(() => {}); // AbortError ou erro de rede — silencioso

    return () => controller.abort();
  }, [daw.selectedClipId, clips]);

  // ── Arm automático: arma a faixa do ator que está gravando ─────────────────
  useEffect(() => {
    // Desarma todas as faixas de atores
    voiceActorProfiles.forEach((_, i) => daw.setArmed(i, false));
    if (!isRecording) return;
    // Gravação local: identifica faixa pelo perfil do ator local
    if (recordingProfile) {
      const idx = voiceActorProfiles.findIndex(
        a => a.voiceActorId === recordingProfile.voiceActorId ||
             a.voiceActorName === recordingProfile.voiceActorName
      );
      if (idx >= 0) daw.setArmed(idx, true);
    }
  }, [isRecording, recordingProfile, voiceActorProfiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll para acompanhar playhead ───────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isPlaying) return;
    const px = videoTime * daw.zoom;
    const w  = el.clientWidth;
    if (px < el.scrollLeft + 60 || px > el.scrollLeft + w - 60) {
      el.scrollLeft = Math.max(0, px - w / 3);
    }
  }, [videoTime, daw.zoom, isPlaying]);

  // ── Scroll sync ─────────────────────────────────────────────────────
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollLeft(el.scrollLeft);
    if (leftRef.current) leftRef.current.scrollTop = el.scrollTop;
  }, []);

  // ── Keyboard shortcuts (ref-based — listener adicionado uma vez, lê estado atualizado) ────
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>();
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
    if (e.key === "v" || e.key === "V") { e.preventDefault(); daw.setTool("pointer"); }
    if (e.key === "c" || e.key === "C") { e.preventDefault(); daw.setTool("removeSilence"); }
    if (e.key === "l" || e.key === "L") {
      e.preventDefault();
      if (daw.loopRegion || daw.tool === "loop") { daw.clearLoop(); onLoopChange?.(null); }
      else { daw.setTool("loop"); }
    }
    if ((e.key === "Delete" || e.key === "Backspace") && daw.selectedClipId) {
      e.preventDefault();
      onTakeDelete?.(daw.selectedClipId);
      daw.setSelectedClipId(null);
    }
    if ((e.key === "+" || e.key === "=") && !e.metaKey && !e.ctrlKey) daw.zoomIn();
    if (e.key === "-" && !e.metaKey && !e.ctrlKey) daw.zoomOut();
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview de clip selecionado ────────────────────────────────────────
  const previewDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = useCallback(() => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    if (previewDelayTimerRef.current) { clearTimeout(previewDelayTimerRef.current); previewDelayTimerRef.current = null; }
    if (previewRafRef.current)         { cancelAnimationFrame(previewRafRef.current); previewRafRef.current = null; }
    videoRef?.current?.pause();
    setIsPreviewing(false);
    setIsPreviewLoading(false);
    onUnmuteVideo?.();
  }, [onUnmuteVideo]); // videoRef is a stable ref — no need in deps

  const handlePreviewToggle = useCallback(async () => {
    if (isPreviewing || isPreviewLoading) { stopPreview(); return; }

    const clip = daw.selectedClipId
      ? clips.find(c => c.id === daw.selectedClipId)
      : null;
    if (!clip?.audioUrl) return;
    try {
      const LEAD_S       = 0.5;
      const previewStart = Math.max(0, clip.startTime - LEAD_S);
      const audioDelayMs = (clip.startTime - previewStart) * 1000;

      // ── Obtém áudio: usa blob pré-carregado ou baixa agora (com spinner) ──────────────
      let audio: HTMLAudioElement;

      if (preloadedAudioRef.current && preloadedAudioUrlRef.current === clip.audioUrl) {
        // Blob já está 100% em memória — nenhuma espera de rede
        audio = preloadedAudioRef.current;
        audio.currentTime = 0;
      } else {
        // Blob ainda não está pronto — baixa agora mostrando o spinner
        setIsPreviewLoading(true);
        preloadFetchAbortRef.current?.abort(); // cancela fetch de background
        const response = await fetch(clip.audioUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob   = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (preloadedBlobUrlRef.current) URL.revokeObjectURL(preloadedBlobUrlRef.current);
        preloadedBlobUrlRef.current  = blobUrl;
        audio = new Audio(blobUrl);
        preloadedAudioRef.current    = audio;
        preloadedAudioUrlRef.current = clip.audioUrl;
        setIsPreviewLoading(false);
      }

      // Aguarda canplaythrough (para blob URL é quase instantâneo — dados já estão em memória)
      if (audio.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        await new Promise<void>(resolve => {
          audio.addEventListener("canplaythrough", () => resolve(), { once: true });
          audio.addEventListener("error",          () => resolve(), { once: true }); // tenta mesmo assim
          audio.load();
        });
      }
      audio.currentTime = 0;

      previewAudioRef.current = audio;
      // Quando o áudio termina → para o vídeo também (fix: playhead ultrapassava o clip)
      audio.onended = () => {
        if (previewRafRef.current) { cancelAnimationFrame(previewRafRef.current); previewRafRef.current = null; }
        videoRef?.current?.pause();
        setIsPreviewing(false);
        onUnmuteVideo?.();
        previewAudioRef.current = null;
      };

      onMuteVideo?.();
      // Seek → aguarda seeked → play(): garante que o timer começa só quando o
      // vídeo está REALMENTE na posição previewStart (elimina seek latency do cálculo).
      onSeekToTime(previewStart);
      const vid = videoRef?.current;
      if (vid?.seeking) {
        await new Promise<void>(resolve =>
          vid.addEventListener("seeked", resolve as () => void, { once: true })
        );
      }
      onPlayVideo?.();
      setIsPreviewing(true);

      if (audioDelayMs > 0) {
        // rAF loop: mede tempo decorrido com performance.now() (±16ms)
        // em vez de timeupdate (±250ms) ou setTimeout (±20ms de drift).
        const t0 = performance.now();
        const scheduleAudio = (ts: number) => {
          const elapsed = ts - t0;
          if (elapsed < audioDelayMs) {
            previewRafRef.current = requestAnimationFrame(scheduleAudio);
            return;
          }
          previewRafRef.current = null;
          const overshoot = Math.max(0, (elapsed - audioDelayMs) / 1000);
          audio.currentTime = Math.min(overshoot, Math.max(0, (clip.duration ?? 0) - 0.01));
          audio.play().catch(() => { videoRef?.current?.pause(); setIsPreviewing(false); onUnmuteVideo?.(); });
        };
        previewRafRef.current = requestAnimationFrame(scheduleAudio);
      } else {
        await audio.play();
      }
    } catch { setIsPreviewing(false); setIsPreviewLoading(false); onUnmuteVideo?.(); }
  }, [isPreviewing, isPreviewLoading, daw.selectedClipId, clips, stopPreview, onMuteVideo, onUnmuteVideo, onSeekToTime, onPlayVideo]);

  // ── Helpers para identificar se uma faixa está gravando ─────────────────────
  const isTrackRecordingLocal = useCallback((track: DawTrack): boolean => {
    if (!isRecording || !recordingProfile) return false;
    const profId   = recordingProfile.voiceActorId;
    const profName = recordingProfile.voiceActorName;
    if (profId   && track.voiceActorId === profId)   return true;
    if (profName && track.label        === profName) return true;
    return false;
  }, [isRecording, recordingProfile]);

  const isTrackRecordingRemote = useCallback((track: DawTrack): boolean => {
    if (!remoteRecording) return false;
    if (remoteRecording.voiceActorId && track.voiceActorId === remoteRecording.voiceActorId) return true;
    if (remoteRecording.voiceActorName && track.label === remoteRecording.voiceActorName) return true;
    return false;
  }, [remoteRecording]);

  // ── Clip helpers ───────────────────────────────────────────────────────────────────
  const clipsForTrack = useCallback((track: DawTrack): DawClip[] => {
    const actorId   = track.voiceActorId;
    const actorName = track.label;
    // Compound match: both ID and name must agree (prevents cross-track bleed).
    // Falls back to name-only when either side lacks a real account ID.
    const matchesTrack = (c: { voiceActorId: string; voiceActorName: string }) => {
      if (actorId && c.voiceActorId) return c.voiceActorId === actorId && c.voiceActorName === actorName;
      return c.voiceActorName === actorName;
    };
    const result = clips.filter(matchesTrack);
    if (pendingClip && matchesTrack(pendingClip)) result.push(pendingClip);
    return result;
  }, [clips, pendingClip]);

  const handleClipSplit = useCallback((clipId: string, splitAt: number) => {
    if (clipId.startsWith("pending-")) return;
    onTakeSplit?.(clipId, splitAt);
  }, [onTakeSplit]);

  const handleTrimStart = useCallback((clipId: string, newStart: number, newDur: number) => {
    if (clipId.startsWith("pending-")) {
      onApprovalOffsetChange(newStart);
      return;
    }
    const origStart = approvedTakes.find(t => t.id === clipId)?.startTimeSeconds ?? 0;
    const trimmed   = newStart - origStart;
    onTakeTrim?.(clipId, trimmed, trimmed + newDur);
  }, [approvedTakes, onApprovalOffsetChange, onTakeTrim]);

  const handleTrimEnd = useCallback((clipId: string, newDur: number) => {
    if (clipId.startsWith("pending-")) {
      onApprovalTrim(0, newDur);
      return;
    }
    const take = approvedTakes.find(t => t.id === clipId);
    if (!take) return;
    onTakeTrim?.(clipId, 0, newDur);
  }, [approvedTakes, onApprovalTrim, onTakeTrim]);

  // ── Removedor de silêncio ───────────────────────────────────────────
  const handleRemoveSilence = useCallback(async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip?.audioUrl) return;
    setIsRemovingSilence(true);
    daw.setTool("pointer");
    try {
      const res     = await fetch(clip.audioUrl);
      const buf     = await res.arrayBuffer();
      const actx    = new AudioContext();
      const decoded = await actx.decodeAudioData(buf);
      await actx.close();
      const regions    = detectAudioRegions(decoded);
      const charPrefix  = clip.characterName ? `${clip.characterName}_` : "";
      onTakeSilenceRemove?.(clipId, regions.map(r => ({
        start: Math.max(0, clip.startTime + r.start),
        end:   Math.min(clip.startTime + clip.duration, clip.startTime + r.end),
        name:  `${charPrefix}${clip.voiceActorName}_${formatTimecode(clip.startTime + r.start)}`,
      })));
    } catch {
      // falha silenciosa
    }
    setIsRemovingSilence(false);
  }, [clips, onTakeSilenceRemove]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timeline collapse ──────────────────────────────────────────────
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  // ── Altura total ────────────────────────────────────────────────────
  const visibleTracks = Math.min(tracks.length, MAX_VIS_TRACKS);
  const totalH = timelineCollapsed ? TOOLBAR_H : TOOLBAR_H + RULER_H + visibleTracks * TRACK_H;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes dtl-pulse    { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes dtl-rec-dot  { 0%,100%{opacity:.35;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes dtl-clip-in  { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:none} }
        @keyframes dtl-pending  { 0%,100%{box-shadow:0 0 6px rgba(180,83,9,.3)} 50%{box-shadow:0 0 14px rgba(180,83,9,.55)} }
        @keyframes dtl-spin     { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        minHeight: "100%",
        display: "flex", flexDirection: "column",
        background: "#060810",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        userSelect: "none",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>

      {/* ── Tracks area (fixed height) ── */}
      <div style={{ height: totalH, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Toolbar ── */}
        <DawToolbar
          tool={daw.tool}
          onToolChange={daw.setTool}
          onZoomIn={daw.zoomIn}
          onZoomOut={daw.zoomOut}
          selectedClipId={daw.selectedClipId}
          onDeleteClip={() => {
            if (!daw.selectedClipId) return;
            onTakeDelete?.(daw.selectedClipId);
            daw.setSelectedClipId(null);
          }}
          isPreviewing={isPreviewing}
          isPreviewLoading={isPreviewLoading}
          onPreviewToggle={handlePreviewToggle}
          canPreview={!!daw.selectedClipId}
          showPreview={!!daw.selectedClipId && !isReviewMode}
          loopActive={!!daw.loopRegion}
          loopPhase={daw.loopPhase}
          onLoopClear={() => { daw.clearLoop(); onLoopChange?.(null); }}
          isProcessingSilence={isRemovingSilence}
          isReviewMode={isReviewMode}
          reviewTakeName={pendingApprovalTake?.voiceActorName}
          directorFeedback={directorFeedback}
          onFeedbackChange={onFeedbackChange}
          onApprove={() => onTakeDecision("approve", directorFeedback)}
          onReject={() => onTakeDecision("reject", directorFeedback)}
          onDirectorPreview={onDirectorPreview}
          isRecording={isRecording}
          timelineCollapsed={timelineCollapsed}
          onToggleTimeline={() => setTimelineCollapsed(c => !c)}
        />

        {/* ── Corpo (headers + ruler + clips) ── */}
        {!timelineCollapsed && <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Painel esquerdo: cabeçalhos de faixa ── */}
          <div
            ref={leftRef}
            style={{
              width: HEADER_W, flexShrink: 0,
              display: "flex", flexDirection: "column",
              overflowY: "hidden",
              background: "#080a12",
              borderRight: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {/* Canto superior esquerdo (alinha com a régua) */}
            <div style={{
              height: RULER_H, flexShrink: 0,
              background: "#060810",
              borderRight: "1px solid rgba(255,255,255,0.05)",
              borderBottom: "1px solid #1e2640",
              display: "flex", alignItems: "center", paddingLeft: 12,
            }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: "#1e2d44", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                FAIXAS
              </span>
            </div>

            {/* Cabeçalhos */}
            {tracks.map(track => (
              <div key={track.index} style={{ height: TRACK_H, flexShrink: 0 }}>
                <TrackHeader
                  index={track.index}
                  label={track.label}
                  character={track.character}
                  lineText={track.lineText}
                  isMuted={daw.mutedTracks.has(track.index)}
                  isSoloed={daw.soloedTracks.has(track.index)}
                  isArmed={daw.armedTracks.has(track.index)}
                  isRecording={isTrackRecordingLocal(track) || isTrackRecordingRemote(track)}
                  volume={daw.getVolume(track.index)}
                  onMute={() => daw.toggleMute(track.index)}
                  onSolo={() => daw.toggleSolo(track.index)}
                  onArm={() => daw.toggleArm(track.index)}
                  onVolumeChange={v => daw.setVolume(track.index, v)}
                  accentColor={getActorAccent(track.index)}
                />
              </div>
            ))}
          </div>

          {/* ── Painel direito: régua + clips (scroll) ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Régua de tempo */}
            <TimeRuler
              videoDuration={effectiveDur}
              videoTime={videoTime}
              zoom={daw.zoom}
              scrollLeft={scrollLeft}
              width={innerW}
              onSeek={onSeekToTime}
              videoRef={videoRef}
            />

            {/* Área de clips — scrollável H + V */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              style={{ flex: 1, overflowX: "auto", overflowY: "auto", cursor: daw.tool === "loop" ? "col-resize" : undefined }}
            >
              {/* Conteúdo interno com largura baseada no zoom */}
              <div style={{ width: innerW, position: "relative" }}>

                {/* ── Loop region overlay ── */}
                {daw.loopRegion && (
                  <div style={{
                    position: "absolute",
                    left: daw.loopRegion.start * daw.zoom,
                    width: Math.max(2, (daw.loopRegion.end - daw.loopRegion.start) * daw.zoom),
                    top: 0, height: tracks.length * TRACK_H,
                    background: "rgba(100,180,255,0.09)",
                    borderLeft: "2px solid rgba(100,180,255,0.65)",
                    borderRight: "2px solid rgba(100,180,255,0.65)",
                    pointerEvents: "none", zIndex: 4,
                  }} />
                )}
                {/* Loop first-click marker (aguardando 2º clique) */}
                {daw.tool === "loop" && daw.loopPhase === 1 && daw.loopPreviewStart !== null && (
                  <div style={{
                    position: "absolute",
                    left: daw.loopPreviewStart * daw.zoom,
                    top: 0, height: tracks.length * TRACK_H, width: 2,
                    background: "rgba(100,180,255,0.9)",
                    boxShadow: "0 0 6px rgba(100,180,255,0.6)",
                    pointerEvents: "none", zIndex: 5,
                  }} />
                )}

                {/* Playhead global — posicionado via RAF direto no DOM, 60fps */}
                <div
                  ref={playheadRef}
                  style={{
                    position: "absolute",
                    left: 0,
                    transform: `translateX(${Math.round(videoTime * daw.zoom - 1)}px)`,
                    willChange: "transform",
                    top: 0, width: 2,
                    height: tracks.length * TRACK_H,
                    background: "#ff3b30",
                    pointerEvents: "none",
                    zIndex: 10,
                    boxShadow: "0 0 10px rgba(255,59,48,0.7), 0 0 4px rgba(255,59,48,1)",
                  }}
                />

                {/* Linhas das faixas */}
                {tracks.map(track => {
                  const trackClips = clipsForTrack(track);
                  const isLocalRecordTrack  = isTrackRecordingLocal(track);
                  const isRemoteRecordTrack = isTrackRecordingRemote(track);
                  const isCurrentRecordTrack = isLocalRecordTrack || isRemoteRecordTrack;

                  return (
                    <div
                      key={track.index}
                      style={{
                        height: TRACK_H,
                        position: "relative",
                        borderBottom: "1px solid #1a2035",
                        background: isCurrentRecordTrack ? "#070e07" : "#0a0d16",
                        overflow: "hidden",
                      }}
                      onClick={(e) => {
                        const contentX = e.clientX - e.currentTarget.getBoundingClientRect().left;
                        const t = Math.max(0, Math.min(effectiveDur, contentX / daw.zoom));
                        // ── Loop: dois cliques definem a região ──
                        if (daw.tool === "loop") {
                          if (daw.loopPhase === 0) {
                            daw.setLoopPreviewStart(t);
                            daw.setLoopPhase(1);
                          } else {
                            const ls = Math.min(daw.loopPreviewStart ?? t, t);
                            const le = Math.max(daw.loopPreviewStart ?? t, t);
                            daw.setLoopRegion({ start: ls, end: le });
                            daw.setLoopPhase(0);
                            daw.setLoopPreviewStart(null);
                            daw.setTool("pointer");
                            onLoopChange?.({ start: ls, end: le });
                          }
                          return;
                        }
                        daw.setSelectedClipId(null);
                        onSeekToTime(t);
                      }}
                    >
                      {/* Grade de fundo */}
                      <GridBackground height={TRACK_H} zoom={daw.zoom} />

                      {/* Waveform de gravação ao vivo (local) */}
                      {isLocalRecordTrack && recordingStatus === "recording" && (
                        <div style={{
                          position: "absolute",
                          left: recordingStartTime * daw.zoom,
                          top: 2,
                          height: TRACK_H - 4,
                          width: Math.max(4, (videoTime - recordingStartTime) * daw.zoom),
                          borderRadius: 4,
                          background: "#0a1e0a",
                          border: "1.5px solid #10b981",
                          overflow: "hidden",
                          pointerEvents: "none",
                        }}>
                          <LiveWaveformCanvas peaksRef={liveRollingPeaksRef} height={TRACK_H - 4} colorScheme="green" />
                          {/* Badge REC */}
                          <div style={{ position: "absolute", top: 3, left: 4, fontSize: 8, color: "#10b981", fontWeight: 700, letterSpacing: "0.05em", animation: "dtl-pulse .9s ease-in-out infinite" }}>● REC</div>
                        </div>
                      )}

                      {/* Waveform congelada — visível após gravação até o clip pendente aparecer */}
                      {hasFrozenPeaks && !isReviewMode &&
       (frozenActorIdRef.current === track.voiceActorId ||
        frozenActorIdRef.current === track.label) && (
                        <div style={{
                          position: "absolute",
                          left: frozenStartTimeRef.current * daw.zoom,
                          top: 2,
                          height: TRACK_H - 4,
                          width: Math.max(4, frozenDurationRef.current * daw.zoom),
                          borderRadius: 4,
                          background: "#0a1e0a",
                          border: "1.5px dashed #10b981",
                          overflow: "hidden",
                          pointerEvents: "none",
                          opacity: 0.7,
                        }}>
                          <LiveWaveformCanvas peaksRef={frozenPeaksRef} height={TRACK_H - 4} colorScheme="green" />
                        </div>
                      )}

                      {/* Waveform de gravação remota (voice actor visto pelo diretor) */}
                      {isRemoteRecordTrack && !isLocalRecordTrack && remoteRecording && remoteRecording.peaks.length > 1 && (
                        <div style={{
                          position: "absolute",
                          left: remoteRecording.startTimeSeconds * daw.zoom,
                          top: 2,
                          height: TRACK_H - 4,
                          width: Math.max(4, (videoTime - remoteRecording.startTimeSeconds) * daw.zoom),
                          borderRadius: 4,
                          background: "#0a1a2e",
                          border: "1.5px solid #3b82f6",
                          overflow: "hidden",
                          pointerEvents: "none",
                        }}>
                          <LiveWaveformCanvas peaksRef={remoteRecordingPeaksRef} height={TRACK_H - 4} colorScheme="blue" />
                        </div>
                      )}

                      {/* Countdown indicator */}
                      {isLocalRecordTrack && recordingStatus === "countdown" && (
                        <div style={{
                          position: "absolute",
                          left: recordingStartTime * daw.zoom,
                          top: 2, height: TRACK_H - 4, width: 4,
                          borderRadius: 4,
                          background: "#FF3B30",
                          pointerEvents: "none",
                          animation: "dtl-pulse .4s ease-in-out infinite",
                        }} />
                      )}

                      {/* Clips de áudio */}
                      {trackClips.map(clip => (
                        <AudioClipMemo
                          key={clip.id}
                          id={clip.id}
                          startTime={clip.startTime}
                          duration={clip.duration}
                          zoom={daw.zoom}
                          voiceActorName={clip.voiceActorName}
                          status={clip.status}
                          peaks={daw.getPeaks(clip.id)}
                          isSelected={daw.selectedClipId === clip.id}
                          isCutMode={false}
                          isRemoveSilenceMode={daw.tool === "removeSilence"}
                          onRemoveSilence={handleRemoveSilence}
                          trackHeight={TRACK_H}
                          actorPalette={clip.status === "approved" ? getActorPalette(track.index) : undefined}
                          onSelect={daw.toggleSelectedClipId}
                          onSplit={handleClipSplit}
                          onTrimStart={handleTrimStart}
                          onTrimEnd={handleTrimEnd}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>}
      </div>{/* end tracks area */}

      {/* ── Takes panel ── */}
      {calculateEndLine && (
        <TakesPanel
          takesList={takesList}
          isDirectorOrPrivileged={isDirectorOrPrivileged}
          userId={userId}
          takeCacheBust={takeCacheBust}
          calculateEndLine={calculateEndLine}
          onDownload={take => onDownloadTake?.(take)}
          onDelete={takeId => onTakeDelete?.(takeId)}
          onSeekToTime={onSeekToTime}
          openTakeId={daw.selectedClipId}
          onTrimTake={onTakeTrim ? async (id, s, e) => {
            daw.evictPeaks(id);
            await onTakeTrim(id, s, e);
          } : undefined}
        />
      )}

      </div>
    </>
  );
}
