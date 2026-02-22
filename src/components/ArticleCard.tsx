import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { Article } from "@/lib/store";
import { getCategoryDisplayName } from "@/lib/store";

export default function ArticleCard({ article }: { article: Article }) {
  const preview = article.content.slice(0, 150).replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim() + "...";
  const date = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const unitName = getCategoryDisplayName(article.category);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link
        to={`/blog/${article.id}`}
        className="group block rounded-xl border border-border bg-card p-6 transition-shadow hover:[box-shadow:var(--shadow-card-hover)] h-full"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {unitName && unitName !== "Uncategorized" && (
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            {unitName}
          </span>
        )}
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {date}
        </div>
        <h3 className="mb-2 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{preview}</p>
      </Link>
    </motion.div>
  );
}
