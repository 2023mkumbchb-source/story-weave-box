import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { Article } from "@/lib/store";
import { getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

const YEAR_BADGE_COLORS: Record<string, string> = {
  "Year 1": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Year 2": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Year 3": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Year 4": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Year 5": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function ArticleCard({ article }: { article: Article }) {
  const preview = article.content.slice(0, 150).replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim() + "...";
  const date = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const unitName = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link
        to={`/blog/${article.id}`}
        className="group block rounded-xl border border-border bg-card p-5 transition-shadow hover:[box-shadow:var(--shadow-card-hover)] h-full"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {year && (
            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${YEAR_BADGE_COLORS[year] || "bg-muted text-muted-foreground"}`}>
              {year}
            </span>
          )}
          {unitName && unitName !== "Uncategorized" && (
            <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {unitName}
            </span>
          )}
        </div>
        <h3 className="mb-2 text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 mb-3">{preview}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {date}
        </div>
      </Link>
    </motion.div>
  );
}
