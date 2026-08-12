import { supabase } from "@/integrations/supabase/client";
import type { ResourceType } from "./academic";

const db = supabase as unknown as { from: (t: string) => any };

export interface SearchHit {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  kind: ResourceType | "unit" | "topic";
  contentType: string;
  reason: string;
  updated_at?: string | null;
  exam_year?: string | null;
  href: string;
  score: number;
}

export interface SearchFilters {
  year?: string;
  unitId?: string;
  contentType?: string;
  examYear?: string;
  verifiedOnly?: boolean;
  recentOnly?: boolean;
  includeStories?: boolean;
}

let aliasCache: { at: number; rows: { canonical_term: string; alias: string }[] } | null = null;

async function getAliases() {
  if (aliasCache && Date.now() - aliasCache.at < 10 * 60 * 1000) return aliasCache.rows;
  const { data } = await db.from("search_aliases").select("canonical_term, alias").eq("approved", true);
  aliasCache = { at: Date.now(), rows: (data || []) as { canonical_term: string; alias: string }[] };
  return aliasCache.rows;
}

/** Expands a query with curated medical aliases + simple spelling variants. */
export async function expandQuery(query: string): Promise<{ terms: string[]; related: string[] }> {
  const q = query.trim().toLowerCase();
  if (!q) return { terms: [], related: [] };
  const rows = await getAliases();
  const terms = new Set<string>([q]);
  const related = new Set<string>();

  for (const row of rows) {
    const alias = row.alias.toLowerCase();
    const canonical = row.canonical_term.toLowerCase();
    if (q === alias || q.includes(` ${alias} `) || q.startsWith(`${alias} `) || q.endsWith(` ${alias}`)) {
      terms.add(canonical);
      related.add(row.canonical_term);
    }
    if (q === canonical) {
      terms.add(alias);
      related.add(row.alias);
    }
  }

  // British/American spelling variants both ways
  const variants: [RegExp, string][] = [
    [/haem/g, "hem"], [/hem(?!p)/g, "haem"], [/oedema/g, "edema"], [/edema/g, "oedema"],
    [/oesoph/g, "esoph"], [/esoph/g, "oesoph"], [/paediatr/g, "pediatr"], [/pediatr/g, "paediatr"],
    [/gynaecol/g, "gynecol"], [/gynecol/g, "gynaecol"], [/anaem/g, "anem"], [/anem/g, "anaem"],
    [/diarrhoea/g, "diarrhea"], [/diarrhea/g, "diarrhoea"],
  ];
  for (const [re, rep] of variants) {
    if (re.test(q)) terms.add(q.replace(re, rep));
  }
  // singular/plural
  if (q.endsWith("s")) terms.add(q.slice(0, -1));
  else terms.add(`${q}s`);

  return { terms: [...terms].filter(Boolean).slice(0, 8), related: [...related].slice(0, 6) };
}

function orIlike(cols: string[], terms: string[]) {
  return terms.flatMap((t) => cols.map((c) => `${c}.ilike.%${t.replace(/[,%]/g, " ")}%`)).join(",");
}

