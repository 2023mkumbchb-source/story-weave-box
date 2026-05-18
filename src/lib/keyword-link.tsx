import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getPublishedArticleSummaries, buildBlogPath, type Article } from "@/lib/store";

type LinkEntry = { term: string; path: string; lower: string };

interface Ctx {
  entries: LinkEntry[];
  used: Set<string>;
  currentPath: string | null;
}
const KeywordLinkContext = createContext<Ctx | null>(null);

let cache: LinkEntry[] | null = null;
let cachePromise: Promise<LinkEntry[]> | null = null;

async function loadEntries(): Promise<LinkEntry[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const arts = await getPublishedArticleSummaries();
      const entries: LinkEntry[] = [];
      for (const a of arts as Article[]) {
        const t = (a.title || "").trim();
        if (!t || t.length < 4) continue;
        // strip leading emoji + trailing parentheticals
        const clean = t.replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\s]+/gu, "").replace(/\s*\([^)]+\)\s*$/, "").trim();
        if (!clean || clean.length < 4) continue;
        entries.push({ term: clean, path: buildBlogPath(a), lower: clean.toLowerCase() });
      }
      // longer terms first so they match before shorter substrings
      entries.sort((a, b) => b.term.length - a.term.length);
      cache = entries;
      return entries;
    } catch {
      return [];
    }
  })();
  return cachePromise;
}

export function KeywordLinkProvider({ currentPath, children }: { currentPath?: string; children: ReactNode }) {
  const [entries, setEntries] = useState<LinkEntry[]>(cache || []);
  useEffect(() => { loadEntries().then(setEntries); }, []);
  const ctx = useMemo<Ctx>(() => ({ entries, used: new Set<string>(), currentPath: currentPath || null }), [entries, currentPath]);
  return <KeywordLinkContext.Provider value={ctx}>{children}</KeywordLinkContext.Provider>;
}

/** Wrap a plain string with <Link> for the first occurrence of any known article title. */
export function linkifyText(text: string, ctx: Ctx | null, keyPrefix = "k"): ReactNode {
  if (!ctx || !ctx.entries.length || !text) return text;
  const { entries, used, currentPath } = ctx;
  // Build single regex of unused terms (cap to first 60 for perf)
  const pool = entries.filter((e) => !used.has(e.lower) && e.path !== currentPath).slice(0, 80);
  if (!pool.length) return text;
  const escaped = pool.map((e) => e.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
  const out: ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (true) {
    const m = rest.match(re);
    if (!m || m.index == null) { out.push(rest); break; }
    const before = rest.slice(0, m.index);
    const matched = m[0];
    const entry = pool.find((e) => e.lower === matched.toLowerCase());
    if (!entry) { out.push(rest); break; }
    used.add(entry.lower);
    if (before) out.push(<span key={`${keyPrefix}-b-${i}`}>{before}</span>);
    out.push(
      <Link
        key={`${keyPrefix}-l-${i}`}
        to={entry.path}
        className="text-primary underline decoration-primary/40 decoration-1 underline-offset-2 transition-colors hover:decoration-primary hover:text-primary"
      >
        {matched}
      </Link>
    );
    rest = rest.slice(m.index + matched.length);
    i++;
    if (i > 40) { out.push(rest); break; }
  }
  return <>{out}</>;
}

export function useKeywordLinks() {
  return useContext(KeywordLinkContext);
}
