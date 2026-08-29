const NON_STUDY_IMPORT_TITLE = /^(?:notice to all students\b|students handbook\b|executive order no\b)/i;
const QUARANTINED_MCQ_IDS = new Set(["7fd6b778-ec52-4e41-ac34-ee69a7bbe68d"]);

/** Public discovery must contain study material, not accidental admin imports. */
export function isPublicStudyTitle(title: unknown): boolean {
  return !NON_STUDY_IMPORT_TITLE.test(String(title || "").trim());
}

/** Banks with systemic answer-key corruption stay inaccessible until rebuilt. */
export function isPublicMcqSet(set: { id?: unknown; title?: unknown }): boolean {
  if (QUARANTINED_MCQ_IDS.has(String(set?.id || ""))) return false;
  return !/^dr\.\s*orata haematology mcqs\b/i.test(String(set?.title || "").trim());
}

export function hasEssayContent(essay: { short_answer_questions?: unknown; long_answer_questions?: unknown }): boolean {
  const saqs = Array.isArray(essay?.short_answer_questions) ? essay.short_answer_questions : [];
  const laqs = Array.isArray(essay?.long_answer_questions) ? essay.long_answer_questions : [];
  return saqs.length + laqs.length > 0;
}

export function hasStoryContent(story: { content?: unknown }): boolean {
  return String(story?.content || "").trim().length >= 100;
}

export function dedupeResourceSummaries<T extends { title?: unknown; category?: unknown; exam_year?: unknown; slug?: unknown; updated_at?: unknown }>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows || []) {
    const key = [row.title, row.category, row.exam_year].map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
    const previous = best.get(key);
    if (!previous) { best.set(key, row); continue; }
    const score = (value: T) => (String(value.slug || "").trim() ? 2 : 0) + (Date.parse(String(value.updated_at || "")) || 0) / 1e15;
    if (score(row) > score(previous)) best.set(key, row);
  }
  return [...best.values()];
}
