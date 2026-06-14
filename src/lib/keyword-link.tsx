import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildBlogPath, buildFlashcardPath, buildMcqPath, type Article, type FlashcardSet, type McqSet, type Story } from "@/lib/store";
import { slugify } from "@/lib/deep-link";
import { buildStoryPath, stripRichText } from "@/lib/seo";

type LinkEntry = { term: string; path: string; lower: string; target: string };

interface Ctx {
  entries: LinkEntry[];
  used: Set<string>;
  usedTargets: Set<string>;
  currentPath: string | null;
}
const KeywordLinkContext = createContext<Ctx | null>(null);

let cache: LinkEntry[] | null = null;
let cachePromise: Promise<LinkEntry[]> | null = null;
const HIGH_VALUE_TERMS = [
  "general pathology", "clinical pathology", "clinical techniques", "oncopathology", "oncology",
  "osteochondroma", "bone tumour", "bone tumor", "parasitology", "entomology", "bacteriology",
  "microbiology", "hematopathology", "neuropathology", "inflammation", "neoplasia", "necrosis",
  "thrombosis", "embolism", "granuloma", "tuberculosis", "malaria", "schistosomiasis",
  "university of nairobi", "uon", "kenyatta university", "moi university", "kabarak university", "aga khan",
];

async function loadEntries(): Promise<LinkEntry[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const [{ data: articles }, { data: flashcards }, { data: mcqs }, { data: stories }] = await Promise.all([
        supabase.from("articles").select("id,title,slug,meta_title,meta_description").eq("published", true).is("deleted_at", null).limit(1500),
        supabase.from("flashcard_sets").select("id,title,slug,meta_title,meta_description").eq("published", true).is("deleted_at", null).limit(1200),
        supabase.from("mcq_sets").select("id,title,slug,meta_title,meta_description").eq("published", true).is("deleted_at", null).limit(1200),
        supabase.from("stories").select("id,title,meta_title,meta_description").eq("published", true).limit(500),
      ]);
      const entries: LinkEntry[] = [];
      const seen = new Set<string>();
      const addTerm = (raw: string | undefined | null, path: string) => {
        const clean = cleanTerm(raw || "");
        if (!isUsefulTerm(clean)) return;
        const lower = clean.toLowerCase();
        const key = `${path}|${lower}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ term: clean, path, lower, target: slugify(clean) });
      };
      const addTitleVariants = (raw: string | undefined | null, path: string) => {
        const title = stripRichText(raw || "");
        addTerm(title, path);
        addTerm(title.replace(/\b(MCQs?|Quiz|Questions?|Answers?|Exam(?:ination)?|Study Notes?|Flashcards?)\b/gi, " "), path);
      };
      const addAliases = (title: string | undefined | null, desc: string | undefined | null, content: string | undefined | null, path: string) => {
        addTitleVariants(title, path);
        addTerm(desc, path);
        const withoutParen = (title || "").replace(/\([^)]{2,80}\)/g, " ");
        addTerm(withoutParen, path);
        (title || "").match(/\(([^)]{3,80})\)/g)?.forEach((m) => addTerm(m.slice(1, -1), path));
        (title || "").split(/[:–—-]/).forEach((part) => addTerm(part, path));
        extractDefinedTerms(content || "").forEach((term) => addTerm(term, path));
        HIGH_VALUE_TERMS.forEach((term) => {
          const haystack = `${title || ""} ${desc || ""} ${content || ""}`.toLowerCase();
          if (haystack.includes(term)) addTerm(term, path);
        });
      };
      (articles as Partial<Article>[] || []).forEach((a) => addAliases(a.meta_title || a.title, a.meta_description, null, buildBlogPath(a as Article)));
      (flashcards as Partial<FlashcardSet>[] || []).forEach((f) => addAliases(f.meta_title || f.title, f.meta_description, null, buildFlashcardPath(f as FlashcardSet)));
      (mcqs as Partial<McqSet>[] || []).forEach((m) => addAliases(m.meta_title || m.title, m.meta_description, null, buildMcqPath(m as McqSet)));
      (stories as Partial<Story>[] || []).forEach((s) => addAliases(s.meta_title || s.title, s.meta_description, null, buildStoryPath(s as Story)));
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

function cleanTerm(raw: string): string {
  return stripRichText(raw)
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\s]+/gu, "")
    .replace(/\b(year|unit|chapter|overview|introduction|definition|summary|clinical notes|study notes)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\-–—:;,.]+|[\-–—:;,.]+$/g, "");
}

function isUsefulTerm(term: string): boolean {
  if (term.length < 4 || term.length > 80) return false;
  if (!/[a-z]/i.test(term)) return false;
  if (/^\d+$/.test(term)) return false;
  if (term.split(/\s+/).length > 8) return false;
  const banned = /^(the|and|with|from|into|this|that|these|those|causes|features|management|treatment|diagnosis|classification)$/i;
  return !banned.test(term);
}

function extractDefinedTerms(content: string): string[] {
  const terms = new Set<string>();
  const text = String(content || "").slice(0, 90000);
  for (const match of text.matchAll(/^#{1,4}\s+(.+)$/gm)) terms.add(match[1]);
  for (const match of text.matchAll(/\*\*([^*:\n]{4,80})\*\*\s*:?/g)) terms.add(match[1]);
  for (const match of text.matchAll(/^([A-Z][A-Za-z][A-Za-z\s\-/()]{2,70}):\s+/gm)) terms.add(match[1]);
  return Array.from(terms);
}

export function KeywordLinkProvider({ currentPath, children }: { currentPath?: string; children: ReactNode }) {
  const [entries, setEntries] = useState<LinkEntry[]>(cache || []);
  useEffect(() => { loadEntries().then(setEntries); }, []);
  const ctx = useMemo<Ctx>(() => ({ entries, used: new Set<string>(), usedTargets: new Set<string>(), currentPath: currentPath || null }), [entries, currentPath]);
  return <KeywordLinkContext.Provider value={ctx}>{children}</KeywordLinkContext.Provider>;
}

/** Wrap a plain string with <Link> for the first occurrence of any known article title. */
export function linkifyText(text: string, ctx: Ctx | null, keyPrefix = "k"): ReactNode {
  if (!ctx || !ctx.entries.length || !text) return text;
  const { entries, used, usedTargets, currentPath } = ctx;
  const pool = entries.filter((e) => !used.has(e.lower) && e.path !== currentPath).slice(0, 5000);
  const out: ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (true) {
    const found = findBestMatch(rest, pool);
    if (!found) { out.push(rest); break; }
    const { entry, index, matched } = found;
    const before = rest.slice(0, index);
    if (!entry) { out.push(rest); break; }
    used.add(entry.lower);
    usedTargets.add(entry.path);
    if (before) out.push(<span key={`${keyPrefix}-b-${i}`}>{before}</span>);
    out.push(
      <Link
        key={`${keyPrefix}-l-${i}`}
        to={`${entry.path}#${entry.target || slugify(matched)}`}
        className="deep-link"
      >
        {matched}
      </Link>
    );
    rest = rest.slice(index + matched.length);
    i++;
    if (i > 40) { out.push(rest); break; }
  }
  return <>{out}</>;
}

function findBestMatch(text: string, pool: LinkEntry[]) {
  const lower = text.toLowerCase();
  let best: { entry: LinkEntry; index: number; matched: string } | null = null;
  for (const entry of pool) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(entry.lower, from);
      if (index < 0) break;
      const end = index + entry.term.length;
      const before = index === 0 ? "" : lower[index - 1];
      const after = end >= lower.length ? "" : lower[end];
      if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) {
        if (!best || index < best.index || (index === best.index && entry.term.length > best.entry.term.length)) {
          best = { entry, index, matched: text.slice(index, end) };
        }
        break;
      }
      from = index + 1;
    }
  }
  return best;
}

export function useKeywordLinks() {
  return useContext(KeywordLinkContext);
}
