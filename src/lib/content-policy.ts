const NON_STUDY_IMPORT_TITLE = /^(?:notice to all students\b|students handbook\b|executive order no\b)/i;

/** Public discovery must contain study material, not accidental admin imports. */
export function isPublicStudyTitle(title: unknown): boolean {
  return !NON_STUDY_IMPORT_TITLE.test(String(title || "").trim());
}
