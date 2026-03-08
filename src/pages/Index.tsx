import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, GraduationCap, ListChecks, Loader2,
  ArrowRight, Trophy, BookMarked, Phone, MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAllCategories, getCategoryDisplayName, getYearFromCategory, YEAR_CATEGORIES } from "@/lib/store";

const YEAR_META: Record<string, { color: string; border: string }> = {
  "Year 1": { color: "text-primary", border: "border-primary/30" },
  "Year 2": { color: "text-primary", border: "border-primary/30" },
  "Year 3": { color: "text-primary", border: "border-primary/30" },
  "Year 4": { color: "text-primary", border: "border-primary/30" },
  "Year 5": { color: "text-primary", border: "border-primary/30" },
  "Year 6": { color: "text-primary", border: "border-primary/30" },
};

const NAV_ITEMS = [
  { to: "/blog", label: "Articles", icon: BookOpen },
  { to: "/flashcards", label: "Flashcards", icon: GraduationCap },
  { to: "/mcqs", label: "MCQs", icon: ListChecks },
  { to: "/exams", label: "Exams", icon: Trophy },
  { to: "/stories", label: "Stories", icon: BookMarked },
];

export default function Index() {
  const [categories, setCategories] = useState<{ name: string; articles: number; flashcards: number; mcqs: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  const yearGroups = Object.keys(YEAR_CATEGORIES).map(year => {
    const yearCats = categories.filter(c => getYearFromCategory(c.name) === year);
    const total = yearCats.reduce((sum, c) => sum + c.articles + c.flashcards + c.mcqs, 0);
    return { year, categories: yearCats, total };
  }).filter(g => g.total > 0);

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero — TeachMeAnatomy inspired dark teal header */}
      <section className="relative overflow-hidden bg-[hsl(174,62%,22%)] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(174,62%,28%)] via-[hsl(174,55%,20%)] to-[hsl(180,40%,15%)]" />
        <div className="relative mx-auto max-w-5xl px-5 py-14 sm:py-20">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold mb-3 leading-tight">
              Ompath <span className="text-[hsl(174,80%,65%)]">Study</span>
            </h1>
            <p className="text-white/70 text-base sm:text-lg max-w-xl leading-relaxed mb-8">
              Comprehensive MBChB study notes, flashcards, MCQs, and exam preparation — organized by year and unit.
            </p>

            <div className="flex flex-wrap gap-2">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all"
                >
                  <item.icon className="h-4 w-4 text-[hsl(174,80%,65%)]" />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Year sections */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="font-serif text-xl font-bold text-foreground mb-6">Browse by Year</h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : yearGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No content yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {yearGroups.map((group, i) => {
              const meta = YEAR_META[group.year] || YEAR_META["Year 1"];
              return (
                <motion.div
                  key={group.year}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    to={`/blog?year=${encodeURIComponent(group.year)}`}
                    className={`group block rounded-xl border ${meta.border} bg-card p-5 hover:shadow-md transition-all`}
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-lg font-bold font-serif ${meta.color}`}>{group.year}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-1">
                      {group.categories.slice(0, 5).map(cat => (
                        <p key={cat.name} className="text-sm text-muted-foreground truncate">
                          {getCategoryDisplayName(cat.name)}
                        </p>
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
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ompath Study
          </div>
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
