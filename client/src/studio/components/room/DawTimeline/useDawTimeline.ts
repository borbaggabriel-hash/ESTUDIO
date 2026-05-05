import { useState, useCallback, useRef } from "react";
import type { DawTool, Peak } from "./types";
import { computePeaks } from "./waveformUtils";

// Número de bins de pico por clip de áudio
const PEAK_BINS = 200;
export function useDawTimeline() {
  // Ferramenta ativa
  const [tool, setTool] = useState<DawTool>("pointer");

  // Zoom: pixels por segundo (padrão 80px/s)
  const [zoom, setZoom] = useState(80);

  // Faixas silenciadas / solos / armadas
  const [mutedTracks, setMutedTracks] = useState<Set<number>>(new Set());
  const [soloedTracks, setSoloedTracks] = useState<Set<number>>(new Set());
  const [armedTracks, setArmedTracks] = useState<Set<number>>(new Set());

  // Volume por faixa (0–1)
  const [volumes, setVolumes] = useState<Map<number, number>>(new Map());

  // ── Loop ────────────────────────────────────────────────────────────────
  const [loopRegion,      setLoopRegion]      = useState<{ start: number; end: number } | null>(null);
  const [loopPhase,       setLoopPhase]       = useState<0 | 1>(0);      // 0=aguardando início, 1=aguardando fim
  const [loopPreviewStart, setLoopPreviewStart] = useState<number | null>(null);

  const clearLoop = useCallback(() => {
    setLoopRegion(null);
    setLoopPhase(0);
    setLoopPreviewStart(null);
    setTool("pointer");
  }, []);

  // Clip selecionado
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const toggleSelectedClipId = useCallback((id: string) => {
    setSelectedClipId(prev => prev === id ? null : id);
  }, []);

  // Cache de picos de waveform por clipId
  const peakCacheRef    = useRef<Map<string, Peak[]>>(new Map());
  const peakLoadUrlRef  = useRef<Map<string, string>>(new Map()); // rastreia qual URL gerou os picos
  const [peakVersion, setPeakVersion] = useState(0); // trigger re-render quando picos carregam

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => setZoom(z => Math.min(400, Math.round(z * 1.5))), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(12, Math.round(z / 1.5))), []);

  // ── Mute ──────────────────────────────────────────────────────────────────
  const toggleMute = useCallback((idx: number) => {
    setMutedTracks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // ── Solo ──────────────────────────────────────────────────────────────────
  const toggleSolo = useCallback((idx: number) => {
    setSoloedTracks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // ── Arm ───────────────────────────────────────────────────────────────────
  const toggleArm = useCallback((idx: number) => {
    setArmedTracks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const setArmed = useCallback((idx: number, armed: boolean) => {
    setArmedTracks(prev => {
      const next = new Set(prev);
      if (armed) next.add(idx); else next.delete(idx);
      return next;
    });
  }, []);

  // ── Volume ────────────────────────────────────────────────────────────────
  const setVolume = useCallback((idx: number, v: number) => {
    setVolumes(prev => new Map(prev).set(idx, Math.max(0, Math.min(1, v))));
  }, []);

  const getVolume = useCallback((idx: number): number => {
    return volumes.get(idx) ?? 0.8;
  }, [volumes]);

  // ── Peaks ─────────────────────────────────────────────────────────────────
  const getPeaks = useCallback((clipId: string): Peak[] | undefined => {
    return peakCacheRef.current.get(clipId);
  }, [peakVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Semente os picos de um clip a partir de dados já disponíveis (ex: peaks ao vivo)
  const seedPeaks = useCallback((clipId: string, peaks: Peak[]): void => {
    if (!clipId || peaks.length === 0) return;
    peakCacheRef.current.set(clipId, peaks);
    setPeakVersion(v => v + 1);
  }, []);

  // Remove entrada do cache para forçar re-fetch (ex: após trim de take)
  const evictPeaks = useCallback((clipId: string): void => {
    peakCacheRef.current.delete(clipId);
    peakLoadUrlRef.current.delete(clipId); // invalida o token de URL
    setPeakVersion(v => v + 1);
  }, []);

  const loadPeaks = useCallback(async (clipId: string, audioUrl: string): Promise<void> => {
    if (!audioUrl) return;
    // Se já carregado com a mesma URL, pula
    if (peakCacheRef.current.has(clipId) && peakLoadUrlRef.current.get(clipId) === audioUrl) return;
    // Nova URL (ou eviction) — registra token e inicia carregamento
    peakLoadUrlRef.current.set(clipId, audioUrl);
    peakCacheRef.current.set(clipId, []); // marcador de carregamento
    try {
      const res     = await fetch(audioUrl);
      const buf     = await res.arrayBuffer();
      // ── Descarta se a URL foi trocada enquanto aguardava (race condition fix) ──
      if (peakLoadUrlRef.current.get(clipId) !== audioUrl) return;
      const actx    = new AudioContext();
      const decoded = await actx.decodeAudioData(buf);
      await actx.close();
      if (peakLoadUrlRef.current.get(clipId) !== audioUrl) return; // verifica novamente após decode
      const peaks = computePeaks(decoded.getChannelData(0), PEAK_BINS);
      peakCacheRef.current.set(clipId, peaks);
      setPeakVersion(v => v + 1);
    } catch {
      // Falha silenciosa; deixa o array vazio no cache
    }
  }, []);

  return {
    tool, setTool,
    zoom, zoomIn, zoomOut,
    mutedTracks, toggleMute,
    soloedTracks, toggleSolo,
    armedTracks, toggleArm, setArmed,
    volumes, setVolume, getVolume,
    selectedClipId, setSelectedClipId, toggleSelectedClipId,
    getPeaks, loadPeaks, seedPeaks, evictPeaks,
    peakVersion,
    loopRegion, setLoopRegion,
    loopPhase, setLoopPhase,
    loopPreviewStart, setLoopPreviewStart,
    clearLoop,
  };
}
