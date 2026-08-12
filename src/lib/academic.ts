import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "article" | "mcq" | "flashcard" | "exam" | "story";

export const CONTENT_TYPES = [
  "Notes",
  "CAT",
  "Past Paper",
  "MCQ Bank",
  "Course Outline",
  "Revision Guide",
  "Flashcards",
  "Timed Exam",
  "Clinical Story",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export interface AcademicYear {
  id: string;
  year_number: number;
  title: string;
  description: string | null;
  published: boolean;
}

export interface Unit {
  id: string;
  academic_year_id: string;
  semester_id: string | null;
  name: string;
  slug: string;
  short_name: string | null;
  course_code: string | null;
  description: string | null;
  learning_objectives: string | null;
  exam_information: string | null;
  legacy_category: string | null;
  display_order: number;
  published: boolean;
  icon: string | null;
  color: string | null;
}

export interface SyllabusTopic {
  id: string;
  unit_id: string;
  parent_topic_id: string | null;
  title: string;
  description: string | null;
  learning_objectives: string | null;
  display_order: number;
  importance: string;
}

export interface UnitResource {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  content_type: string | null;
  created_at: string;
  updated_at: string | null;
  verification_status?: string | null;
  completeness_status?: string | null;
  exam_year?: string | null;
  kind: ResourceType;
}

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 5 * 60 * 1000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearAcademicCache() {
  cache.clear();
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  return cached("years", async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("id, year_number, title, description, published")
      .order("display_order");
    return (data as AcademicYear[]) || [];
  });
}

export async function getUnitsForYear(yearNumber: number): Promise<Unit[]> {
  return cached(`units:${yearNumber}`, async () => {
    const years = await getAcademicYears();
    const year = years.find((y) => y.year_number === yearNumber);
    if (!year) return [];
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("academic_year_id", year.id)
      .order("display_order")
      .order("name");
    return (data as Unit[]) || [];
  });
}

export async function getUnitBySlug(yearNumber: number, slug: string): Promise<Unit | null> {
  const units = await getUnitsForYear(yearNumber);
  return units.find((u) => u.slug === slug) || null;
}

export function unitPath(yearNumber: number, slug: string) {
  return `/year/${yearNumber}/unit/${slug}`;
}

export async function getTopicsForUnit(unitId: string): Promise<SyllabusTopic[]> {
  const { data } = await supabase
    .from("syllabus_topics")
    .select("*")
    .eq("unit_id", unitId)
    .order("display_order");
  return (data as SyllabusTopic[]) || [];
}

/** Resource lists for a unit. Only summary columns are fetched. */
export async function getUnitResources(unit: Unit): Promise<UnitResource[]> {
  const category = unit.legacy_category;
  const filter = category ? `unit_id.eq.${unit.id},category.eq.${category}` : `unit_id.eq.${unit.id}`;
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: unknown) => any;
      };
    };
  };

  const run = async (table: string, cols: string, limit: number) => {
    const { data } = await (db
      .from(table)
      .select(cols)
      .eq("published", true) as any)
      .is("deleted_at", null)
      .or(filter)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as UnitResource[];
  };

  const [articles, mcqs, flashcards] = await Promise.all([
    run("articles", "id, title, slug, category, content_type, created_at, updated_at, verification_status, completeness_status, exam_year", 200),
    run("mcq_sets", "id, title, slug, category, content_type, created_at, updated_at", 100),
    run("flashcard_sets", "id, title, slug, category, content_type, created_at, updated_at", 100),
  ]);

  return [
    ...articles.map((r) => ({ ...r, kind: "article" as const })),
    ...mcqs.map((r) => ({ ...r, kind: "mcq" as const })),
    ...flashcards.map((r) => ({ ...r, kind: "flashcard" as const })),
  ];
}

export function resourcePath(r: UnitResource): string {
  if (r.kind === "mcq") return `/mcqs/${r.slug || r.id}`;
  if (r.kind === "flashcard") return `/flashcards/${r.slug || r.id}`;
  return `/blog/${r.slug || r.id}`;
}

export function classifyContentType(r: UnitResource): ContentType {
  if (r.content_type && (CONTENT_TYPES as readonly string[]).includes(r.content_type)) {
    return r.content_type as ContentType;
  }
  if (r.kind === "mcq") return "MCQ Bank";
  if (r.kind === "flashcard") return "Flashcards";
  const t = r.title.toLowerCase();
  if (/course outline/.test(t)) return "Course Outline";
  if (/\bcat\b|continuous assessment/.test(t)) return "CAT";
  if (/past paper|end of year|eoy|mid semester|exam 20/.test(t)) return "Past Paper";
  if (/revision guide|study guide/.test(t)) return "Revision Guide";
  return "Notes";
}
