import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

/**
 * Dense, quiet index row. No colour rails, no per-subject tint — just a numbered
 * title with muted metadata, so a 120-note semester reads like a table of
 * contents instead of a colour chart.
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
      className="group flex items-baseline gap-3 border-b border-border/70 bg-card px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/40 sm:gap-4 sm:px-5"
    >
      {typeof index === "number" && (
        <span className="w-6 shrink-0 text-right font-serif text-[13px] tabular-nums text-muted-foreground/60">
          {index + 1}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-[16px]">
          {cleanTitle(article.title)}
        </h3>
        {assessment && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">{assessment}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
          <span className="truncate">{unit}</span>
          {year && <span className="hidden sm:inline">· {year}</span>}
          <span>· {date}</span>
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 self-center text-muted-foreground/40 transition-colors group-hover:text-primary" />
    </Link>
  );
}
