import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X, Loader2, BookOpen, Clock, ArrowRight, GraduationCap } from "lucide-react";
import { getPublishedArticles, getCategories, getCategoryDisplayName, getYearFromCategory, getYearNumber, type Article } from "@/lib/store";
import ArticleCard from "@/components/ArticleCard";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";
import { motion, AnimatePresence } from "framer-motion";

const YEARS = ["All", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

function normalizeYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "All") return "All";
  const match = trimmed.match(/year\s*([1-5])/i);
  return match ? `Year ${match[1]}` : null;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const selectedYear = normalizeYear(searchParams.get("year")) || normalizeYear(sessionStorage.getItem("nav_year_filter")) || "All";
  const selectedUnit = searchParams.get("unit");

  useEffect(() => {
    getPublishedArticles().then(setArticles).finally(() => setLoading(false));
    setRecentArticles(getRecentArticles());
  }, []);

  const setYear = (year: string) => {
    if (year === "All") setSearchParams({});
    else setSearchParams({ year });
  };

  const setUnit = (unit: string | null) => {
    if (unit) setSearchParams({ year: selectedYear, unit });
    else if (selectedYear !== "All") setSearchParams({ year: selectedYear });
    else setSearchParams({});
  };

  // Get unique units for the selected year
  const unitsForYear = useMemo(() => {
    if (selectedYear === "All") return [];
    const units = new Map<string, number>();
    articles.forEach(a => {
      const year = getYearFromCategory(a.category);
      if (year === selectedYear) {
        const unitName = getCategoryDisplayName(a.category);
        units.set(a.category, (units.get(a.category) || 0) + 1);
      }
    });
    return Array.from(units.entries())
      .map(([cat, count]) => ({ category: cat, name: getCategoryDisplayName(cat), count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [articles, selectedYear]);

  const filtered = useMemo(() => {
    const base = articles.filter((a) => {
      if (a.category === "Stories") return false;
      const matchesSearch = !search.trim() ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        getCategoryDisplayName(a.category).toLowerCase().includes(search.toLowerCase());
      const matchesYear = selectedYear === "All" || getYearFromCategory(a.category) === selectedYear;
      const matchesUnit = !selectedUnit || a.category === selectedUnit;
      return matchesSearch && matchesYear && matchesUnit;
    });

    base.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortBy === "oldest" ? at - bt : bt - at;
    });

    return base;
  }, [articles, search, selectedYear, selectedUnit, sortBy]);

  // Group by unit - ONLY show groups from selected year when year is selected
  const groupedArticles = useMemo(() => {
    if (selectedUnit || search.trim()) return null;
    const groups = new Map<string, Article[]>();
    filtered.forEach(a => {
      // Double-check year filter for grouped view
      if (selectedYear !== "All") {
        const artYear = getYearFromCategory(a.category);
        if (artYear !== selectedYear) return; // Skip articles not in selected year
      }
      const key = a.category || "Uncategorized";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries())
      .filter(([_, arts]) => arts.length > 0) // Only show non-empty groups
      .map(([cat, arts]) => ({ category: cat, name: getCategoryDisplayName(cat), articles: arts }))
      .sort((a, b) => {
        const ya = getYearNumber(a.category);
        const yb = getYearNumber(b.category);
        if (ya !== yb) return ya - yb;
        return a.name.localeCompare(b.name);
      });
  }, [filtered, selectedUnit, search, selectedYear]);

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    articles.forEach(a => {
      if (a.category === "Stories") return;
      counts.All++;
      const year = getYearFromCategory(a.category);
      if (year) counts[year] = (counts[year] || 0) + 1;
    });
    return counts;
  }, [articles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Study Notes</h1>
            <p className="text-muted-foreground text-sm">{yearCounts.All} articles across {YEARS.length - 1} years</p>
          </div>
        </div>
      </div>

      {/* Recently Read */}
      {!search.trim() && selectedYear === "All" && !selectedUnit && recentArticles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Continue Reading</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentArticles.slice(0, 3).map((ra, i) => (
              <motion.div key={ra.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/blog/${ra.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{ra.title}</p>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(ra.visitedAt)}</span>
                  </div>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className={`relative flex items-center rounded-xl border transition-all ${
          searchFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
        } bg-background`}>
          <Search className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="Search articles by title or topic…"
            className="w-full bg-transparent px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none" />
          {search && (
            <button onClick={() => setSearch("")} className="mr-3 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search.trim() && (
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            {filtered.length === 0
              ? <span className="text-destructive">No articles match "<strong>{search}</strong>"</span>
              : <><strong className="text-foreground">{filtered.length}</strong> results</>
            }
          </p>
        )}
      </div>

      {/* Year Tabs + Sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {YEARS.map(year => {
            const count = yearCounts[year] || 0;
            const active = selectedYear === year;
            return (
              <button
                key={year}
                onClick={() => { setYear(year); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {year}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "opacity-50"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "title")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground"
          aria-label="Sort articles"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="title">Sort: A–Z</option>
        </select>
      </div>

      {/* Unit filter chips (when a year is selected) */}
      {selectedYear !== "All" && unitsForYear.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setUnit(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedUnit
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Units
            </button>
            {unitsForYear.map(u => (
              <button
                key={u.category}
                onClick={() => setUnit(selectedUnit === u.category ? null : u.category)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedUnit === u.category
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {u.name} <span className="opacity-50">{u.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">No articles found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different year or search term</p>
        </div>
      ) : groupedArticles && !search.trim() ? (
        <div className="space-y-10">
          {groupedArticles.map(group => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-lg font-bold text-foreground">{group.name}</h2>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{group.articles.length}</span>
                <div className="flex-1 border-b border-border" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.articles.slice(0, 6).map(a => <ArticleCard key={a.id} article={a} />)}
              </div>
              {group.articles.length > 6 && (
                <button
                  onClick={() => setUnit(group.category)}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  View all {group.articles.length} articles →
                </button>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
