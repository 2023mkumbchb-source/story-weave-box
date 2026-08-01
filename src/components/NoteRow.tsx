import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";
import { getSubjectKey, subjectColor } from "@/components/subjectTheme";

/**
 * Dense index row — the AMBOSS / TeachMeAnatomy library pattern. Big picture
 * cards don't scale to the 100+ notes a single Year-3 semester holds, so lists
 * use a compact row (colour-coded left rail + one-line title + meta) and the
 * imagery moves up to the section tiles.
 */
export default function NoteRow({ article, index }: { article: Article; index?: number }) {
  const location = useLocation();
  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const subject = getSubjectKey(`${article.category} ${article.title}`);
  const date = new Date(article.updated_at || article.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      to={buildBlogPath(article)}
      state={{ from: `${location.pathname}${location.search}` }}
      className="group relative flex items-center gap-3 border-b border-border bg-card px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/50 sm:gap-4 sm:px-4"
    >
      <span
        className="absolute left-0 top-0 h-full w-[3px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: subjectColor(subject) }}
        aria-hidden
      />
      {typeof index === "number" && (
        <span className="hidden w-6 shrink-0 text-right font-serif text-sm text-muted-foreground/70 sm:block">
          {index + 1}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-base">
          {article.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide"
            style={{ color: subjectColor(subject) }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: subjectColor(subject) }} />
            {unit}
          </span>
          {year && <span className="hidden sm:inline">· {year}</span>}
          <span>· {date}</span>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}