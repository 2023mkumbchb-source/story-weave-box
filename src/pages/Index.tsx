import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, GraduationCap, ListChecks, Loader2,
  ArrowRight, Trophy, BookMarked, Phone, MessageCircle, Clock, Sparkles, Globe2,
} from "lucide-react";
import { getAllCategories, getCategoryDisplayName, getYearFromCategory, YEAR_CATEGORIES, buildBlogPath, buildMcqPath, buildFlashcardPath } from "@/lib/store";
import { buildStoryPath, updateMetaTags } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";

const QUICK_ACCESS = [
  { to: "/mcqs", label: "MCQ Bank", desc: "Clinical practice questions", icon: ListChecks, tint: "bg-primary/10 text-primary" },
  { to: "/flashcards", label: "Flashcards", desc: "Spaced repetition ready", icon: GraduationCap, tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { to: "/blog", label: "Articles", desc: "Expert clinical guides", icon: BookOpen, tint: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { to: "/exams", label: "Past Papers", desc: "Timed exam mode", icon: Trophy, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

type RecentItem = { id: string; title: string; type: "article" | "mcq" | "flashcard" | "story"; category: string; created_at: string; slug?: string | null };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function Index() {
  const [categories, setCategories] = useState<{ name: string; articles: number; flashcards: number; mcqs: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyUploaded, setRecentlyUploaded] = useState<RecentItem[]>([]);
  const [lastRead, setLastRead] = useState<RecentArticle[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "articles" | "mcqs" | "flashcards" | "stories">("all");

  useEffect(() => {
    updateMetaTags({
      title: "Medical Notes, MCQs & Exams | OmpathStudy",
      description: "Free medical study notes, MCQs, flashcards and timed exams for MBChB and health students across Kenya and East Africa.",
    });

    // Load categories
    getAllCategories().then(setCategories).finally(() => setLoading(false));

    // Load last read
    setLastRead(getRecentArticles());

    // Load recently uploaded content (articles, mcqs, flashcards, stories)
    Promise.all([
      supabase.from("articles").select("id, title, category, created_at, slug").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
      supabase.from("mcq_sets").select("id, title, category, created_at, slug").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
      supabase.from("flashcard_sets").select("id, title, category, created_at, slug").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
      supabase.from("stories").select("id, title, category, created_at, slug").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
    ]).then(([arts, mcqs, fcs, stories]) => {
      const items: RecentItem[] = [
        ...(arts.data || []).map(a => ({ ...a, type: "article" as const })),
        ...(mcqs.data || []).map(m => ({ ...m, type: "mcq" as const })),
        ...(fcs.data || []).map(f => ({ ...f, type: "flashcard" as const })),
        ...(stories.data || []).map(s => ({ ...s, type: "story" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentlyUploaded(items);
    });
  }, []);

  const yearGroups = Object.keys(YEAR_CATEGORIES).map(year => {
    const yearCats = categories.filter(c => getYearFromCategory(c.name) === year);
    const total = yearCats.reduce((sum, c) => sum + c.articles + c.flashcards + c.mcqs, 0);
    return { year, categories: yearCats, total };
  }).filter(g => g.total > 0);

  const filteredRecent = recentlyUploaded.filter(item => activeTab === "all" || (activeTab === "articles" && item.type === "article") || (activeTab === "mcqs" && item.type === "mcq") || (activeTab === "flashcards" && item.type === "flashcard") || (activeTab === "stories" && item.type === "story"));

  function getItemLink(item: RecentItem) {
    switch (item.type) {
      case "article": return buildBlogPath(item);
      case "mcq": return buildMcqPath(item);
      case "flashcard": return buildFlashcardPath(item);
      case "story": return buildStoryPath(item);
    }
  }

  const typeMeta = {
    article: { label: "Article", short: "ART", icon: BookOpen, badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
    mcq:     { label: "MCQ Set", short: "MCQ", icon: ListChecks, badge: "bg-primary/10 text-primary" },
    flashcard:{ label: "Flashcards", short: "FC", icon: GraduationCap, badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
    story:   { label: "Story",   short: "STY", icon: BookMarked, badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  } as const;

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Hero — Academic Premium */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none" aria-hidden>
          <svg className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border border-white/10 pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-20 sm:pt-16 sm:pb-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-primary-foreground/80">
              <span className="h-px w-8 bg-primary-foreground/40" />
              <Globe2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Global Medical Education · East Africa</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight max-w-3xl">
              Master medicine in East Africa <span className="text-primary-foreground/80">&amp; beyond.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-primary-foreground/85">
              The most comprehensive open repository for medical students — high-yield notes, MCQ banks, past papers and clinical stories, organised by year and unit.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/blog" className="rounded-full bg-white px-7 py-3 text-sm font-bold text-primary shadow-lg shadow-black/10 hover:bg-white/95 transition">
                Start Studying
              </Link>
              <Link to="/mcqs" className="rounded-full border border-primary-foreground/25 bg-white/10 px-7 py-3 text-sm font-bold text-primary-foreground backdrop-blur-sm hover:bg-white/20 transition">
                Practice MCQs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Grid — overlapping cards */}
      <section className="mx-auto max-w-6xl px-5 -mt-12 sm:-mt-14 relative z-10">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {QUICK_ACCESS.map((q, i) => (
            <div key={q.to}>
              <Link to={q.to}
                className="group block rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${q.tint}`}>
                  <q.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">{q.label}</h3>
                <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{q.desc}</p>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        {/* Last Read */}
        {lastRead.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl font-bold text-foreground">Continue Reading</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lastRead.slice(0, 3).map(ra => {
                const cleanTitle = (ra.title || "")
                  .replace(/^[\p{Extended_Pictographic}\u2600-\u27BF\uFE0F]+/gu, "")
                  .trim();
                return (
                  <Link key={ra.id} to={buildBlogPath(ra)}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm hover:border-primary/20">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{cleanTitle}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{ra.category}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Browse by Year */}
        <div className="mb-10">
          <div className="flex items-end justify-between border-b border-border pb-3 mb-5">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Browse by Year</h2>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">MBChB curriculum, organised by year &amp; unit</p>
            </div>
            <Link to="/blog" className="text-xs sm:text-sm font-semibold text-primary hover:underline whitespace-nowrap">View all</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : yearGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No study materials yet. Content is being added regularly!</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
                {yearGroups.map(g => (
                  <Link key={g.year} to={`/blog?year=${encodeURIComponent(g.year)}`}
                    className="whitespace-nowrap rounded-full border border-border bg-card px-5 py-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition">
                    {g.year}
                  </Link>
                ))}
              </div>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearGroups.map((group, i) => (
                  <div key={group.year}>
                    <Link to={`/blog?year=${encodeURIComponent(group.year)}`}
                      className="group block h-full rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-serif text-lg font-bold text-primary">{group.year}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-1">
                        {group.categories.slice(0, 5).map(cat => (
                          <p key={cat.name} className="text-sm text-muted-foreground truncate">{getCategoryDisplayName(cat.name)}</p>
                        ))}
                        {group.categories.length > 5 && (
                          <p className="text-xs text-muted-foreground/60">+{group.categories.length - 5} more units</p>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recently Added */}
        <div>
          <div className="flex items-end justify-between border-b border-border pb-3 mb-5">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Recently Added
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">Fresh notes, MCQs, flashcards &amp; clinical stories</p>
            </div>
          </div>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {(["all", "articles", "mcqs", "flashcards", "stories"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all capitalize ${activeTab === tab ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
          {filteredRecent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No content yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecent.slice(0, 10).map(item => {
                const meta = typeMeta[item.type];
                const Icon = meta.icon;
                return (
                  <Link key={`${item.type}-${item.id}`} to={getItemLink(item)}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                    <div className={`hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${meta.badge} font-bold text-xs tracking-wide`}>
                      {meta.short}
                    </div>
                    <div className="flex sm:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badge}`}>{meta.label}</span>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(item.created_at)}</span>
                      </div>
                      <h4 className="truncate text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="truncate text-xs text-muted-foreground">{getCategoryDisplayName(item.category)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Ompath Study</p>
          <div className="flex gap-2">
            <a href="tel:+254115475543" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a href="https://wa.me/254115475543" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
