import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Article } from "@/lib/store";
import { buildBlogPath, getCategoryDisplayName } from "@/lib/store";

export default function ArticleCard({ article }: { article: Article }) {
  const preview = (article.content || "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/[#*_`|>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return (
    <Link
      to={buildBlogPath(article)}
      className="group block border-b border-border py-4 first:pt-0 last:border-0 transition-colors hover:bg-muted/30 -mx-3 px-3 rounded-lg"
    >
      <h3 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors mb-1">
        {article.title}
      </h3>
      {preview && (
        <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">{preview}…</p>
      )}
      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Read article <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
