import { supabase } from "@/integrations/supabase/client";
import { extractFirstImageFromContent, stripRichText, autoIndexUrls, SITE_URL } from "@/lib/seo";

export interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
  published: boolean;
  original_notes: string;
  category: string;
  is_raw?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
  countdown?: any;
  html_embed?: any;
  password_protected?: boolean;
  access_password?: string;
  scheduled_at?: string | null;
  tags?: string[];
  featured_image?: string;
  reading_time_minutes?: number;
  toc_enabled?: boolean;
  comments_enabled?: boolean;
  university?: string;
  school?: string;
  lecturer?: string;
  exam_type?: string;
  exam_year?: string;
  unit?: string;
  content_kind?: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  cards: { question: string; answer: string }[];
  created_at: string;
  updated_at?: string;
  published: boolean;
  original_notes: string;
  category: string;
  is_raw?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
}

export interface McqSet {
  id: string;
  title: string;
  questions: { question: string; options?: string[]; correct_answer?: number; explanation?: string; type?: "mcq" | "saq" | "essay"; answer?: string; model_answer?: string; marks?: number }[];
  created_at: string;
  updated_at?: string;
  published: boolean;
  original_notes: string;
  category: string;
  access_password: string;
  is_raw?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
  description?: string;
  countdown?: any;
  html_embed?: any;
  password_protected?: boolean;
  scheduled_at?: string | null;
  tags?: string[];
  featured_image?: string;
  reading_time_minutes?: number;
  toc_enabled?: boolean;
  comments_enabled?: boolean;
  university?: string;
  school?: string;
  lecturer?: string;
  exam_type?: string;
  exam_year?: string;
  unit?: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  created_at: string;
  cover_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
}

export interface Essay {
  id: string;
  title: string;
  category: string;
  short_answer_questions: any[];
  long_answer_questions: any[];
  published: boolean;
  created_at: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
}

const ADMIN_PASSWORD = "Davis";

export function authenticate(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Rebalance MCQ correct-answer letters so no two adjacent MCQs share the
 * same correct letter. Also reshuffles the options array so that the correct
 * answer is moved to the chosen target index. Non-MCQ items (SAQ/essay) and
 * malformed entries are passed through untouched.
 */
export function rebalanceMcqAnswerLetters<T extends { question?: string; options?: string[]; correct_answer?: number; type?: string }>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  const out: T[] = items.map((q) => ({ ...q }));
  let prevLetter: number | null = null;
  let prevPrevLetter: number | null = null;

  for (let i = 0; i < out.length; i++) {
    const q: any = out[i];
    const isMcq = Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct_answer === "number";
    if (!isMcq) continue;

    const optCount = q.options.length;
    const currentCorrectText = q.options[q.correct_answer];
    if (currentCorrectText === undefined) continue;

    let target = q.correct_answer;
    const isBad = (idx: number) =>
      idx === prevLetter || (prevLetter !== null && prevPrevLetter === prevLetter && idx === prevLetter);

    if (isBad(target)) {
      const candidates: number[] = [];
      for (let k = 0; k < optCount; k++) {
        if (!isBad(k)) candidates.push(k);
      }
      if (candidates.length > 0) {
        target = candidates[(i + (q.question?.length || 0)) % candidates.length];
      }
    }

    if (target !== q.correct_answer) {
      const opts = [...q.options];
      const temp = opts[target];
      opts[target] = opts[q.correct_answer];
      opts[q.correct_answer] = temp;
      q.options = opts;
      q.correct_answer = target;
    }

    prevPrevLetter = prevLetter;
    prevLetter = q.correct_answer;
  }

  return out;
}

function cleanMcqOptionText(value: string): string {
  let out = String(value || "")
    .replace(/&amp;nbsp;|&nbsp;|\u00A0/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\*+/g, "")
    .replace(/^\s*(?:option\s*)?[A-F][.)]\s*/i, "")
    .replace(/\s*(?:Answer|Correct\s*answer)\s*[:：]\s*[A-F]?.*$/i, "")
    .replace(/\s*(?:Explanation|Rationale)\s*[:：].*$/i, "")
    .replace(/\s+—\s+related\s+(?:option|finding)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length > 150) {
    const concise = out.split(/\b(?:because|which|therefore|hence|as it|due to)\b/i)[0]?.trim();
    if (concise && concise.length >= 8) out = concise;
  }
  return out.slice(0, 170).replace(/[\s,;:-]+$/, "");
}

