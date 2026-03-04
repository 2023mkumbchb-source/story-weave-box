import { supabase } from "@/integrations/supabase/client";

export interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published: boolean;
  original_notes: string;
  category: string;
  is_raw?: boolean;
}

export interface FlashcardSet {
  id: string;
  title: string;
  cards: { question: string; answer: string }[];
  created_at: string;
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

// Medical unit categories
export const UNIT_CATEGORIES = [
  "Basic Pharmacology II",
  "Hematopathology",
  "Research Methodology and Proposal Writing",
  "Endocrine and Metabolic Pathology",
  "Chemical Pathology",
  "Respiratory System Pathology",
  "Junior Clerkship/Practicals in General Pathology I",
  "Gastrointestinal Pathology",
  "Female Reproductive System Pathology",
  "Cardiovascular System Pathology",
];

export function getCategoryDisplayName(category: string): string {
  if (!category || category === "Uncategorized") return category;
  const parts = category.split(":");
  return parts.length > 1 ? parts[1].trim() : category;
}

// Articles
export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Article[];
}

export async function getPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Article[];
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

export async function saveArticle(article: Omit<Article, "id"> & { id?: string }): Promise<Article> {
  const payload = {
    title: article.title,
    content: article.content,
    published: article.published,
    original_notes: article.original_notes,
    category: article.category,
    is_raw: article.is_raw ?? false,
  };

  if (article.id) {
    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", article.id)
      .select()
      .single();
    if (error) throw error;
    return data as Article;
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Article;
  }
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
}

// Flashcard Sets
export async function getFlashcardSets(): Promise<FlashcardSet[]> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as FlashcardSet[];
}

export async function getPublishedFlashcardSets(): Promise<FlashcardSet[]> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
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
  const { error } = await supabase.from("flashcard_sets").delete().eq("id", id);
  if (error) throw error;
}

// MCQ Sets
export async function getMcqSets(): Promise<McqSet[]> {
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as McqSet[];
}

export async function getPublishedMcqSets(): Promise<McqSet[]> {
  const { data, error } = await supabase
    .from("mcq_sets")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
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
  const { error } = await supabase.from("mcq_sets").delete().eq("id", id);
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
