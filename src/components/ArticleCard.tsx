import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, BookOpenText } from "lucide-react";
import { motion } from "framer-motion";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

export default function ArticleCard({ article }: { article: Article }) {
  const date = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const unitName = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const preview = (article.content || "")
    .slice(0, 140)
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 280 }}>
      <Link
        to={buildBlogPath(article)}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:[box-shadow:var(--shadow-card-hover)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-primary/40 transition-colors group-hover:bg-primary" />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {year && <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">{year}</span>}
          {unitName && unitName !== "Uncategorized" && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{unitName}</span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{article.title}</h3>

        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{date}</span>
        </div>

        {preview ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{preview}...</p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">Open note</p>
        )}

        <div className="mt-auto pt-4 text-xs font-semibold text-primary">
          <span className="inline-flex items-center gap-1">
            <BookOpenText className="h-3.5 w-3.5" />
            Read note
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
