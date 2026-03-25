// utils/formatters.ts
// Consolidated time/duration formatting utilities.

/** Format seconds as M:SS (e.g., "2:45") */
export function formatSeconds(sec: number): string {
  const s = Math.max(0, sec || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/** Format seconds as HH:MM:SS or MM:SS (e.g., "01:23:45" or "23:45") */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  if (h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Format ISO timestamp as HH:MM (e.g., "14:30") */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format ISO timestamp as locale time string (e.g., "14:30:45") */
export function formatLocaleTime(ts: any): string {
  try {
    const d = new Date(ts || Date.now());
    return d.toLocaleTimeString();
  } catch {
    return new Date().toLocaleTimeString();
  }
}

/** Format relative time ago (e.g., "3m ago", "2h ago") */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
