import { useCallback, useEffect, useState } from "react";

// Course-outline progress is saved per signed-in user (keyed by user id) in this browser.
const key = (userId: string) => `ompath:course-outline:v1:${userId}`;

function read(userId: string | null): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = window.localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return new Set<string>(Array.isArray(parsed?.done) ? parsed.done : []);
  } catch {
    return new Set();
  }
}

export function useOutlineProgress(userId: string | null) {
  const [done, setDone] = useState<Set<string>>(() => read(userId));
  useEffect(() => { setDone(read(userId)); }, [userId]);

  const commit = useCallback((next: Set<string>) => {
    setDone(next);
    if (!userId) return;
    try { window.localStorage.setItem(key(userId), JSON.stringify({ done: [...next], updated: new Date().toISOString() })); } catch { /* storage unavailable */ }
  }, [userId]);

  const toggle = useCallback((id: string) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id); else next.add(id);
    commit(next);
  }, [done, commit]);

  const setMany = useCallback((ids: string[], value: boolean) => {
    const next = new Set(done);
    for (const id of ids) { if (value) next.add(id); else next.delete(id); }
    commit(next);
  }, [done, commit]);

  return { done, toggle, setMany };
}
