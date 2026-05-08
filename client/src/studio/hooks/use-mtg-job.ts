import { useEffect, useRef, useState } from "react";

export type MtgStatus =
  | "idle"
  | "uploading"
  | "iniciando_demucs"
  | "processando"
  | "aguardando_takes"
  | "concluido"
  | "erro";

export interface MtgJobState {
  status: MtgStatus;
  etapa: string;
  percentual: number;
  mensagem: string;
  combosResults: { label: string; output_file?: string; download_url?: string; error?: string }[];
  error: string | null;
}

const INITIAL_STATE: MtgJobState = {
  status: "idle",
  etapa: "",
  percentual: 0,
  mensagem: "",
  combosResults: [],
  error: null,
};

const POLL_INTERVAL_MS = 3000;

export function useMtgJob() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [state, setState] = useState<MtgJobState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/mtg/job/${jobId}/status`, { credentials: "include" });
        if (!res.ok) {
          setState(s => ({ ...s, status: "erro", error: `HTTP ${res.status}` }));
          stopPolling();
          return;
        }
        const data = await res.json();
        setState({
          status: data.status as MtgStatus,
          etapa: data.etapa || "",
          percentual: data.percentual ?? 0,
          mensagem: data.mensagem || "",
          combosResults: data.combos_results || [],
          error: data.error || null,
        });

        if (data.status === "concluido" || data.status === "erro") {
          stopPolling();
        }
      } catch (err) {
        setState(s => ({ ...s, status: "erro", error: "MTG-STUDIO inacessível" }));
        stopPolling();
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [jobId]);

  const startFinalize = async (sessionId: string): Promise<void> => {
    setState({ ...INITIAL_STATE, status: "uploading", mensagem: "Enviando takes para pós-produção..." });
    setJobId(null);
    stopPolling();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/finalize`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao finalizar sessão");
      setState(s => ({ ...s, mensagem: data.message, percentual: 5 }));
      setJobId(data.jobId);
    } catch (err: any) {
      setState({ ...INITIAL_STATE, status: "erro", error: err?.message || "Erro desconhecido" });
    }
  };

  const reset = () => {
    stopPolling();
    setJobId(null);
    setState(INITIAL_STATE);
  };

  const isActive = state.status !== "idle" && state.status !== "concluido" && state.status !== "erro";
  const isDone = state.status === "concluido";
  const isError = state.status === "erro";

  return { state, jobId, startFinalize, reset, isActive, isDone, isError };
}
