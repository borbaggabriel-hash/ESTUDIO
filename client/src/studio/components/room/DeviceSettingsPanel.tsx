import { useState, useEffect, useRef } from "react";
import { X, Volume2 } from "lucide-react";
import { getAnalyserData, type MicrophoneState, type VoiceCaptureMode } from "@studio/lib/audio/microphoneManager";

export interface DeviceSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  inputGain: number;
  monitorVolume: number;
  voiceCaptureMode: VoiceCaptureMode;
  disableSystemProcessing?: boolean;
}

interface DeviceSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: DeviceSettings;
  onSettingsChange: (s: DeviceSettings) => void;
  micState: MicrophoneState | null;
}

export function DeviceSettingsPanel({
  open,
  onClose,
  settings,
  onSettingsChange,
  micState,
}: DeviceSettingsPanelProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;

    const refreshDevices = () => {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        setDevices(devs);
        const hasLabels = devs.some((d) => d.label.length > 0);
        setPermissionGranted(hasLabels);
      });
    };

    refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [open]);

  useEffect(() => {
    if (!open || !micState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getAnalyserData(micState);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      const norm = Math.min(1, (avg / 128) * 1.5); 

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width * norm;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#10b981");
      gradient.addColorStop(0.6, "#f59e0b");
      gradient.addColorStop(1, "#ef4444");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, canvas.height);

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, micState]);

  const requestPerms = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs);
      setPermissionGranted(true);
    } catch (e) {
      console.error(e);
    }
  };

  const playTestSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      
      // @ts-ignore
      if (typeof ctx.setSinkId === 'function' && settings.outputDeviceId) {
          // @ts-ignore
          ctx.setSinkId(settings.outputDeviceId).catch(console.error);
      }
    } catch (e) {
      console.error("Audio test failed", e);
    }
  };

  if (!open) return null;

  const mics = devices.filter((d) => d.kind === "audioinput");
  const speakers = devices.filter((d) => d.kind === "audiooutput");

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rounded-2xl w-[calc(100vw-32px)] max-w-[480px] overflow-hidden glass-panel shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <span className="text-sm font-semibold text-foreground">Configuracoes de Dispositivo</span>
          <button
            onClick={onClose}
            className="transition-colors text-muted-foreground hover:text-foreground"
            data-testid="button-close-device-settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {!permissionGranted && (
          <div className="px-6 py-4 bg-yellow-500/10 border-b border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-200 mb-2">Permissao de microfone necessaria para listar dispositivos.</p>
            <button onClick={requestPerms} className="vhub-btn-xs vhub-btn-secondary">Conceder Permissao</button>
          </div>
        )}

        <div className="px-6 py-5 flex flex-col gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="vhub-label block">Microfone</label>
              {settings.inputDeviceId && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ativo
                </span>
              )}
            </div>
            <select
              className="w-full h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
              value={settings.inputDeviceId}
              onChange={(e) => onSettingsChange({ ...settings, inputDeviceId: e.target.value })}
              data-testid="select-microphone"
            >
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            
            <div className="h-2 rounded-full overflow-hidden bg-muted border border-border relative">
              <canvas ref={canvasRef} width={430} height={8} className="w-full h-full block" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="vhub-label block">Alto-falante (Monitor)</label>
            <div className="flex gap-2">
              <select
                className="flex-1 h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
                value={settings.outputDeviceId}
                onChange={(e) => onSettingsChange({ ...settings, outputDeviceId: e.target.value })}
                data-testid="select-speaker"
              >
                {speakers.length === 0 ? (
                  <option value="">Padrao do sistema</option>
                ) : (
                  speakers.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Alto-falante ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))
                )}
              </select>
              <button 
                onClick={playTestSound}
                className="h-9 px-3 rounded-lg bg-muted hover:bg-muted/80 border border-border transition-colors"
                title="Testar som"
              >
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="vhub-label">Ganho (Input)</label>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(settings.inputGain * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={settings.inputGain}
                onChange={(e) =>
                  onSettingsChange({ ...settings, inputGain: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 accent-primary bg-muted rounded-full appearance-none cursor-pointer"
                data-testid="slider-input-gain"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="vhub-label">Volume (Output)</label>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(settings.monitorVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.monitorVolume}
                onChange={(e) =>
                  onSettingsChange({ ...settings, monitorVolume: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 accent-primary bg-muted rounded-full appearance-none cursor-pointer"
                data-testid="slider-monitor-volume"
              />
            </div>
          </div>

          <div>
            <label className="vhub-label mb-2 block">Modo de Captura</label>
            <select
              value={settings.voiceCaptureMode}
              onChange={(e) => onSettingsChange({ ...settings, voiceCaptureMode: e.target.value as VoiceCaptureMode })}
              className="w-full h-9 rounded-lg px-3 text-sm bg-muted/50 border border-border text-foreground focus:border-primary outline-none"
              data-testid="select-voice-capture-mode"
            >
              <option value="studio">Studio Mode (Processado)</option>
              <option value="original">Microfone Original</option>
              <option value="high-fidelity">High-End (Lossless 24-bit)</option>
            </select>
            <p className="text-[10px] mt-2 leading-relaxed text-muted-foreground">
              {settings.voiceCaptureMode === "studio"
                ? "Filtro passa-alta 80Hz + compressor + reducao de ruido. Ideal para ambientes ruidosos."
                : settings.voiceCaptureMode === "high-fidelity"
                ? "Captura RAW 24-bit via AudioWorklet. Desativa todo processamento do sistema. Requer interface de audio."
                : "Captura padrao do navegador sem efeitos adicionais."}
            </p>
          </div>

          {settings.voiceCaptureMode === "high-fidelity" && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 items-start">
              <div className="mt-0.5 w-2 h-2 shrink-0 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              <div>
                <p className="text-xs font-medium text-destructive">Controle Exclusivo de Hardware</p>
                <p className="text-[10px] text-destructive/70 leading-tight mt-0.5">
                  O sistema assumiu o controle do driver de audio para garantir 48kHz/24-bit com latencia zero.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="vhub-btn-sm vhub-btn-primary w-full sm:w-auto"
              data-testid="button-apply-device-settings"
            >
              Concluido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
