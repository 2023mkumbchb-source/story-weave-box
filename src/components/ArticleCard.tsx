import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";
import anatomyThumb from "@/assets/thumb-anatomy.jpg";
import physiologyThumb from "@/assets/thumb-physiology.jpg";
import pharmacologyThumb from "@/assets/thumb-pharmacology.jpg";
import pathologyThumb from "@/assets/thumb-pathology.jpg";

function getArticleThumbnail(article: Article): string {
  const contentImage = (article.content || "").match(/!\[[^\]]*\]\((.*?)\)/)?.[1]?.trim();
  if (contentImage) return contentImage;

  const text = `${article.category} ${article.title}`.toLowerCase();
  if (text.includes("anatom") || text.includes("histology") || text.includes("embryology")) return anatomyThumb;
  if (text.includes("physiology") || text.includes("cardio") || text.includes("respirat")) return physiologyThumb;
  if (text.includes("pharmac") || text.includes("drug")) return pharmacologyThumb;
  return pathologyThumb;
}

export default function ArticleCard({ article }: { article: Article }) {
  const preview = (article.meta_description || article.content || "")
    .replace(/!\[[^\]]*\]\((.*?)\)/g, "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/[#*_`|>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const cover = getArticleThumbnail(article);
  const createdDate = new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}`;

  return (
    <Link
      to={buildBlogPath(article)}
      state={{ from: fromPath }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)] sm:rounded-2xl"
    >
      {/* Mobile: compact row layout. Desktop: side-by-side */}
      <article className="flex gap-3 p-3 sm:grid sm:min-h-[180px] sm:gap-0 sm:p-0 md:grid-cols-[200px_1fr]">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-full sm:w-full sm:rounded-none sm:border-b sm:border-border md:border-b-0 md:border-r">
          <img
            src={cover}
            alt={`${unit || "Medical"} study illustration`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-48 md:h-full"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center sm:p-5 md:p-6">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:mb-3 sm:gap-2 sm:text-xs">
            {year && <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 sm:px-2.5 sm:py-1">{year}</span>}
            {unit && unit !== "Uncategorized" && <span className="hidden rounded-full border border-border bg-muted px-2.5 py-1 sm:inline">{unit}</span>}
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {createdDate}</span>
          </div>

          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-primary sm:font-serif sm:text-xl md:text-2xl md:leading-tight">
            {article.title}
          </h3>

          {preview && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/70 sm:mt-3 sm:line-clamp-3 sm:text-sm sm:leading-7">
              {preview}…
            </p>
          )}

          <span className="mt-2 hidden items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">
            Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}
