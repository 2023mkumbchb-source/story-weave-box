import { Link } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";
import anatomyThumb from "@/assets/thumb-anatomy.jpg";
import physiologyThumb from "@/assets/thumb-physiology.jpg";
import pharmacologyThumb from "@/assets/thumb-pharmacology.jpg";
import pathologyThumb from "@/assets/thumb-pathology.jpg";

function getArticleThumbnail(article: Article): string {
  const text = `${article.category} ${article.title}`.toLowerCase();
  if (text.includes("anatom") || text.includes("histology") || text.includes("embryology")) return anatomyThumb;
  if (text.includes("physiology") || text.includes("cardio") || text.includes("respirat")) return physiologyThumb;
  if (text.includes("pharmac") || text.includes("drug")) return pharmacologyThumb;
  return pathologyThumb;
}

export default function ArticleCard({ article }: { article: Article }) {
  const preview = (article.content || "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/[#*_`|>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 165);

  const unit = getCategoryDisplayName(article.category);
  const year = getYearFromCategory(article.category);
  const cover = getArticleThumbnail(article);
  const createdDate = new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Link
      to={buildBlogPath(article)}
      className="group block rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)]"
    >
      <article className="grid gap-3 sm:grid-cols-[160px_1fr] sm:gap-4">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={cover}
            alt={`${unit || "Medical"} study illustration`}
            loading="lazy"
            className="h-28 w-full object-cover sm:h-full"
          />
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {year && <span className="rounded-full bg-muted px-2 py-0.5">{year}</span>}
            {unit && unit !== "Uncategorized" && <span className="rounded-full bg-muted px-2 py-0.5">{unit}</span>}
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {createdDate}</span>
          </div>

          <h3 className="font-serif text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
            {article.title}
          </h3>

          {preview && (
            <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground sm:line-clamp-3">
              {preview}…
            </p>
          )}

          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

