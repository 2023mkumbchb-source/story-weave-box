import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Calendar, Layers, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { getPublishedFlashcardSets, getCategoryDisplayName, type FlashcardSet } from "@/lib/store";
import { getVisitedFlashcardIds } from "@/lib/progress-store";
import CategoryTabs from "@/components/CategoryTabs";

export default function Flashcards() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPublishedFlashcardSets().then(setSets).finally(() => setLoading(false));
    setVisitedIds(getVisitedFlashcardIds());
  }, []);

  const categories = useMemo(
    () => [...new Set(sets.map((s) => s.category).filter((c) => c && c !== "Uncategorized"))],
    [sets]
  );
  const categoryCounts = useMemo(
    () => Object.fromEntries(categories.map((c) => [c, sets.filter((s) => s.category === c).length])),
    [categories, sets]
  );

  const filtered = selectedCategory ? sets.filter((s) => s.category === selectedCategory) : sets;

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
        <h1 className="mb-1 font-display text-3xl sm:text-4xl font-bold text-foreground">Flashcards</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Interactive study sets generated from notes</p>
      </div>

      <CategoryTabs
        categories={categories}
        counts={categoryCounts}
        totalCount={sets.length}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <GraduationCap className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No flashcard sets yet. Create some from the dashboard!</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/flashcards/${s.id}`}
                className="group relative block rounded-xl border border-border bg-card p-6 transition-shadow hover:[box-shadow:var(--shadow-card-hover)] h-full"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {visitedIds.has(s.id) && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <RotateCcw className="h-2.5 w-2.5" />
                      Continue
                    </span>
                  </div>
                )}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <Layers className="h-5 w-5" />
                </div>
                {s.category && s.category !== "Uncategorized" && (
                  <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {getCategoryDisplayName(s.category)}
                  </span>
                )}
                <h3 className="mb-2 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {s.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {s.cards.length} cards</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
