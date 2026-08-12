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

/** Resource counts + lists for a unit. Only summary columns are fetched. */
export async function getUnitResources(unit: Unit): Promise<UnitResource[]> {
  const category = unit.legacy_category;
  const out: UnitResource[] = [];

  const articleQuery = supabase
    .from("articles")
    .select("id, title, slug, category, content_type, created_at, updated_at, verification_status, completeness_status, exam_year")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const mcqQuery = supabase
    .from("mcq_sets")
    .select("id, title, slug, category, content_type, created_at, updated_at")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const flashQuery = supabase
    .from("flashcard_sets")
    .select("id, title, slug, category, content_type, created_at, updated_at")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const scope = <T extends { or: (f: string) => T; eq: (c: string, v: unknown) => T }>(q: T) =>
    category ? q.or(`unit_id.eq.${unit.id},category.eq.${category}`) : q.eq("unit_id", unit.id);

  const [articles, mcqs, flashcards] = await Promise.all([
    scope(articleQuery as never) as unknown as ReturnType<typeof articleQuery.then> extends never ? never : Promise<{ data: unknown[] | null }>,
    scope(mcqQuery as never) as unknown as Promise<{ data: unknown[] | null }>,
    scope(flashQuery as never) as unknown as Promise<{ data: unknown[] | null }>,
  ]);

  for (const row of (articles.data || []) as UnitResource[]) out.push({ ...row, kind: "article" });
  for (const row of (mcqs.data || []) as UnitResource[]) out.push({ ...row, kind: "mcq" });
  for (const row of (flashcards.data || []) as UnitResource[]) out.push({ ...row, kind: "flashcard" });
  return out;
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
