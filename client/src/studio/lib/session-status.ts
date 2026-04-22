export type SessionStatus = "scheduled" | "in_progress" | "completed";

export function computeSessionStatus(
  scheduledAt: string | Date,
  durationMinutes: number = 60
): SessionStatus {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end = start + durationMinutes * 60 * 1000;
  if (now < start) return "scheduled";
  if (now < end) return "in_progress";
  return "completed";
}

export function isSessionVisibleOnDashboard(
  scheduledAt: string | Date,
  durationMinutes: number = 60
): boolean {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const windowEnd = start + 3 * 60 * 60 * 1000;
  return now < windowEnd;
}

export function sessionEntryAllowed(
  scheduledAt: string | Date,
  bufferMinutes: number = 5
): boolean {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  return now >= start - bufferMinutes * 60 * 1000;
}

export function formatCountdownTime(scheduledAt: string | Date, bufferMinutes: number = 5): string {
  const target = new Date(scheduledAt).getTime() - bufferMinutes * 60 * 1000;
  const diff = Math.max(0, target - Date.now());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}