export async function globalSearch(query: string, filters: SearchFilters = {}): Promise<{ hits: SearchHit[]; related: string[] }> {
  const { terms, related } = await expandQuery(query);
  if (!terms.length) return { hits: [], related: [] };
  const primary = terms[0];

  const applyCommon = (q: any) => {
    let out = q.eq("published", true).is("deleted_at", null).limit(40);
    if (filters.year) out = out.ilike("category", `${filters.year}%`);
    if (filters.unitId) out = out.eq("unit_id", filters.unitId);
    if (filters.examYear) out = out.eq("exam_year", filters.examYear);
    if (filters.recentOnly) out = out.gte("updated_at", new Date(Date.now() - 60 * 86400000).toISOString());
    return out;
  };

  const articleQ = applyCommon(
    db.from("articles").select(
      "id, title, slug, category, content_type, exam_year, updated_at, meta_description, tags, verification_status, completeness_status, university, lecturer",
    ),
  ).or(orIlike(["title", "meta_description", "category", "unit", "university"], terms));

  const mcqQ = applyCommon(
    db.from("mcq_sets").select("id, title, slug, category, content_type, exam_year, updated_at"),
  ).or(orIlike(["title", "category"], terms));

  const flashQ = applyCommon(
    db.from("flashcard_sets").select("id, title, slug, category, content_type, updated_at"),
  ).or(orIlike(["title", "category"], terms));

  const unitQ = db
    .from("units")
    .select("id, name, slug, course_code, description, academic_year_id")
    .eq("published", true)
    .or(orIlike(["name", "course_code", "description"], terms))
    .limit(10);

  const topicQ = db
    .from("syllabus_topics")
    .select("id, title, unit_id, description")
    .eq("published", true)
    .or(orIlike(["title", "description"], terms))
    .limit(10);

  const storyQ = filters.includeStories
    ? db
        .from("stories")
        .select("id, title, slug, category, updated_at")
        .eq("published", true)
        .is("deleted_at", null)
        .or(orIlike(["title", "category"], terms))
        .limit(10)
    : Promise.resolve({ data: [] });

  const [articles, mcqs, flashcards, units, topics, stories] = await Promise.all([
    articleQ, mcqQ, flashQ, unitQ, topicQ, storyQ,
  ]);

  const yearsById = new Map<string, number>();
  const { data: yearRows } = await db.from("academic_years").select("id, year_number");
  for (const y of (yearRows || []) as { id: string; year_number: number }[]) yearsById.set(y.id, y.year_number);

  const hits: SearchHit[] = [];
  const reasonFor = (row: Record<string, unknown>) => {
    const title = String(row.title || row.name || "").toLowerCase();
    if (title.includes(primary)) return "Matched title";
    if (String(row.course_code || "").toLowerCase().includes(primary)) return `Course code: ${row.course_code}`;
    if (String(row.category || "").toLowerCase().includes(primary)) return "Matched unit";
    if (related.length) return `Related term: ${related[0]}`;
    return "Found in content";
  };

  for (const row of (articles.data || []) as any[]) {
    if (filters.verifiedOnly && row.verification_status !== "verified") continue;
    if (row.completeness_status === "incomplete") continue;
    const ct = row.content_type || "Notes";
    if (filters.contentType && filters.contentType !== ct) continue;
    hits.push({
      id: row.id, title: row.title, slug: row.slug, category: row.category, kind: "article",
      contentType: ct, reason: reasonFor(row), updated_at: row.updated_at, exam_year: row.exam_year,
      href: `/blog/${row.slug || row.id}`,
      score: String(row.title).toLowerCase().includes(primary) ? 100 : 60,
    });
  }
  for (const row of (mcqs.data || []) as any[]) {
    if (filters.contentType && filters.contentType !== "MCQ Bank") continue;
    hits.push({
      id: row.id, title: row.title, slug: row.slug, category: row.category, kind: "mcq",
      contentType: "MCQ Bank", reason: reasonFor(row), updated_at: row.updated_at,
      href: `/mcqs/${row.slug || row.id}`, score: 70,
    });
  }
  for (const row of (flashcards.data || []) as any[]) {
    if (filters.contentType && filters.contentType !== "Flashcards") continue;
    hits.push({
      id: row.id, title: row.title, slug: row.slug, category: row.category, kind: "flashcard",
      contentType: "Flashcards", reason: reasonFor(row), updated_at: row.updated_at,
      href: `/flashcards/${row.slug || row.id}`, score: 65,
    });
  }
  for (const row of (units.data || []) as any[]) {
    const yr = yearsById.get(row.academic_year_id);
    hits.push({
      id: row.id, title: row.name, slug: row.slug, category: yr ? `Year ${yr}` : "",
      kind: "unit", contentType: "Unit", reason: reasonFor(row),
      href: yr ? `/year/${yr}/unit/${row.slug}` : "/", score: 120,
    });
  }
  for (const row of (topics.data || []) as any[]) {
    hits.push({
      id: row.id, title: row.title, slug: null, category: "Syllabus topic", kind: "topic",
      contentType: "Syllabus Topic", reason: reasonFor(row), href: `/search?q=${encodeURIComponent(row.title)}`,
      score: 80,
    });
  }
  for (const row of (stories.data || []) as any[]) {
    hits.push({
      id: row.id, title: row.title, slug: row.slug, category: row.category || "Stories",
      kind: "story", contentType: "Clinical Story", reason: reasonFor(row),
      href: `/stories/${row.id}`, score: 30,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  void logSearch(query, hits.length);
  return { hits, related };
}

export async function logSearch(query: string, results: number, clicked?: { type: string; id: string }) {
  try {
    await db.from("search_queries").insert({
      query,
      normalized_query: query.trim().toLowerCase(),
      results_count: results,
      clicked_resource_type: clicked?.type ?? null,
      clicked_resource_id: clicked?.id ?? null,
    });
  } catch { /* analytics is best-effort */ }
}

export const SEARCH_GROUPS = [
  "Best Explanation",
  "Notes",
  "CAT",
  "Past Paper",
  "MCQ Bank",
  "Flashcards",
  "Timed Exam",
  "Unit",
  "Syllabus Topic",
  "Clinical Story",
] as const;

export function groupHits(hits: SearchHit[]): Record<string, SearchHit[]> {
  const groups: Record<string, SearchHit[]> = {};
  const best = hits.find((h) => h.kind === "article" && h.contentType === "Notes");
  for (const hit of hits) {
    if (best && hit === best) {
      groups["Best Explanation"] = [hit];
      continue;
    }
    const key = hit.contentType === "Revision Guide" || hit.contentType === "Course Outline" ? "Notes" : hit.contentType;
    (groups[key] ||= []).push(hit);
  }
  return groups;
}
