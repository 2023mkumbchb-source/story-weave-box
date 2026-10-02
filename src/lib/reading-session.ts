export interface ReadingSession { fileId: string; name: string; path: string; savedAt: number }
const KEY = "ompath_reading_sessions";
const TTL = 30 * 24 * 3600 * 1000;

function all(): Record<string, ReadingSession> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveReadingSession(scope: string, s: Omit<ReadingSession, "savedAt">) {
  try { const a = all(); a[scope] = { ...s, savedAt: Date.now() }; localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
}
export function getReadingSession(scope: string): ReadingSession | null {
  const s = all()[scope];
  return s && Date.now() - s.savedAt < TTL ? s : null;
}
export function clearReadingSession(scope: string) {
  try { const a = all(); delete a[scope]; localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
}
