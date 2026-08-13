export const SUPPLEMENTARY_GROUPS = [
  "Year 2 Microbiology",
  "Year 2 Parasitology",
  "Year 3 Bacteriology & Parasitology II",
  "Medical Virology",
  "Medical Mycology",
  "General Pathology",
  "Systemic Pathology",
  "Haematology",
] as const;

export type SupplementaryGroup = (typeof SUPPLEMENTARY_GROUPS)[number];

const SYSTEMIC_CATEGORIES = /(?:bone and soft tissue pathology|breast pathology|cardiovascular system pathology|dermatopathology|endocrine and metabolic pathology|female reproductive system pathology|gastrointestinal pathology|head\s*&\s*neck pathology|male reproductive and urinary system pathology|neuropathology|respiratory system pathology)/i;
const GENERAL_CATEGORIES = /(?:general pathology|immunopathology|oncopathology|histopathology\s*&\s*cytopathology)/i;
const HAEM_CATEGORIES = /(?:hematopathology|haematopathology|blood transfusion)/i;

/**
 * Category-first classification for the supplementary dashboard.
 * A disease word in a title must never override its assigned academic unit:
 * e.g. HIV nephropathy remains urinary-system pathology, and viral arthritis
 * remains bone/soft-tissue pathology. Titles are consulted only for genuinely
 * generic categories such as "Uncategorized" or "Weekly Exam: Pathology".
 */
export function classifySupplementaryResource(title: string, category: string): SupplementaryGroup | null {
  const c = (category || "").trim();
  const t = (title || "").trim();

  if (/^(?:Weekly Exam:\s*)?Year 2:\s*Microbiology$/i.test(c)) return "Year 2 Microbiology";
  if (/^(?:Weekly Exam:\s*)?Year 2:\s*Parasitology$/i.test(c)) return "Year 2 Parasitology";
  if (/^Year 3:\s*(?:Bacteriology|Parasitology)$/i.test(c)) return "Year 3 Bacteriology & Parasitology II";
  if (/^Year 3:\s*Medical Virology$/i.test(c)) return "Medical Virology";
  if (/^Year 3:\s*Medical Mycology$/i.test(c)) return "Medical Mycology";
  if (HAEM_CATEGORIES.test(c)) return "Haematology";
  if (SYSTEMIC_CATEGORIES.test(c)) return "Systemic Pathology";
  if (GENERAL_CATEGORIES.test(c)) {
    if (/systemic pathology/i.test(t)) return "Systemic Pathology";
    return "General Pathology";
  }

  const generic = /^(?:Uncategorized|Pathology|Weekly Exam:\s*Pathology)$/i.test(c);
  if (!generic) return null;
  if (/haemat|hemat|blood transfusion|anaemia|anemia|leuk|leuka|lymphoma|coagulation|haemostasis|hemostasis/i.test(t)) return "Haematology";
  if (/medical virology|virology\b/i.test(t)) return "Medical Virology";
  if (/medical mycology|mycology\b/i.test(t)) return "Medical Mycology";
  if (/parasitology\b/i.test(t)) return "Year 2 Parasitology";
  if (/microbiology\b/i.test(t)) return "Year 2 Microbiology";
  if (/bacteriology\b/i.test(t)) return "Year 3 Bacteriology & Parasitology II";
  if (/systemic pathology|cardiovascular pathology|respiratory pathology|gastrointestinal pathology|renal pathology|endocrine pathology|reproductive pathology|breast pathology|bone pathology|skin pathology|neuropathology/i.test(t)) return "Systemic Pathology";
  if (/general pathology|cell injury|inflammation|neoplas|tissue repair|wound healing/i.test(t) || /pathology/i.test(c)) return "General Pathology";
  return null;
}
