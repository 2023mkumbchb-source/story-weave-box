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
  const preview = (article.content || "")
    .replace(/!\[[^\]]*\]\((.*?)\)/g, "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/[#*_`|>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 210);

  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const cover = getArticleThumbnail(article);
  const createdDate = new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Link
      to={buildBlogPath(article)}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)]"
    >
      <article className="grid min-h-[200px] gap-0 md:grid-cols-[240px_1fr]">
        <div className="relative overflow-hidden border-b border-border bg-muted md:border-b-0 md:border-r">
          <img
            src={cover}
            alt={`${unit || "Medical"} study illustration`}
            loading="lazy"
            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] md:h-full"
          />
        </div>

        <div className="min-w-0 p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            {year && <span className="rounded-full border border-border bg-muted px-2.5 py-1">{year}</span>}
            {unit && unit !== "Uncategorized" && <span className="rounded-full border border-border bg-muted px-2.5 py-1">{unit}</span>}
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {createdDate}</span>
          </div>

          <h3 className="font-serif text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary md:text-[2rem]">
            {article.title}
          </h3>

          {preview && (
            <p className="mt-3 line-clamp-3 text-base leading-8 text-foreground/80 md:line-clamp-4">
              {preview}…
            </p>
          )}

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}
