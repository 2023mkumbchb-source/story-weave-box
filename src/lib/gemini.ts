import { supabase } from "@/integrations/supabase/client";
import { getSetting } from "@/lib/store";

export async function generateArticle(notes: string): Promise<{ title: string; content: string }> {
  const geminiKey = await getSetting("gemini_api_key");
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { notes, type: 'article', geminiKey },
  });
  if (error) throw new Error(error.message || "Failed to generate article");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateFlashcards(
  notes: string,
  count: number = 20
): Promise<{ question: string; answer: string }[]> {
  const geminiKey = await getSetting("gemini_api_key");
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { notes, type: 'flashcards', count, geminiKey },
  });
  if (error) throw new Error(error.message || "Failed to generate flashcards");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateMcqs(
  notes: string,
  count: number = 15
): Promise<{ question: string; options: string[]; correct_answer: number; explanation?: string }[]> {
  const geminiKey = await getSetting("gemini_api_key");
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { notes, type: 'mcqs', count, geminiKey },
  });
  if (error) throw new Error(error.message || "Failed to generate MCQs");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function autoCategorizе(notes: string): Promise<string> {
  const geminiKey = await getSetting("gemini_api_key");
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { notes, type: 'categorize', geminiKey },
  });
  if (error) return "Uncategorized";
  return data?.category || "Uncategorized";
}
