// The site's knowledge graph, built in the browser from everything published: notes, question banks and flashcards
// (database), library files (Drive), and course-outline topics. Nothing is stored by hand, so whatever is published
// tomorrow is connected tomorrow. Two things link items: shared uncommon words in their titles, and the same body
// system seen through a different discipline (heart anatomy ↔ heart embryology ↔ heart pathology ↔ cardiac drugs).
import registry from "@/data/libraries.json";
import { COURSE_OUTLINES } from "@/data/courseOutlines";
import { supabase } from "@/integrations/supabase/client";
import { buildBlogPath, buildFlashcardPath, buildMcqPath, getPublishedArticleSummaries } from "@/lib/store";
import { loadLibrary, type LibraryNode } from "@/lib/libraryData";
import { libraryPath, prettyTitle } from "@/lib/libraryMeta";
import { loadSiteConfig } from "@/lib/siteConfig";
import { classify, COMPANIONS, DISCIPLINES, SYSTEMS, type DisciplineId, type SystemId } from "@/lib/concepts";

export type NodeType = "note" | "quiz" | "file" | "topic";
export interface GNode {
  id: string; type: NodeType; title: string; where: string; year: number | null;
  discipline: DisciplineId; systems: SystemId[]; tokens: string[]; href: string; label: string; fileKind?: string;
}
export interface Draft { id?: string; title: string; where?: string; year?: number | null }
export interface Related {
  discipline: DisciplineId; systems: SystemId[];
  /** Same subject matter, any discipline: the note, the slides and the question bank on one topic. */
  topic: GNode[];
  /** Other disciplines that look at the same system, in the order a student should meet them. */
  lenses: { discipline: DisciplineId; items: GNode[] }[];
  /** When the topic has no clear body system: the subjects that are always studied alongside this one. */
  companions: { discipline: DisciplineId; items: GNode[] }[];
}

const STOP = new Set("the and for with from that this these those are was were has have had not but you your all any can may its into out per via using use used pdf doc docx ppt pptx pps mp4 notes note exam exams examination question questions answer answers past paper papers revision guide year semester cat cats lecture lectures slide slides handout handouts mku mbchb mount kenya university part set bank mcq mcqs essay essays short long review summary complete comprehensive detailed key must know ultra deep final main sem supplementary anatomy anatomical physiology physiological histology embryology biochemistry biochemical pathology pathological pharmacology microbiology gross clinical medical medicine human supplementary copy new old version edition book books unit units topic topics introduction intro overview general basic basics module course outline week".split(" "));
const FIX: [RegExp, string][] = [[/haem/g, "hem"], [/oe(?=[a-z])/g, "e"], [/ae(?=[a-z])/g, "e"], [/ph(?=[a-z])/g, "f"]];

export function tokenize(text: string): string[] {
  const out = new Set<string>();
  for (let w of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) continue;
    for (const [re, rep] of FIX) w = w.replace(re, rep);
    if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    if (w.length > 6 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
    out.add(w);
  }
  return [...out];
}

const stripYear = (category: string) => category.replace(/^Year \d:\s*/i, "");
const yearOf = (category: string) => Number(/^Year (\d)/i.exec(category)?.[1]) || null;

interface Graph { nodes: GNode[]; idf: Map<string, number> }
let graph: Promise<Graph> | null = null;

function node(n: Omit<GNode, "discipline" | "systems" | "tokens"> & { hint: string }): GNode {
  const { discipline, systems } = classify(n.title, n.hint);
  return { ...n, discipline, systems, tokens: tokenize(n.title) };
}

