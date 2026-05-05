// Tipos compartilhados do componente DAW Timeline

export type Peak = { min: number; max: number };
export type DawTool = "pointer" | "removeSilence" | "loop";

// Linha do roteiro (espelho do tipo em room.tsx)
export interface ScriptLine {
  character: string;
  start: number;
  text: string;
  end?: number;
}

// Perfil de dublador — uma faixa é criada para cada perfil distinto
export interface VoiceActorProfile {
  voiceActorId: string;
  voiceActorName: string;
  characterName: string;
}

// Take aprovado
export interface ApprovedTake {
  id: string;
  audioUrl: string;
  startTimeSeconds: number;
  durationSeconds: number;
  voiceActorName: string;
  voiceActorId?: string;
  lineIndex?: number;
  characterName?: string;
}

// Take pendente de revisão
export interface PendingReviewTake {
  takeId: string;
  audioUrl: string;
  startTimeSeconds: number;
  durationSeconds: number;
  lineIndex: number;
  characterName: string;
  voiceActorName: string;
  voiceActorId: string;
}

// Clip posicionado em uma faixa
export interface DawClip {
  id: string;
  voiceActorId: string;
  lineIndex: number;
  startTime: number;
  duration: number;
  audioUrl: string;
  voiceActorName: string;
  characterName: string;
  status: "approved" | "pending" | "recording";
}

// Dados de uma faixa (track)
// index: -1 = master; 0..N = faixas por dublador
export interface DawTrack {
  index: number;
  label: string;
  character: string;
  voiceActorId: string;
  lineText?: string;
}
