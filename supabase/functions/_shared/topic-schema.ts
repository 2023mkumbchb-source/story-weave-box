export const TOPIC_SECTIONS = [
  "definition", "classification", "causes_risk_factors", "presentation", "investigations",
  "red_flags_complications", "management", "follow_up_prevention", "differentials", "pitfalls",
  "examiner_questions", "common_questions", "epidemiology", "references",
] as const;

export type TopicSectionName = typeof TOPIC_SECTIONS[number];
export type TopicSection = { applicable: boolean; content: string; confidence: "high" | "medium" | "low" };
export type TopicPage = { title: string; sections: Record<TopicSectionName, TopicSection> };

export function validateTopicPage(value: unknown): { valid: boolean; errors: string[]; missing: string[] } {
  const errors: string[] = [];
  const missing: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Page must be a JSON object"], missing: [...TOPIC_SECTIONS] };
  const page = value as Record<string, any>;
  if (typeof page.title !== "string" || !page.title.trim()) errors.push("title must be a non-empty string");
  if (!page.sections || typeof page.sections !== "object" || Array.isArray(page.sections)) {
    return { valid: false, errors: [...errors, "sections must be an object"], missing: [...TOPIC_SECTIONS] };
  }
  for (const name of TOPIC_SECTIONS) {
    const section = page.sections[name];
    if (!section || typeof section !== "object") { missing.push(name); continue; }
    if (typeof section.applicable !== "boolean") errors.push(`${name}.applicable must be boolean`);
    if (typeof section.content !== "string") errors.push(`${name}.content must be a string`);
    if (!["high", "medium", "low"].includes(section.confidence)) errors.push(`${name}.confidence must be high, medium or low`);
    if (section.applicable === true && typeof section.content === "string" && !section.content.trim()) missing.push(name);
    if ((name === "examiner_questions" || name === "common_questions") && section.applicable === true && typeof section.content === "string" && !/(?:answer|→|A\\s*:)/i.test(section.content)) errors.push(`${name} must include visible answers, not question-only headings`);
    if (section.applicable === false && typeof section.content === "string" && section.content.trim()) {
      errors.push(`${name} is not applicable and must have empty content`);
    }
  }
  if (page.title?.toLowerCase().includes("cord prolapse")) {
    const classification = page.sections.classification;
    if (classification?.applicable !== false) errors.push("Cord prolapse classification must be applicable:false unless a recognised standard classification is explicitly supplied");
    const management = String(page.sections.management?.content || "").toLowerCase();
    if (/push(?:ing)?\s+(?:the\s+)?cord\s+(?:back|up)|replace\s+(?:the\s+)?cord/.test(management)) {
      errors.push("Unsafe cord prolapse instruction: never advise pushing/replacing the cord into the uterus");
    }
  }
  return { valid: errors.length === 0 && missing.length === 0, errors, missing };
}

export function isReviewApproved(review: { verdict: string; findings: Array<{ severity: string }> }): boolean {
  const high = review.findings.some((finding) => finding.severity === "high");
  const medium = review.findings.filter((finding) => finding.severity === "medium").length;
  return review.verdict === "approved" && !high && medium < 3;
}
