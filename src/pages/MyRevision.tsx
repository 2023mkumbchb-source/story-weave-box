import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Bookmark, BookOpen, CalendarDays, CheckCircle2, Clock, Flame, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getActivity, getBookmarks, getProgress, computeStreak, type BookmarkRow, type ResourceProgress } from "@/lib/study";
import { supabase } from "@/integrations/supabase/client";
import { buildBlogPath } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

type ArticleSummary = { id: string; title: string; slug: string | null; category: string; updated_at: string | null; created_at: string };

function ResourceList({ items, byId, empty }: { items: { resource_id: string; status?: string }[]; byId: Map<string, ArticleSummary>; empty: string }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 12).map((p, i) => {
        const a = byId.get(p.resource_id);
        if (!a) return null;
        return (
          <Link
            key={`${p.resource_id}-${i}`}
            to={buildBlogPath(a)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{a.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{a.category}</span>
            </span>
            {p.status && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase">{p.status.replace("_", " ")}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function MyRevision() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ResourceProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [p, b, a] = await Promise.all([
          getProgress(user?.id || null),
          getBookmarks(user?.id || null),
          getActivity(user?.id || null),
        ]);
        // Study controls currently only run on articles (see StudyControls
        // usage), so restricting to resource_type "article" here keeps the
        // stat counts and the visible lists below in sync. Widen this once
        // flashcards/MCQs/exams grow their own progress rows.
        const articleProgress = p.filter((x) => x.resource_type === "article");
        const articleBookmarks = b.filter((x) => x.resource_type === "article");
        const ids = [...new Set([...articleProgress, ...articleBookmarks].map((x) => x.resource_id))];
        let rows: ArticleSummary[] = [];
        if (ids.length) {
          const { data } = await supabase
            .from("articles")
            .select("id,title,slug,category,updated_at,created_at")
            .in("id", ids)
            .eq("published", true);
          rows = (data || []) as ArticleSummary[];
        }
        if (!alive) return;
        setProgress(articleProgress);
        setBookmarks(articleBookmarks);
        setArticles(rows);
        setStreak(computeStreak(a));
        setLoading(false);
      } catch {
        if (alive) { setError(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const ongoing = progress.filter((p) => p.status === "in_progress" || p.status === "revisit" || p.status === "difficult");
  const completed = progress.filter((p) => p.status === "completed").length;
  const saved = bookmarks;

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-10">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">We could not load your revision space. Please refresh to try again.</p>
      </div>
    );
  }

  const stats: [typeof Clock, string, string | number][] = [
    [Clock, "In progress", ongoing.length],
    [CheckCircle2, "Completed", completed],
    [Bookmark, "Saved", saved.length],
    [Flame, "Study streak", `${streak} days`],
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Helmet>
        <title>My Revision | OmpathStudy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
        <span className="text-foreground">My Revision</span>
      </nav>

      <div className="rounded-3xl bg-[hsl(174,62%,20%)] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Personal study space</p>
        <h1 className="mt-2 font-serif text-3xl font-bold">My Revision</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Continue where you stopped, revisit difficult material and keep your exam preparation together.
        </p>
        {!user && (
          <Link to="/login" className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-bold text-[hsl(174,62%,20%)]">
            Sign in to sync across devices
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([Icon, label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-serif text-xl font-bold">Continue studying</h2>
          <ResourceList items={ongoing} byId={byId} empty="Open a study note and mark it for revision." />
        </section>
        <section>
          <h2 className="mb-3 font-serif text-xl font-bold">Saved resources</h2>
          <ResourceList items={saved} byId={byId} empty="Use the Save button on any article to build your list." />
        </section>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/revision-planner" className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 hover:border-primary">
          <CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="block">Build a revision plan</strong>
            <span className="text-sm text-muted-foreground">Turn your units and exam date into daily tasks.</span>
          </span>
        </Link>
        <Link to="/search" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
          <Target className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="block">Find a weak topic</strong>
            <span className="text-sm text-muted-foreground">Search notes, CATs, papers and flashcards together.</span>
          </span>
        </Link>
      </div>
    </main>
  );
}
