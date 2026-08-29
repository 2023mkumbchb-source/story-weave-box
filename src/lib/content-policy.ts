const NON_STUDY_IMPORT_TITLE = /^(?:notice to all students\b|students handbook\b|executive order no\b)/i;

/** Public discovery must contain study material, not accidental admin imports. */
export function isPublicStudyTitle(title: unknown): boolean {
  return !NON_STUDY_IMPORT_TITLE.test(String(title || "").trim());
}

export function hasEssayContent(essay: { short_answer_questions?: unknown; long_answer_questions?: unknown }): boolean {
  const saqs = Array.isArray(essay?.short_answer_questions) ? essay.short_answer_questions : [];
  const laqs = Array.isArray(essay?.long_answer_questions) ? essay.long_answer_questions : [];
  return saqs.length + laqs.length > 0;
}

export function hasStoryContent(story: { content?: unknown }): boolean {
  return String(story?.content || "").trim().length >= 100;
}
