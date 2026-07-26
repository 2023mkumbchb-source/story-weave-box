import { useEffect, useState } from "react";

/**
 * Topic-aware thumbnail resolver.
 * Extracts the most distinctive medical noun from a title/category and fetches
 * a free Wikipedia page lead image (no API key). Cached in localStorage.
 */

const CACHE_KEY = "ompath_topic_thumb_cache_v1";
const NEG_TTL = 1000 * 60 * 60 * 24 * 7; // 7d for misses

type CacheEntry = { url: string | null; ts: number };
type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeCache(c: Cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ }
}

const STOP = new Set([
  "year","unit","mcq","mcqs","study","notes","pathology","physiology","anatomy",
  "introduction","intro","basic","advanced","clinical","review","quiz","exam",
  "system","disease","diseases","disorder","disorders","management","overview",
  "the","and","of","in","to","for","with","from","an","a","on","by","at",
  "part","chapter","section","types","risks","causes","symptoms","treatment",
  "diagnosis","explained","guide","practice","questions","question","set","sets",
]);

/** Extract the dominant medical keyword(s) from a title. */
export function extractTopicKeyword(title: string, category?: string): string | null {
  const cleaned = (title || "")
    .replace(/[:•·\-—–|()[\]"']+/g, " ")
    .replace(/&/g, " and ")
    .toLowerCase();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const meaningful = tokens.filter(t => t.length > 3 && !STOP.has(t) && !/^\d+$/.test(t));
  if (meaningful.length === 0) {
    // fall back to category
    const c = (category || "").replace(/^year\s*\d+\s*[:\-]?\s*/i, "").trim();
    return c || null;
  }
  // Prefer first 2 meaningful words for better Wikipedia hit
  return meaningful.slice(0, 2).join(" ");
}

/** Query Wikipedia REST API for a page summary thumbnail. */
async function fetchWikipediaThumb(keyword: string): Promise<string | null> {
  // Try OpenSearch to resolve to a real page first
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=1&search=${encodeURIComponent(keyword)}`;
    const sr = await fetch(searchUrl);
    if (!sr.ok) return null;
    const sj = await sr.json();
    const pageTitle: string | undefined = sj?.[1]?.[0];
    if (!pageTitle) return null;
    const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/\s+/g, "_"))}`;
    const r = await fetch(sumUrl);
    if (!r.ok) return null;
    const j = await r.json();
    const url = j?.thumbnail?.source || j?.originalimage?.source || null;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

export async function getTopicThumbnail(title: string, category?: string, preferredKeyword?: string | null): Promise<string | null> {
  // A clean, specific subunit name (e.g. "Bone and Soft Tissue Pathology") is a far more
  // reliable Wikipedia search key than words parsed out of a noisy exam-question title.
  const keyword = (preferredKeyword && preferredKeyword.trim()) || extractTopicKeyword(title, category);
  if (!keyword) return null;
  const cache = readCache();
  const hit = cache[keyword];
  if (hit && (hit.url || Date.now() - hit.ts < NEG_TTL)) return hit.url;
  const url = await fetchWikipediaThumb(keyword);
  cache[keyword] = { url, ts: Date.now() };
  writeCache(cache);
  return url;
}

/** React hook: returns the resolved topic thumbnail or null while loading. */
export function useTopicThumbnail(title: string, category?: string, enabled = true, preferredKeyword?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(() => {
    const k = (preferredKeyword && preferredKeyword.trim()) || extractTopicKeyword(title, category);
    if (!k) return null;
    const cache = readCache();
    return cache[k]?.url ?? null;
  });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getTopicThumbnail(title, category, preferredKeyword).then(u => { if (!cancelled && u) setSrc(u); });
    return () => { cancelled = true; };
  }, [title, category, enabled, preferredKeyword]);
  return src;
}