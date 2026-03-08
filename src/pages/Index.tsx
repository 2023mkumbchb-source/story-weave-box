import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, GraduationCap, ListChecks, Loader2,
  Stethoscope, ArrowRight, Sparkles, Phone,
  MessageCircle, Heart, Trophy, BookMarked,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAllCategories, getCategoryDisplayName, getYearFromCategory, YEAR_CATEGORIES } from "@/lib/store";

const YEAR_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  "Year 1": { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", accent: "from-emerald-600 to-emerald-500" },
  "Year 2": { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", accent: "from-blue-600 to-blue-500" },
  "Year 3": { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", accent: "from-purple-600 to-purple-500" },
  "Year 4": { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", accent: "from-orange-600 to-orange-500" },
  "Year 5": { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", accent: "from-rose-600 to-rose-500" },
};

const NAV_ITEMS = [
  { to: "/blog", label: "Articles", icon: BookOpen, desc: "Study notes" },
  { to: "/flashcards", label: "Flashcards", icon: GraduationCap, desc: "Quick review" },
  { to: "/mcqs", label: "MCQs", icon: ListChecks, desc: "Test yourself" },
  { to: "/exams", label: "Exams", icon: Trophy, desc: "Mock exams" },
  { to: "/stories", label: "Stories", icon: BookMarked, desc: "Creative writing" },
];

export default function Index() {
  const [categories, setCategories] = useState<{ name: string; articles: number; flashcards: number; mcqs: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  // Group categories by year
  const yearGroups = Object.keys(YEAR_CATEGORIES).map(year => {
    const yearCats = categories.filter(c => getYearFromCategory(c.name) === year);
    const total = yearCats.reduce((sum, c) => sum + c.articles + c.flashcards + c.mcqs, 0);
    return { year, categories: yearCats, total };
  }).filter(g => g.total > 0);

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 mb-5">
              <Stethoscope className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">MBChB Study Platform</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground mb-2 leading-tight">
              MedLife <span className="text-primary">Echo's</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
              Comprehensive medical study notes, flashcards, MCQs, and exam preparation — organized by year and unit.
            </p>
          </motion.div>

          {/* Quick nav */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-wrap gap-2.5"
          >
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <item.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Year sections */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="font-display text-xl font-bold text-foreground">Browse by Year</h2>
          <div className="flex-1 border-b border-border" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : yearGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No content yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {yearGroups.map((group, i) => {
              const colors = YEAR_COLORS[group.year] || YEAR_COLORS["Year 1"];
              return (
                <motion.div
                  key={group.year}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/blog?year=${encodeURIComponent(group.year)}`}
                    className={`group block rounded-2xl border ${colors.border} ${colors.bg} p-5 hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-2xl font-bold font-display ${colors.text}`}>{group.year}</span>
                      <ArrowRight className={`h-5 w-5 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className="space-y-1.5">
                      {group.categories.slice(0, 4).map(cat => (
                        <p key={cat.name} className="text-sm text-foreground/80 truncate">
                          {getCategoryDisplayName(cat.name)}
                          <span className="ml-1.5 text-xs text-muted-foreground">({cat.articles})</span>
                        </p>
                      ))}
                      {group.categories.length > 4 && (
                        <p className="text-xs text-muted-foreground">+{group.categories.length - 4} more units</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">{group.total} items total</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display font-bold text-foreground">MedLife Echo's</p>
                <p className="text-xs text-muted-foreground">Medical Study Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">Abongo Davis</span>
                <span className="text-xs text-muted-foreground">MBChB</span>
              </div>
              <div className="flex gap-2">
                <a href="tel:+254115475543"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Phone className="h-4 w-4" />
                </a>
                <a href="https://wa.me/254115475543" target="_blank" rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            Built with <Heart className="h-3 w-3 text-primary fill-primary" /> for medical students · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
