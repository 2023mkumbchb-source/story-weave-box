import { supabase } from "@/integrations/supabase/client";

export async function generateArticle(notes: string): Promise<{ id?: string; title: string; content: string; ai_check_status?: string; review?: unknown }> {
  const { data, error } = await supabase.functions.invoke("generate-content", {
    body: { notes, type: "article" },
  });
  if (error) throw new Error(error.message || "Failed to generate article");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateFlashcards(notes: string, count = 20): Promise<{ question: string; answer: string }[]> {
  const { data, error } = await supabase.functions.invoke("generate-content", { body: { notes, type: "flashcards", count } });
  if (error) throw new Error(error.message || "Failed to generate flashcards");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateMcqs(notes: string, count = 15): Promise<{ question: string; options: string[]; correct_answer: number; explanation?: string }[]> {
  const { data, error } = await supabase.functions.invoke("generate-content", { body: { notes, type: "mcqs", count } });
  if (error) throw new Error(error.message || "Failed to generate MCQs");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function autoCategorizе(notes: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-content", { body: { notes, type: "categorize" } });
  if (error) return "Uncategorized";
  return data?.category || "Uncategorized";
}