async function build(): Promise<Graph> {
  const nodes: GNode[] = [];
  const cfg = await loadSiteConfig();
  const hidden = new Set(cfg.hiddenFiles);

  // Notes
  try {
    for (const a of await getPublishedArticleSummaries()) {
      if (a.category === "Stories") continue;
      nodes.push(node({ id: `note:${a.id}`, type: "note", title: a.title, where: a.category, year: yearOf(a.category), href: buildBlogPath(a), label: a.content_type && a.content_type !== "Notes" ? a.content_type : "Note", hint: a.category }));
    }
  } catch { /* notes unavailable: the rest still connects */ }

  // Question banks and flashcards
  try {
    const [mcq, cards] = await Promise.all([
      supabase.from("mcq_sets").select("id, title, slug, category").eq("published", true).is("deleted_at", null).limit(1000),
      supabase.from("flashcard_sets").select("id, title, slug, category").eq("published", true).is("deleted_at", null).limit(500),
    ]);
    for (const r of mcq.data ?? []) nodes.push(node({ id: `mcq:${r.id}`, type: "quiz", title: r.title, where: r.category ?? "", year: yearOf(r.category ?? ""), href: buildMcqPath(r), label: "MCQ bank", hint: r.category ?? "" }));
    for (const r of cards.data ?? []) nodes.push(node({ id: `fc:${r.id}`, type: "quiz", title: r.title, where: r.category ?? "", year: yearOf(r.category ?? ""), href: buildFlashcardPath(r), label: "Flashcards", hint: r.category ?? "" }));
  } catch { /* skip */ }

  // Library files
  await Promise.all(registry.libraries.map(async (def) => {
    try {
      const lib = await loadLibrary(def.dataFile);
      const walk = (list: LibraryNode[], names: string[], slugs: string[]) => {
        for (const n of list) {
          const here = [...names, n.n];
          const hereSlugs = [...slugs, n.s];
          for (const f of n.f ?? []) {
            if (hidden.has(f[0]) || !["pdf", "ppt", "doc", "video"].includes(f[2])) continue;
            const title = cfg.renames[f[0]] ?? prettyTitle(f[1]);
            nodes.push(node({ id: `file:${f[0]}`, type: "file", title, where: `${def.label} › ${here.join(" › ")}`, year: def.year, href: `${libraryPath(def, hereSlugs)}?file=${encodeURIComponent(f[0])}`, label: f[2] === "ppt" ? "Slides" : f[2] === "video" ? "Video" : f[2] === "pdf" ? "PDF" : "Document", fileKind: f[2], hint: here.join(" ") }));
          }
          if (n.d) walk(n.d, here, hereSlugs);
        }
      };
      walk(lib.d, [], []);
    } catch { /* skip */ }
  }));

  // Outline topics
  for (const o of COURSE_OUTLINES) for (const s of o.sections) for (const i of s.items) {
    nodes.push(node({ id: `topic:${i.id}`, type: "topic", title: i.title, where: `${o.department} › ${s.title}`, year: o.year, href: `/course-outlines/${o.id}#${encodeURIComponent(i.id)}`, label: "Outline topic", hint: `${o.department} ${s.title}` }));
  }

  const df = new Map<string, number>();
  for (const n of nodes) for (const t of n.tokens) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log(1 + nodes.length / c));
  return { nodes, idf };
}

export function loadGraph(): Promise<Graph> {
  if (!graph) { graph = build(); graph.catch(() => { graph = null; }); }
  return graph;
}

const TYPE_RANK: Record<NodeType, number> = { note: 0, quiz: 1, topic: 2, file: 3 };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function relatedTo(g: Graph, draft: Draft): Related {
  const { discipline, systems } = classify(draft.title, draft.where ?? "");
  const tokens = tokenize(draft.title);
  const selfTitle = norm(draft.title);
  const year = draft.year ?? null;
  const yearScore = (n: GNode) => (year && n.year ? (n.year === year ? 1 : Math.abs(n.year - year) === 1 ? 0.4 : 0) : 0);

  const scored: { n: GNode; lex: number; sys: boolean; score: number }[] = [];
  for (const n of g.nodes) {
    if (n.id === draft.id || norm(n.title) === selfTitle) continue;
    let lex = 0;
    for (const t of tokens) if (n.tokens.includes(t)) lex += g.idf.get(t) ?? 0;
    const sys = systems.length > 0 && n.systems.some((s) => systems.includes(s));
    if (lex < 2.2 && !(sys && n.discipline !== discipline)) continue;
    scored.push({ n, lex, sys, score: lex * 2 + (sys ? 3 : 0) + yearScore(n) + (n.type === "note" ? 0.5 : n.type === "quiz" ? 0.3 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || TYPE_RANK[a.n.type] - TYPE_RANK[b.n.type]);

  const topic = scored.filter((s) => s.lex >= 2.2).slice(0, 8).map((s) => s.n);
  const topicIds = new Set(topic.map((n) => n.id));

  const lenses: Related["lenses"] = [];
  for (const d of DISCIPLINES) {
    if (d.id === discipline) continue;
    const items = scored.filter((s) => s.n.discipline === d.id && s.sys && !topicIds.has(s.n.id)).slice(0, 3).map((s) => s.n);
    if (items.length) lenses.push({ discipline: d.id, items });
  }

  const companions: Related["companions"] = [];
  if (!systems.length) {
    for (const d of COMPANIONS[discipline] ?? []) {
      const items = g.nodes
        .filter((n) => n.discipline === d && (n.type === "note" || n.type === "quiz" || n.type === "topic") && (!year || n.year === year || n.year === year + 1 || n.year === year - 1))
        .sort((a, b) => (year && b.year === year ? 1 : 0) - (year && a.year === year ? 1 : 0) || TYPE_RANK[a.type] - TYPE_RANK[b.type])
        .slice(0, 3);
      if (items.length) companions.push({ discipline: d, items });
    }
  }
  return { discipline, systems, topic, lenses, companions };
}

/** Everything about one body system, grouped by discipline, for the Study map hub pages. */
export function bySystem(g: Graph, system: SystemId, year: number | null) {
  return DISCIPLINES.map((d) => {
    const all = g.nodes.filter((n) => n.systems.includes(system) && n.discipline === d.id && (!year || n.year === year));
    all.sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.title.localeCompare(b.title));
    return { discipline: d, items: all };
  }).filter((x) => x.items.length);
}

export function systemCounts(g: Graph, year: number | null) {
  return SYSTEMS.map((s) => {
    const items = g.nodes.filter((n) => n.systems.includes(s.id) && (!year || n.year === year));
    return { system: s, total: items.length, disciplines: new Set(items.map((n) => n.discipline)).size };
  });
}
