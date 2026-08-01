import { BookOpen } from "lucide-react";
import { useTopicThumbnail } from "@/lib/topicThumbnail";

/**
 * Quiet unit tile. Instead of a coloured gradient block it uses a real topic
 * photograph sourced from Wikipedia (free, no generation) with a neutral
 * placeholder while it resolves, plus a plain label slab underneath.
 */
export default function UnitTile({
  title,
  count,
  active,
  onClick,
  hint,
}: {
  title: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  hint?: string;
}) {
  const cover = useTopicThumbnail(title, undefined, true, title);
  return (
    <button
      onClick={onClick}
      className={`group overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/50 ${
        active ? "border-primary ring-1 ring-primary/25" : "border-border"
      }`}
    >
      <span className="relative block h-20 w-full overflow-hidden bg-muted sm:h-24">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover grayscale-[35%] transition-transform duration-500 group-hover:scale-[1.04] group-hover:grayscale-0"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <BookOpen className="h-5 w-5" />
          </span>
        )}
      </span>
      <span className="block px-3 py-2.5">
        <span className="block truncate text-[13px] font-semibold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-sm">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {hint ?? (count != null ? `${count} ${count === 1 ? "note" : "notes"}` : "")}
        </span>
      </span>
    </button>
  );
}