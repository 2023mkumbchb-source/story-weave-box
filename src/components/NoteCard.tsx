import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

/**
 * Enhanced grid card for the "grid" view of the notes library. Features improved
 * visual hierarchy, subtle animations, and thoughtful micro-interactions.
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

// Subject-themed color mappings for visual variety
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pathology: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
  microbiology: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  pharmacology: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  anatomy: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  physiology: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  biochemistry: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  default: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
};

function getSubjectColor(unit: string): { bg: string; text: string; border: string } {
  const lower = unit.toLowerCase();
  if (/pathol|histopath|cytopath|oncopath|neuropath/.test(lower)) return SUBJECT_COLORS.pathology;
  if (/microb|bacteriolog|virolog|mycolog|parasitolog|immunolog/.test(lower)) return SUBJECT_COLORS.microbiology;
  if (/pharmac|drug|therapeutic/.test(lower)) return SUBJECT_COLORS.pharmacology;
  if (/anatom|histolog|embryolog|dissection/.test(lower)) return SUBJECT_COLORS.anatomy;
  if (/physiol|cardio|respirat|renal/.test(lower)) return SUBJECT_COLORS.physiology;
  if (/biochem|genetic|metabol|molecular/.test(lower)) return SUBJECT_COLORS.biochemistry;
  return SUBJECT_COLORS.default;
}

export default function NoteCard({ article }: { article: Article }) {
  const location = useLocation();
  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const assessment = assessmentLabel(article);
  const date = new Date(article.updated_at || article.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const preview = (article.meta_description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 130);

  const subjectColor = getSubjectColor(unit);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Link
        to={buildBlogPath(article)}
        state={{ from: `${location.pathname}${location.search}` }}
        className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)]"
      >
        {/* Header with unit badge and arrow */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border`}>
              {unit}
            </span>
            {year && (
              <span className="text-[10px] font-medium text-muted-foreground">{year}</span>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {/* Assessment badge if present */}
        {assessment && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/80">{assessment}</p>
        )}

        {/* Title */}
        <h3 className="mt-2 line-clamp-3 font-serif text-[16px] font-bold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {cleanTitle(article.title)}
        </h3>

        {/* Preview text */}
        {preview && (
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{preview}…</p>
        )}

        {/* Footer with date */}
        <div className="mt-auto pt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Clock className="h-3 w-3" />
          <span>{date}</span>
        </div>
      </Link>
    </motion.div>
  );
}
