import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, GraduationCap, ListChecks, Loader2,
  ArrowRight, Trophy, BookMarked, Phone, MessageCircle, Clock, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAllCategories, getCategoryDisplayName, getYearFromCategory, YEAR_CATEGORIES, buildBlogPath, buildMcqPath, buildFlashcardPath } from "@/lib/store";
import { updateMetaTags } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";

const YEAR_META: Record<string, { color: string; border: string }> = {
  "Year 1": { color: "text-primary", border: "border-primary/30" },
  "Year 2": { color: "text-primary", border: "border-primary/30" },
  "Year 3": { color: "text-primary", border: "border-primary/30" },
  "Year 4": { color: "text-primary", border: "border-primary/30" },
  "Year 5": { color: "text-primary", border: "border-primary/30" },
  "Year 6": { color: "text-primary", border: "border-primary/30" },
};

const HERO_TINT = "bg-primary/15";

const NAV_ITEMS = [
  { to: "/blog", label: "Articles", icon: BookOpen },
  { to: "/flashcards", label: "Flashcards", icon: GraduationCap },
  { to: "/mcqs", label: "MCQs", icon: ListChecks },
  { to: "/exams", label: "Exams", icon: Trophy },
  { to: "/stories", label: "Stories", icon: BookMarked },
];

type RecentItem = { id: string; title: string; type: "article" | "mcq" | "flashcard" | "story"; category: string; created_at: string };

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
      title: "OMPATH – Free Medical Study Platform for Kenyan Students",
      description: "Comprehensive medical study notes, flashcards, MCQs, and exam preparation for Kenyan medical students. Organized by year and unit.",
    });

    // Load categories
    getAllCategories().then(setCategories).finally(() => setLoading(false));

    // Load last read
    setLastRead(getRecentArticles());

    // Load recently uploaded content (articles, mcqs, flashcards, stories)
    Promise.all([
      supabase.from("articles").select("id, title, category, created_at").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
      supabase.from("mcq_sets").select("id, title, category, created_at").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
      supabase.from("flashcard_sets").select("id, title, category, created_at").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
      supabase.from("stories").select("id, title, category, created_at").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
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
      case "story": return `/stories/${item.id}`;
    }
  }

  const typeIcon = { article: BookOpen, mcq: ListChecks, flashcard: GraduationCap, story: BookMarked };
  const typeLabel = { article: "Article", mcq: "MCQ", flashcard: "Flashcard", story: "Story" };
  const typeColor = { article: "text-blue-500", mcq: "text-emerald-500", flashcard: "text-amber-500", story: "text-purple-500" };

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero — compact so Continue Reading is visible above the fold */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className={`absolute inset-0 ${HERO_TINT}`} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-accent/60" />
        <div className="relative mx-auto max-w-5xl px-5 py-6 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold mb-2 leading-tight break-words">
              Medical Notes, MCQs & Past Papers — Kenya & East Africa
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-xl leading-snug mb-4">
              Free study notes, flashcards, MCQs and timed exams for medical students at UoN, KU, MKU, JKUAT, Moi, Egerton and other Kenyan & East African universities — organized by year and unit.
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {NAV_ITEMS.map(item => (
                <Link key={item.to} to={item.to}
                  className="group flex items-center gap-1.5 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary-foreground/20 transition-all">
                  <item.icon className="h-3.5 w-3.5 text-primary-foreground/80" />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-8">
        {/* Last Read */}
        {lastRead.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold text-foreground">Continue Reading</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lastRead.slice(0, 3).map(ra => (
                <Link key={ra.id} to={buildBlogPath(ra)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm hover:border-primary/20">
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{ra.title}</p>
                    <p className="text-[11px] text-muted-foreground">{ra.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recently Uploaded */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg font-bold text-foreground">Recently Added</h2>
          </div>
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {(["all", "articles", "mcqs", "flashcards", "stories"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
          {filteredRecent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No content yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredRecent.slice(0, 10).map(item => {
                const Icon = typeIcon[item.type];
                return (
                  <Link key={`${item.type}-${item.id}`} to={getItemLink(item)}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm hover:border-primary/20">
                    <Icon className={`h-4 w-4 shrink-0 ${typeColor[item.type]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {typeLabel[item.type]} · {getCategoryDisplayName(item.category)} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Year sections */}
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground mb-4">Browse by Year</h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : yearGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No study materials yet. Content is being added regularly!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {yearGroups.map((group, i) => {
                const meta = YEAR_META[group.year] || YEAR_META["Year 1"];
                return (
                  <motion.div key={group.year} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link to={`/blog?year=${encodeURIComponent(group.year)}`}
                      className={`group block rounded-xl border ${meta.border} bg-card p-5 hover:shadow-md transition-all`}
                      style={{ boxShadow: "var(--shadow-card)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-lg font-bold font-serif ${meta.color}`}>{group.year}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-1">
                        {group.categories.slice(0, 5).map(cat => (
                          <p key={cat.name} className="text-sm text-muted-foreground truncate">{getCategoryDisplayName(cat.name)}</p>
                        ))}
                        {group.categories.length > 5 && (
                          <p className="text-xs text-muted-foreground/60">+{group.categories.length - 5} more</p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                        {group.categories.length} units · {group.total} items
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} OMPATH</p>
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
