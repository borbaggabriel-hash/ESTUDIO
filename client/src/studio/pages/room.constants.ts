/**
 * Constants for the Studio Room component
 * Extracted from room.tsx for better maintainability
 */

// WebSocket reconnection settings
export const WS_INITIAL_RECONNECT_DELAY = 1000;
export const WS_MAX_RECONNECT_DELAY = 30000;
export const WS_RECONNECT_BACKOFF_MULTIPLIER = 1.5;

// Recording settings
export const MIN_RECORDING_DURATION_SECONDS = 0.1;
export const DEFAULT_COUNTDOWN_SECONDS = 3;
export const PREROLL_SECONDS = 3;

// Audio settings
export const AUDIO_NORMALIZATION_FACTOR = 1.5;
export const AUDIO_AVERAGE_DIVISOR = 128;

// Teleprompter scroll settings
export const SCROLL_TAU_PLAYING = 0.22;
export const SCROLL_TAU_PAUSED = 0.14;
export const SCROLL_USER_INTENT_TIMEOUT_MS = 160;

// Video seek settings
export const SEEK_STEP_SECONDS = 2;

// Default shortcuts
export const DEFAULT_SHORTCUTS = {
  playPause: "Space",
  record: "KeyR",
  stop: "KeyS",
  loop: "KeyL",
  back: "ArrowLeft",
  forward: "ArrowRight",
} as const;

export const SHORTCUT_LABELS: Record<keyof typeof DEFAULT_SHORTCUTS, string> = {
  playPause: "Reproduzir / Pausar",
  record: "Gravar",
  stop: "Parar",
  loop: "Alternar Loop",
  back: "Voltar 2s",
  forward: "Avancar 2s",
};

// UI settings
export const DAILY_PANEL_COLLAPSED_HEIGHT = 70;
export const DAILY_PANEL_MIN_EXPANDED_HEIGHT = 400;

// Director roles for permission checks
export const DIRECTOR_ROLES = ["diretor", "director"] as const;
export const PRIVILEGED_PLATFORM_ROLES = ["platform_owner", "diretor"] as const;
