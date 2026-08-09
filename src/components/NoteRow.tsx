import { Link, useLocation } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

/**
 * Dense, quiet index row with enhanced visual polish. No colour rails, just a
 * numbered title with muted metadata and subtle hover effects.
 */
/** Strip markdown/HTML entity noise from list titles (e.g. "CAT 1&amp;2"). */
function cleanTitle(t: string): string {
  return (t || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:#39|apos|rsquo|lsquo);/g, "\u2019")
    .replace(/&(?:quot|ldquo|rdquo);/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function assessmentLabel(article: Article): string {
  const tags = article.tags || [];
  const assessment = tags.find((tag) => /^(CAT\s*\d+|End[- ]of[- ]Semester|End[- ]of[- ]Year|Paper\s*(I|II|III|\d+)|Final Exam)$/i.test(tag));
  const semester = tags.find((tag) => /^Semester\s*[1-3]$/i.test(tag));
  return [semester, assessment].filter(Boolean).join(" / ");
}

export default function NoteRow({ article, index }: { article: Article; index?: number }) {
  const location = useLocation();
  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const assessment = assessmentLabel(article);
  const date = new Date(article.updated_at || article.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      to={buildBlogPath(article)}
      state={{ from: `${location.pathname}${location.search}` }}
      className="row-cv group flex items-center gap-3 border-b border-border/70 bg-card px-4 py-3.5 transition-all duration-200 last:border-b-0 hover:bg-muted/50 hover:shadow-sm sm:gap-4 sm:px-5"
    >
      {typeof index === "number" && (
        <span className="w-6 shrink-0 text-right font-serif text-[13px] tabular-nums text-muted-foreground/50 group-hover:text-primary/60 transition-colors">
          {index + 1}
        </span>
      )}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary sm:text-[16px]">
          {cleanTitle(article.title)}
        </h3>
        {assessment && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">{assessment}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
          <span className="truncate">{unit}</span>
          {year && <span className="hidden sm:inline">· {year}</span>}
          <span>· {date}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
    </Link>
  );
}
