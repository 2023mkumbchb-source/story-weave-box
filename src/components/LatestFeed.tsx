import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileQuestion, GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; title: string; slug: string | null; kind: "note" | "exam" | "cards" };
let memo: { at: number; items: Item[] } | null = null;

async function load(): Promise<Item[]> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.items;
  const q = (t: "articles" | "mcq_sets" | "flashcard_sets", n: number) =>
    supabase.from(t).select("id,title,slug").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(n);
  const [a, m, f] = await Promise.all([q("articles", 5), q("mcq_sets", 5), q("flashcard_sets", 3)]);
  const items: Item[] = [
    ...(m.data ?? []).map((r) => ({ ...r, kind: "exam" as const })),
    ...(a.data ?? []).map((r) => ({ ...r, kind: "note" as const })),
    ...(f.data ?? []).map((r) => ({ ...r, kind: "cards" as const })),
  ];
  memo = { at: Date.now(), items };
  return items;
}

const META = {
  exam: { label: "Latest exams & MCQs", icon: FileQuestion, path: (i: Item) => `/mcqs/${i.slug || i.id}`, all: "/exams" },
  note: { label: "Latest notes", icon: BookOpen, path: (i: Item) => `/blog/${i.slug || i.id}`, all: "/blog" },
  cards: { label: "New flashcards", icon: GraduationCap, path: (i: Item) => `/flashcards/${i.slug || i.id}`, all: "/flashcards" },
} as const;

/** Fills sidebars with real, recently published study material. */
export default function LatestFeed() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => { load().then(setItems).catch(() => setItems([])); }, []);

  if (items === null) return <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" aria-hidden="true" />;
  if (!items.length) return null;

  return (
    <>
      {(["exam", "note", "cards"] as const).map((k) => {
        const list = items.filter((i) => i.kind === k);
        if (!list.length) return null;
        const M = META[k];
        return (
          <section key={k} className="rounded-xl border border-border bg-card p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><M.icon className="h-3.5 w-3.5 text-primary" /> {M.label}</h3>
            <ul className="space-y-0.5">
              {list.map((i) => <li key={i.id}><Link to={M.path(i)} className="line-clamp-2 rounded-md px-1.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:text-primary">{i.title}</Link></li>)}
            </ul>
            <Link to={M.all} className="mt-1.5 inline-flex items-center gap-1 px-1.5 text-[11px] font-bold text-primary hover:underline"><Sparkles className="h-3 w-3" /> See all</Link>
          </section>
        );
      })}
    </>
  );
}