function splitCombinedOptions(options: string[], questionText = ""): string[] {
  const joined = `${questionText || ""} ${(options || []).join(" ")}`.replace(/\s+/g, " ").trim();
  if (!joined) return [];
  const firstA = joined.search(/(?:^|\s)A\s*[.)]\s*/i);
  const source = firstA >= 0 ? joined.slice(firstA) : joined;
  const matches = Array.from(source.matchAll(/(?:^|\s)([A-F])\s*[.)]\s*([\s\S]*?)(?=\s*[B-F]\s*[.)]\s*|\s*(?:Answer|Correct\s*answer|Explanation)\s*[:：]|$)/gi));
  if (matches.length >= 2) return matches.map((m) => cleanMcqOptionText(String(m[2] || ""))).filter(Boolean);
  return options.map((o) => cleanMcqOptionText(o)).filter(Boolean);
}

function balanceOptionLengths(options: string[], _correctAnswer: number): string[] {
  const clean = options.map(cleanMcqOptionText).filter(Boolean).slice(0, 5);
  const seen = new Set<string>();
  return clean.filter((opt) => {
    const key = opt.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeMcqQuestions<T extends { question?: string; options?: string[]; correct_answer?: number; explanation?: string; type?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const normalized = items.map((item) => {
    const q: any = { ...item };
    if (!Array.isArray(q.options)) return q;
    let correct = typeof q.correct_answer === "number" ? q.correct_answer : 0;
    const rawAll = `${q.question || ""} ${q.options.join(" ")} ${q.explanation || ""}`;
    const answerMarker = rawAll.match(/(?:Answer|Correct\s*answer)\s*[:：]\s*([A-F])/i)?.[1]?.toUpperCase();
    const split = splitCombinedOptions(q.options, q.question || "");
    if (answerMarker) {
      correct = Math.max(0, answerMarker.charCodeAt(0) - 65);
    } else if (q.options.length === 1 && split.length > 1) {
      const marker = String(q.options[0]).match(/(?:^|\s)([A-F])[.)]\s*/i)?.[1]?.toUpperCase();
      if (marker) correct = Math.max(0, marker.charCodeAt(0) - 65);
    }
    const firstOptionInQuestion = String(q.question || "").search(/\sA\s*[.)]\s*/i);
    if (firstOptionInQuestion > 6 && split.length >= 2) q.question = String(q.question).slice(0, firstOptionInQuestion).trim();
    q.question = String(q.question || "").replace(/\*+/g, "").replace(/\s*Choices:\s*$/i, "").replace(/\s+/g, " ").trim();
    const options = balanceOptionLengths(split, Math.min(Math.max(correct, 0), Math.max(0, split.length - 1)));
    q.options = options;
    q.correct_answer = Math.min(Math.max(correct, 0), Math.max(0, options.length - 1));
    return q;
  });
  return rebalanceMcqAnswerLetters(normalized as any[]) as T[];
}

function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  return (tags || []).map((t) => String(t).trim()).filter((t) => {
    const key = t.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function autoTagsFromText(parts: Array<string | undefined>, existing?: string[]): string[] {
  const hay = parts.filter(Boolean).join("\n");
  const tags = [...(existing || [])];
  const add = (tag: string) => {
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  };
  add("mku");
  add("Mount Kenya University");
  if (/pathology|histopath|lesion|inflammation|neoplas/i.test(hay)) add("pathology");
  if (/pharmacology|drug|receptor|dose/i.test(hay)) add("pharmacology");
  if (/microbiology|bacter|virus|fung/i.test(hay)) add("microbiology");
  if (/anatomy|embryology|histology/i.test(hay)) add("anatomy");
  if (/physiology|cardio|respiratory|renal|endocrine/i.test(hay)) add("physiology");
  const year = hay.match(/\bYear\s*([1-6])\b/i)?.[1];
  if (year) add(`Year ${year}`);
  const category = parts[1]?.replace(/^Year\s*\d+\s*:\s*/i, "").trim();
  if (category && category !== "Uncategorized") add(category);
  return normalizeTags(tags);
}

// Medical unit categories organized by year (based on actual timetable)
export const YEAR_CATEGORIES: Record<string, string[]> = {
  "Year 1": [
    "Carbohydrate Metabolism and Bioenergetics",
    "Lipid Metabolism",
    "Nitrogen Metabolism",
    "Respiratory Physiology",
    "Neurophysiology I",
    "Gross Anatomy Head and Neck",
    "Histology Head and Neck",
    "Embryology",
    "Behavioural Sciences and Ethics",
    "Anatomy",
    "Cardiovascular Physiology",
  ],
  "Year 2": [
    "Neurochemistry",
    "Biochemistry of Microorganisms",
    "Gross Anatomy of Pelvis and Perineum",
    "Histology of Pelvis and Perineum",
    "Dissection of Pelvis and Perineum",
    "Embryology II",
    "Complement and Immunoglobulin",
    "Neurophysiology II",
    "Physiology",
    "Parasitology",
    "Microbiology",
    "Epidemiology and Statistics",
    "Clinical Biochemistry",
  ],
  "Year 3": [
    "Basic Pharmacology II",
    "Blood Transfusion",
    "Medical Virology",
    "Medical Mycology",
    "Introduction to Clinical Techniques",
    "Junior Clerkship/Practicals in General Pathology I",
    "Neuropathology",
    "Bone and Soft Tissue Pathology",
    "Breast Pathology",
    "Male Reproductive and Urinary System Pathology",
    "General Pathology",
    "Hematopathology",
    "Gastrointestinal Pathology",
    "Cardiovascular System Pathology",
    "Respiratory System Pathology",
    "Female Reproductive System Pathology",
    "Endocrine and Metabolic Pathology",
  ],
  "Year 4": [
    "Obstetrics and Gynaecology",
    "General Surgery",
    "Mental Health/Psychiatry",
    "Internal Medicine",
    "Pediatrics and Child Health",
    "Clinical Pharmacology II",
  ],
  "Year 5": [
    "Dermatology",
    "Health Informatics and Electronics",
    "Dental Health",
    "Orthopedics and Trauma",
    "Ophthalmology",
    "ENT",
    "Radiology and Imaging",
    "Anaesthesiology and Critical Care",
    "Public Health",
  ],
  "Year 6": [
    "Senior Clerkship in Pediatrics and Child Health",
    "Senior Clerkship in Reproductive Health",
    "Senior Clerkship in Internal Medicine",
    "Senior Clerkship in Mental Health",
    "Senior Clerkship in General Surgery",
    "Therapeutics",
    "Oncology and Palliative Care",
  ],
};

export const UNIT_CATEGORIES = Object.entries(YEAR_CATEGORIES).flatMap(([year, units]) =>
  units.map(u => `${year}: ${u}`)
);

export function getYearFromCategory(category: string): string | null {
  if (!category) return null;
  const match = category.match(/Year\s+(\d)/);
  return match ? `Year ${match[1]}` : null;
}

export function getYearNumber(category: string): number {
  const match = category.match(/Year\s+(\d)/);
  return match ? parseInt(match[1]) : 0;
}

export function getCategoryDisplayName(category: string): string {
  if (!category || category === "Uncategorized") return category;
  const parts = category.split(":");
  return parts.length > 1 ? parts[1].trim() : category;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractArticleIdFromParam(value: string): string | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (UUID_REGEX.test(normalized)) return normalized;
  const match = normalized.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

export function slugifyTitle(title: string): string {
  return String(title ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanPublicSlug(rawSlug: string, fallbackTitle: string, fallback = "study"): string {
  const base = (rawSlug || slugifyTitle(fallbackTitle) || fallback).trim().toLowerCase();
  return base
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "")
    .replace(/-[0-9a-f]{6}$/i, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

/**
 * Guarantees the slug a new/edited record will publish under doesn't collide
 * with another record's public URL (buildBlogPath/buildMcqPath/etc. all strip
 * UUID prefixes and hex suffixes down to this same "clean" form, so two
 * different titles that slugify the same, or two edits of the same title,
 * would otherwise both resolve to one URL and only one record would ever be
 * reachable — this is what caused the Google "duplicate canonical" issues).
 * Appends -2, -3, ... until the clean form is unique among published rows.
 */
export async function ensureUniqueSlug(
  table: "articles" | "mcq_sets" | "flashcard_sets" | "stories",
  candidateSlug: string,
  title: string,
  fallback: string,
  excludeId?: string,
): Promise<string> {
  const clean = cleanPublicSlug(candidateSlug, title, fallback);
  const { data, error } = await supabase
    .from(table)
    .select("id, slug, title")
    .eq("published", true);
  if (error || !data) return candidateSlug || clean;

  const taken = new Set(
    data
      .filter((r: any) => r.id !== excludeId)
      .map((r: any) => cleanPublicSlug(r.slug || "", r.title || "", fallback)),
  );
  if (!taken.has(clean)) return candidateSlug || clean;

  let i = 2;
  while (taken.has(`${clean}-${i}`)) i++;
  return `${clean}-${i}`;
}

export function buildBlogPath(article: Pick<Article, "id" | "title"> & { slug?: string }): string {
  return `/blog/${cleanPublicSlug(article.slug || "", article.title, "article")}`;
}

export function buildMcqPath(set: { id: string; title: string; slug?: string | null }): string {
  const rawSlug = typeof set.slug === "string" ? set.slug.trim() : "";
  return `/mcqs/${cleanPublicSlug(rawSlug, set.title, "quiz")}`;
}

export function buildFlashcardPath(set: { id: string; title: string; slug?: string | null }): string {
  const rawSlug = typeof set.slug === "string" ? set.slug.trim() : "";
  return `/flashcards/${cleanPublicSlug(rawSlug, set.title, "flashcards")}`;
}

export function buildExamPath(exam: { id: string; title: string; slug?: string | null }): string {
  const rawSlug = typeof exam.slug === "string" ? exam.slug.trim() : "";
  const slug = rawSlug || `${slugifyTitle(exam.title) || "exam"}-${(exam.id || "").slice(0, 6)}`;
  return `/exams/${slug}/start`;
}

export function extractIdFromParam(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (UUID_REGEX.test(v)) return v;
  const match = v.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

function toArticlePreview(row: any): Article {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published: row.published,
    content: row.content ?? "",
    original_notes: row.original_notes ?? "",
    is_raw: row.is_raw ?? false,
    slug: row.slug ?? undefined,
    meta_description: row.meta_description ?? undefined,
    og_image_url: row.og_image_url ?? undefined,
    tags: row.tags ?? [],
    featured_image: row.featured_image ?? undefined,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────
const SUMMARY_CACHE_KEY = "article_summaries_cache_v2";
const SUMMARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — avoids repeated full-list reloads on a large site

let memorySummaryCache: { data: Article[]; ts: number } | null = null;

function getCachedSummaries(): Article[] | null {
  if (memorySummaryCache && Date.now() - memorySummaryCache.ts < SUMMARY_CACHE_TTL) {
    return memorySummaryCache.data;
  }
  try {
    const raw = sessionStorage.getItem(SUMMARY_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ts && Date.now() - parsed.ts < SUMMARY_CACHE_TTL) {
        memorySummaryCache = { data: parsed.data, ts: parsed.ts };
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

function setCachedSummaries(data: Article[]) {
  const entry = { data, ts: Date.now() };
  memorySummaryCache = entry;
  try {
    sessionStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

/**
 * Call this whenever an article is saved or deleted so the Blog page
 * immediately reflects the change instead of waiting for the TTL to expire.
 */
export function clearArticleSummaryCache() {
  memorySummaryCache = null;
  try {
    sessionStorage.removeItem(SUMMARY_CACHE_KEY);
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

// Articles
export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Article[];
}

export async function getPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Article[];
}

export async function getPublishedArticleSummaries(year?: string): Promise<Article[]> {
  if (!year) {
    const cached = getCachedSummaries();
    if (cached) return cached;
  }

  let query = supabase
    .from("articles")
    .select("id, title, category, created_at, updated_at, published, slug, meta_description, og_image_url, tags, featured_image")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (year && /^Year [1-6]$/.test(year)) {
    query = query.like("category", `${year}:%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const result = (data || []).map((row) => toArticlePreview(row));

  if (!year) setCachedSummaries(result);
  return result;
}

const MCQ_SUMMARY_CACHE_KEY = "mcq_summaries_cache_v1";
let memoryMcqSummaryCache: { data: McqSet[]; ts: number } | null = null;

function readTimedCache<T>(key: string): { data: T; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.ts && Date.now() - parsed.ts < SUMMARY_CACHE_TTL ? parsed : null;
  } catch { return null; }
}

function writeTimedCache<T>(key: string, data: T) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export async function getPublishedMcqSetSummaries(): Promise<McqSet[]> {
  if (memoryMcqSummaryCache && Date.now() - memoryMcqSummaryCache.ts < SUMMARY_CACHE_TTL) return memoryMcqSummaryCache.data;
  const cached = readTimedCache<McqSet[]>(MCQ_SUMMARY_CACHE_KEY);
  if (cached) {
    memoryMcqSummaryCache = cached;
    return cached.data;
  }
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("id, title, category, slug, meta_title, meta_description, og_image_url, created_at, updated_at, published")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const result = (data || []).map((row: any) => ({ ...row, questions: [] })) as McqSet[];
  memoryMcqSummaryCache = { data: result, ts: Date.now() };
  writeTimedCache(MCQ_SUMMARY_CACHE_KEY, result);
  return result;
}

export async function searchPublishedMcqSets(queryText: string, year?: string): Promise<McqSet[]> {
  const q = queryText.trim().toLowerCase();
  if (!q) return [];
  let query = supabase
    .from("mcq_sets")
    .select("id, title, category, slug, meta_title, meta_description, og_image_url, created_at, updated_at, published, questions")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (year && /^Year [1-6]$/.test(year)) query = query.like("category", `${year}:%`);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as any[]).filter((set) => {
    const hay = `${set.title || ""} ${set.category || ""} ${JSON.stringify(set.questions || [])}`.toLowerCase();
    return hay.includes(q);
  }) as McqSet[];
}

export async function searchPublishedArticles(queryText: string, year?: string, unit?: string): Promise<Article[]> {
  const q = queryText.trim();
  if (!q) return [];

  const safeQ = q.replace(/[,%]/g, " ").slice(0, 80);
  const tsQuery = safeQ.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1).slice(0, 6).join(" & ");
  let query = supabase
    .from("articles")
    .select("id, title, category, created_at, updated_at, published, slug, meta_description, og_image_url, tags, featured_image")
    .eq("published", true)
    .is("deleted_at", null)
    .or(`title.ilike.%${safeQ}%,category.ilike.%${safeQ}%,meta_description.ilike.%${safeQ}%,content_fts.fts.${tsQuery || safeQ}`)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (year && /^Year [1-6]$/.test(year)) {
    query = query.like("category", `${year}:%`);
  }

  if (unit) {
    query = query.eq("category", unit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) =>
    toArticlePreview({
      ...row,
      content: row.meta_description || "",
    }),
  );
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as Article | null;
}

export async function getArticleBySlugOrId(slugOrId: string): Promise<Article | null> {
  const normalizedParam = decodeURIComponent(String(slugOrId || "")).trim().toLowerCase();
  if (!normalizedParam) return null;

  const explicitId = extractArticleIdFromParam(normalizedParam);
  if (explicitId) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", explicitId)
      .eq("published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data as Article | null;
  }

  const { data: slugMatches, error: slugError } = await supabase
    .from("articles")
    .select("id")
    .or(`slug.eq.${normalizedParam},slug.ilike.%-${normalizedParam}`)
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (slugError) throw slugError;

  const slugMatch = slugMatches?.[0];
  if (slugMatch) return getArticleById(slugMatch.id);

  const { data, error } = await supabase
    .from("articles")
    .select("id, title")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const exactMatch = (data || []).find((row: any) => slugifyTitle(row.title) === normalizedParam);
  const startsWithMatch = exactMatch || (data || []).find((row: any) => slugifyTitle(row.title).startsWith(normalizedParam));
  if (!startsWithMatch) return null;

  return getArticleById(startsWithMatch.id);
}

export async function saveArticle(article: Omit<Article, "id"> & { id?: string }): Promise<Article> {
  const normalizedSlug = (article.slug || slugifyTitle(article.title)).trim();
  const cat = article.category ? article.category.replace(/^Year\s*\d+:\s*/i, "").trim() : "";
  const normalizedMetaTitle = (article.meta_title?.trim() || article.title || "Study Notes").slice(0, 60);
  const generatedDescription = stripRichText(article.content || article.original_notes || "", 155);
  const providedDescription = article.meta_description?.trim() || "";
  const normalizedMetaDescription = (
    (providedDescription.length >= 50 ? providedDescription : "") ||
    generatedDescription ||
    providedDescription ||
    `${article.title} — clinical study notes${cat ? " on " + cat : ""} for medical students.`
  ).slice(0, 155);
  const normalizedOgImage = article.og_image_url?.trim() || article.featured_image?.trim() || extractFirstImageFromContent(article.content || "") || null;

  const payload = {
    title: article.title,
    content: article.content,
    published: article.published,
    original_notes: article.original_notes,
    category: article.category,
    is_raw: article.is_raw ?? false,
    slug: normalizedSlug || null,
    meta_title: normalizedMetaTitle,
    meta_description: normalizedMetaDescription,
    og_image_url: normalizedOgImage,
  } as any;
  // Pass-through extra publishing settings if provided
  if (article.countdown !== undefined) payload.countdown = article.countdown;
  if (article.html_embed !== undefined) payload.html_embed = article.html_embed;
  if (article.password_protected !== undefined) payload.password_protected = article.password_protected;
  if (article.access_password !== undefined) payload.access_password = article.access_password;
  if (article.scheduled_at !== undefined) payload.scheduled_at = article.scheduled_at;
  payload.tags = autoTagsFromText([article.title, article.category, article.content, article.original_notes], article.tags);
  if (article.featured_image !== undefined) payload.featured_image = article.featured_image;
  if (article.reading_time_minutes !== undefined) payload.reading_time_minutes = article.reading_time_minutes;
  if (article.toc_enabled !== undefined) payload.toc_enabled = article.toc_enabled;
  if (article.comments_enabled !== undefined) payload.comments_enabled = article.comments_enabled;
  payload.university = article.university || "Mount Kenya University";
  payload.school = article.school || "School of Medicine";
  if (article.lecturer !== undefined) payload.lecturer = article.lecturer || null;
  if (article.exam_type !== undefined) payload.exam_type = article.exam_type || null;
  if (article.exam_year !== undefined) payload.exam_year = article.exam_year || null;
  if (article.unit !== undefined) payload.unit = article.unit || null;

  let saved: Article;

  if (article.id) {
    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", article.id)
      .select()
      .single();
    if (error) throw error;
    saved = data as Article;
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    saved = data as Article;
  }

  // Clear cache so Blog page immediately shows the updated category order
  clearArticleSummaryCache();

  if (saved.published) autoIndexUrls([`${SITE_URL}${buildBlogPath(saved)}`]);
  return saved;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from("articles").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  if (error) throw error;
  // Clear cache so deleted article disappears immediately
  clearArticleSummaryCache();
}

// Flashcard Sets
export async function getFlashcardSets(): Promise<FlashcardSet[]> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as FlashcardSet[];
}

export async function getPublishedFlashcardSets(): Promise<FlashcardSet[]> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select("*")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as FlashcardSet[];
}

export async function getFlashcardSetById(id: string): Promise<FlashcardSet | null> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as FlashcardSet | null;
}

export async function getFlashcardSetBySlugOrId(param: string): Promise<FlashcardSet | null> {
  const v = decodeURIComponent(String(param || "")).trim();
  if (!v) return null;
  const id = extractIdFromParam(v);
  if (id) return getFlashcardSetById(id);
  const { data } = await supabase
    .from("flashcard_sets")
    .select("*")
    .eq("slug", v)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (data) return data as unknown as FlashcardSet;
  const titlePart = v.replace(/-[0-9a-f]{6}$/, "");
  const { data: list } = await supabase
    .from("flashcard_sets")
    .select("*")
    .or(`slug.ilike.${titlePart}%,slug.ilike.%${titlePart}%`)
    .eq("published", true)
    .is("deleted_at", null)
    .limit(1);
  if (list && list[0]) return list[0] as unknown as FlashcardSet;
  return null;
}

export async function saveFlashcardSet(set: Omit<FlashcardSet, "id"> & { id?: string }): Promise<FlashcardSet> {
  const payload = {
    title: set.title,
    cards: set.cards as any,
    published: set.published,
    original_notes: set.original_notes,
    category: set.category,
    is_raw: set.is_raw ?? false,
    slug: (set.slug && set.slug.trim()) || slugifyTitle(set.title) || null,
  };

  if (set.id) {
    const { data, error } = await supabase
      .from("flashcard_sets")
      .update(payload)
      .eq("id", set.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FlashcardSet;
  } else {
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FlashcardSet;
  }
}

export async function deleteFlashcardSet(id: string) {
  const { error } = await supabase.from("flashcard_sets").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  if (error) throw error;
}

// MCQ Sets
export async function getMcqSets(): Promise<McqSet[]> {
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as McqSet[];
}

export async function getPublishedMcqSets(): Promise<McqSet[]> {
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("*")
    .eq("published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as McqSet[];
}

export async function getMcqSetById(id: string): Promise<McqSet | null> {
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as McqSet | null;
}

export async function getMcqSetBySlugOrId(param: string): Promise<McqSet | null> {
  const v = decodeURIComponent(String(param || "")).trim();
  if (!v) return null;
  const id = extractIdFromParam(v);
  if (id) return getMcqSetById(id);
  const { data } = await supabase
    .from("mcq_sets")
    .select("*")
    .eq("slug", v)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (data) return data as unknown as McqSet;
  const titlePart = v.replace(/-[0-9a-f]{6}$/, "");
  const { data: list } = await supabase
    .from("mcq_sets")
    .select("*")
    .or(`slug.ilike.${titlePart}%,slug.ilike.%${titlePart}%`)
    .eq("published", true)
    .is("deleted_at", null)
    .limit(1);
  if (list && list[0]) return list[0] as unknown as McqSet;
  const titleSearch = titlePart.replace(/-/g, " ");
  const { data: byTitle } = await supabase
    .from("mcq_sets")
    .select("*")
    .ilike("title", `%${titleSearch}%`)
    .eq("published", true)
    .is("deleted_at", null)
    .limit(1);
  return (byTitle && byTitle[0]) ? (byTitle[0] as unknown as McqSet) : null;
}

export async function saveMcqSet(set: Omit<McqSet, "id"> & { id?: string }): Promise<McqSet> {
  const balancedQuestions = normalizeMcqQuestions((set.questions || []) as any[]);
  const cat = set.category ? set.category.replace(/^Year\s*\d+:\s*/i, "").trim() : "";
  const qCount = balancedQuestions.length;
  const firstQ = stripRichText(((balancedQuestions[0] as any)?.question) || "", 90);
  const autoMetaTitle = (set.meta_title?.trim() || set.title || "MCQ Practice").slice(0, 60);
  const autoMetaDesc = (
    set.meta_description?.trim() ||
    `${qCount} clinical MCQs${cat ? " in " + cat : ""}. ${firstQ}`
  ).slice(0, 155);
  const defaultMcqThumb = `${SITE_URL}/og-default.png`;
  const payload = {
    title: set.title,
    questions: balancedQuestions as any,
    published: set.published,
    original_notes: set.original_notes,
    category: set.category,
    access_password: set.access_password || "",
    is_raw: set.is_raw ?? false,
    slug: (set.slug && set.slug.trim()) || slugifyTitle(set.title) || null,
    meta_title: autoMetaTitle,
    meta_description: autoMetaDesc,
    og_image_url: set.og_image_url?.trim() || set.featured_image?.trim() || defaultMcqThumb,
  } as any;
  if (set.countdown !== undefined) payload.countdown = set.countdown;
  if (set.html_embed !== undefined) payload.html_embed = set.html_embed;
  if (set.password_protected !== undefined) payload.password_protected = set.password_protected;
  if (set.scheduled_at !== undefined) payload.scheduled_at = set.scheduled_at;
  payload.tags = autoTagsFromText([set.title, set.category, set.original_notes, JSON.stringify(set.questions || [])], set.tags);
  if (set.featured_image !== undefined) payload.featured_image = set.featured_image;
  if (set.reading_time_minutes !== undefined) payload.reading_time_minutes = set.reading_time_minutes;
  if (set.toc_enabled !== undefined) payload.toc_enabled = set.toc_enabled;
  if (set.comments_enabled !== undefined) payload.comments_enabled = set.comments_enabled;
  payload.university = set.university || "Mount Kenya University";
  payload.school = set.school || "School of Medicine";
  if (set.lecturer !== undefined) payload.lecturer = set.lecturer || null;
  if (set.exam_type !== undefined) payload.exam_type = set.exam_type || null;
  if (set.exam_year !== undefined) payload.exam_year = set.exam_year || null;
  if (set.unit !== undefined) payload.unit = set.unit || null;

  if (set.id) {
    const { data, error } = await supabase
      .from("mcq_sets")
      .update(payload)
      .eq("id", set.id)
      .select()
      .single();
    if (error) throw error;
    memoryMcqSummaryCache = null;
    try { sessionStorage.removeItem(MCQ_SUMMARY_CACHE_KEY); } catch {}
    return data as unknown as McqSet;
  } else {
    const { data, error } = await supabase
      .from("mcq_sets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    memoryMcqSummaryCache = null;
    try { sessionStorage.removeItem(MCQ_SUMMARY_CACHE_KEY); } catch {}
    return data as unknown as McqSet;
  }
}

export async function deleteMcqSet(id: string) {
  const { error } = await supabase.from("mcq_sets").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  if (error) throw error;
}

// Related content by category
export async function getRelatedContent(category: string, excludeArticleId?: string) {
  const [{ data: articles }, { data: flashcards }, { data: mcqs }, { data: essays }] = await Promise.all([
    supabase.from("articles").select("id, title, category, content, meta_description, og_image_url, slug, updated_at, created_at").eq("published", true).eq("category", category).is("deleted_at", null).order("updated_at", { ascending: false }).limit(16),
    supabase.from("flashcard_sets").select("id, title, category, cards").eq("published", true).eq("category", category),
    supabase.from("mcq_sets").select("id, title, category, questions, slug").eq("published", true).eq("category", category),
    excludeArticleId
      ? supabase
          .from("essays")
          .select("id, title, short_answer_questions, long_answer_questions")
          .eq("published", true)
          .is("deleted_at", null)
          .eq("article_id", excludeArticleId)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  return {
    articles: (articles || []).filter((a: any) => a.id !== excludeArticleId),
    flashcards: flashcards || [],
    mcqs: mcqs || [],
    essays: essays || [],
  };
}

export async function getAllCategories(): Promise<{ name: string; articles: number; flashcards: number; mcqs: number }[]> {
  const [{ data: articles }, { data: flashcards }, { data: mcqs }] = await Promise.all([
    supabase.from("articles").select("category, updated_at, created_at").eq("published", true),
    supabase.from("flashcard_sets").select("category, updated_at, created_at").eq("published", true),
    supabase.from("mcq_sets").select("category, updated_at, created_at").eq("published", true),
  ]);

  const cats: Record<string, { articles: number; flashcards: number; mcqs: number; latest: number }> = {};
  const bump = (c: string, key: "articles" | "flashcards" | "mcqs", ts: string | null | undefined) => {
    if (!cats[c]) cats[c] = { articles: 0, flashcards: 0, mcqs: 0, latest: 0 };
    cats[c][key]++;
    const t = ts ? new Date(ts).getTime() : 0;
    if (t > cats[c].latest) cats[c].latest = t;
  };
  (articles || []).forEach((a: any) => bump(a.category || "Uncategorized", "articles", a.updated_at || a.created_at));
  (flashcards || []).forEach((f: any) => bump(f.category || "Uncategorized", "flashcards", f.updated_at || f.created_at));
  (mcqs || []).forEach((m: any) => bump(m.category || "Uncategorized", "mcqs", m.updated_at || m.created_at));

  return Object.entries(cats)
    .filter(([name]) => name !== "Uncategorized")
    .map(([name, c]) => ({ name, articles: c.articles, flashcards: c.flashcards, mcqs: c.mcqs }))
    .sort((a, b) => (cats[b.name].latest - cats[a.name].latest) || a.name.localeCompare(b.name));
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const { data } = await supabase
    .from("articles")
    .select("category")
    .eq("published", true);
  const counts: Record<string, number> = {};
  (data || []).forEach((a: any) => {
    const cat = a.category || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function getArticleCategories(): Promise<ArticleCategory[]> {
  const { data, error } = await (supabase as any)
    .from("article_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ArticleCategory[];
}

export async function saveArticleCategory(input: string | { name?: string }): Promise<ArticleCategory> {
  const raw = typeof input === "string" ? input : (input?.name ?? "");
  const name = String(raw).trim();
  if (!name) throw new Error("Category name required");
  const { data, error } = await (supabase as any)
    .from("article_categories")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ArticleCategory;
}

export async function deleteArticleCategory(id: string) {
  const { error } = await (supabase as any).from("article_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function getSetting(key: string): Promise<string> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error(`Failed to load setting "${key}":`, error.message);
    return "";
  }
  return data?.value || "";
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const normalized = value.trim();
  const { data: existing, error: existingError } = await supabase
    .from("app_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error } = await supabase.from("app_settings").update({ value: normalized }).eq("key", key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("app_settings").insert({ key, value: normalized });
    if (error) throw error;
  }
}
