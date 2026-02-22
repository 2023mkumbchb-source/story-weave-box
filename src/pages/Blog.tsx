import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X, Loader2, BookOpen, Clock, ArrowRight } from "lucide-react";
import { getPublishedArticles, getCategories, getCategoryDisplayName, type Article } from "@/lib/store";
import ArticleCard from "@/components/ArticleCard";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";
import CategoryTabs from "@/components/CategoryTabs";
import { motion } from "framer-motion";

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
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const selectedCategory = searchParams.get("category");

  useEffect(() => {
    Promise.all([getPublishedArticles(), getCategories()]).then(([a, c]) => {
      setArticles(a);
      setCategories(c);
    }).finally(() => setLoading(false));
    setRecentArticles(getRecentArticles());
  }, []);

  const setSelectedCategory = (cat: string | null) => {
    if (cat) setSearchParams({ category: cat });
    else setSearchParams({});
  };

  const filtered = useMemo(() => articles.filter((a) => {
    const matchesSearch = !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      getCategoryDisplayName(a.category).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [articles, search, selectedCategory]);

  const categoryNames = categories.map((c) => c.name);
  const categoryCounts = Object.fromEntries(categories.map((c) => [c.name, c.count]));
  const isSearching = search.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6 py-10 sm:py-12">
      <div className="mb-7">
        <h1 className="mb-1 font-display text-3xl sm:text-4xl font-bold text-foreground">Articles</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Study articles generated from notes</p>
      </div>

      {!isSearching && !selectedCategory && recentArticles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recently Read</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentArticles.slice(0, 5).map((ra, i) => (
              <motion.div key={ra.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/blog/${ra.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{ra.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {ra.category && ra.category !== "Uncategorized" && (
                        <span className="text-[10px] text-primary/70 font-medium">{getCategoryDisplayName(ra.category)}</span>
                      )}
                      {ra.category && ra.category !== "Uncategorized" && (
                        <span className="text-[10px] text-muted-foreground">·</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgo(ra.visitedAt)}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
        {isSearching && (
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            {filtered.length === 0
              ? <span className="text-destructive">No articles match "<strong>{search}</strong>"</span>
              : <><strong className="text-foreground">{filtered.length}</strong> of {articles.length} articles match</>
            }
          </p>
        )}
      </div>

      <CategoryTabs
        categories={categoryNames}
        counts={categoryCounts}
        totalCount={articles.length}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">
            {articles.length === 0 ? "No articles yet" : "No articles match your search"}
          </p>
          {articles.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Create some from the dashboard!</p>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
