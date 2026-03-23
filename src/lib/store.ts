import { supabase } from "@/integrations/supabase/client";
import { extractFirstImageFromContent, stripRichText, autoIndexUrls, SITE_URL } from "@/lib/seo";

export interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  original_notes: string;
  category: string;
  is_raw?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  slug?: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  cards: { question: string; answer: string }[];
  created_at: string;
  updated_at: string;
  published: boolean;
  original_notes: string;
  category: string;
  is_raw?: boolean;
}

export interface McqSet {
  id: string;
  title: string;
  questions: { question: string; options: string[]; correct_answer: number; explanation?: string }[];
  created_at: string;
  updated_at: string;
  published: boolean;
  original_notes: string;
  category: string;
  access_password: string;
  is_raw?: boolean;
}

const ADMIN_PASSWORD = "Davis";

export function authenticate(password: string): boolean {
  return password === ADMIN_PASSWORD;
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
  const match = category.match(/^(Year \d)/);
  return match ? match[1] : null;
}

export function getYearNumber(category: string): number {
  const match = category.match(/^Year (\d)/);
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
  return (title || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildBlogPath(article: Pick<Article, "id" | "title"> & { slug?: string }): string {
  const slug = article.slug || slugifyTitle(article.title) || "article";
  return `/blog/${article.id}-${slug}`;
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
  };
}

// Simple in-memory + sessionStorage cache for article summaries
const SUMMARY_CACHE_KEY = "article_summaries_cache_v2";
const SUMMARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let memorySummaryCache: { data: Article[]; ts: number } | null = null;

function getCachedSummaries(): Article[] | null {
  // Check memory first
  if (memorySummaryCache && Date.now() - memorySummaryCache.ts < SUMMARY_CACHE_TTL) {
    return memorySummaryCache.data;
  }
  // Check sessionStorage
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
  // Only cache the "all" request (no year filter)
  if (!year) {
    const cached = getCachedSummaries();
    if (cached) return cached;
  }

  let query = supabase
    .from("articles")
    .select("id, title, category, created_at, updated_at, published, slug, meta_description")
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

export async function searchPublishedArticles(queryText: string, year?: string, unit?: string): Promise<Article[]> {
  const q = queryText.trim();
  if (!q) return [];

  const safeQ = q.replace(/[,%]/g, " ").slice(0, 80);
  let query = supabase
    .from("articles")
    .select("id, title, category, created_at, updated_at, published, slug, meta_description")
    .eq("published", true)
    .is("deleted_at", null)
    .or(`title.ilike.%${safeQ}%,category.ilike.%${safeQ}%,content.ilike.%${safeQ}%`)
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
    .maybeSingle();
  if (error) throw error;
  return data as Article | null;
}

export async function getArticleBySlugOrId(slugOrId: string): Promise<Article | null> {
  const normalizedParam = decodeURIComponent(String(slugOrId || "")).trim().toLowerCase();
  if (!normalizedParam) return null;

  const explicitId = extractArticleIdFromParam(normalizedParam);
  if (explicitId) return getArticleById(explicitId);

  // Check DB slug column first
  const { data: slugMatch } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", normalizedParam)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (slugMatch) return getArticleById(slugMatch.id);

  // Fallback: match by title slug
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
  const normalizedMetaTitle = (article.meta_title?.trim() || article.title).slice(0, 80);
  const generatedDescription = stripRichText(article.content || article.original_notes || "", 160);
  const normalizedMetaDescription = (
    article.meta_description?.trim() ||
    generatedDescription ||
    `Study ${article.title} on Kenya Meds.`
  ).slice(0, 160);
  const normalizedOgImage = article.og_image_url?.trim() || extractFirstImageFromContent(article.content || "") || null;

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
  };

  if (article.id) {
    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", article.id)
      .select()
      .single();
    if (error) throw error;
    const saved = data as Article;
    if (saved.published) autoIndexUrls([`${SITE_URL}${buildBlogPath(saved)}`]);
    return saved;
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const saved = data as Article;
    if (saved.published) autoIndexUrls([`${SITE_URL}${buildBlogPath(saved)}`]);
    return saved;
  }
}

export async function deleteArticle(id: string) {
  // Soft delete
  const { error } = await supabase.from("articles").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  if (error) throw error;
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
    .maybeSingle();
  if (error) throw error;
  return data as unknown as FlashcardSet | null;
}

export async function saveFlashcardSet(set: Omit<FlashcardSet, "id"> & { id?: string }): Promise<FlashcardSet> {
  const payload = {
    title: set.title,
    cards: set.cards as any,
    published: set.published,
    original_notes: set.original_notes,
    category: set.category,
    is_raw: set.is_raw ?? false,
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
    .maybeSingle();
  if (error) throw error;
  return data as unknown as McqSet | null;
}

export async function saveMcqSet(set: Omit<McqSet, "id"> & { id?: string }): Promise<McqSet> {
  const payload = {
    title: set.title,
    questions: set.questions as any,
    published: set.published,
    original_notes: set.original_notes,
    category: set.category,
    access_password: set.access_password || "",
    is_raw: set.is_raw ?? false,
  };

  if (set.id) {
    const { data, error } = await supabase
      .from("mcq_sets")
      .update(payload)
      .eq("id", set.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as McqSet;
  } else {
    const { data, error } = await supabase
      .from("mcq_sets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as McqSet;
  }
}

export async function deleteMcqSet(id: string) {
  const { error } = await supabase.from("mcq_sets").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  if (error) throw error;
}

// Related content by category
export async function getRelatedContent(category: string, excludeArticleId?: string) {
  const [{ data: articles }, { data: flashcards }, { data: mcqs }] = await Promise.all([
    supabase.from("articles").select("id, title, category").eq("published", true).eq("category", category),
    supabase.from("flashcard_sets").select("id, title, category, cards").eq("published", true).eq("category", category),
    supabase.from("mcq_sets").select("id, title, category, questions").eq("published", true).eq("category", category),
  ]);
  return {
    articles: (articles || []).filter((a: any) => a.id !== excludeArticleId),
    flashcards: flashcards || [],
    mcqs: mcqs || [],
  };
}

export async function getAllCategories(): Promise<{ name: string; articles: number; flashcards: number; mcqs: number }[]> {
  const [{ data: articles }, { data: flashcards }, { data: mcqs }] = await Promise.all([
    supabase.from("articles").select("category").eq("published", true),
    supabase.from("flashcard_sets").select("category").eq("published", true),
    supabase.from("mcq_sets").select("category").eq("published", true),
  ]);

  const cats: Record<string, { articles: number; flashcards: number; mcqs: number }> = {};
  (articles || []).forEach((a: any) => {
    const c = a.category || "Uncategorized";
    if (!cats[c]) cats[c] = { articles: 0, flashcards: 0, mcqs: 0 };
    cats[c].articles++;
  });
  (flashcards || []).forEach((f: any) => {
    const c = f.category || "Uncategorized";
    if (!cats[c]) cats[c] = { articles: 0, flashcards: 0, mcqs: 0 };
    cats[c].flashcards++;
  });
  (mcqs || []).forEach((m: any) => {
    const c = m.category || "Uncategorized";
    if (!cats[c]) cats[c] = { articles: 0, flashcards: 0, mcqs: 0 };
    cats[c].mcqs++;
  });

  return Object.entries(cats)
    .filter(([name]) => name !== "Uncategorized")
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
