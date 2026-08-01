import { getSubjectKey, subjectColor } from "@/components/subjectTheme";

/**
 * Colour-block tile with a solid label slab — the Geeky Medics "Explore our
 * resources" pattern, which is what makes a long unit list feel browsable
 * instead of like a database dump.
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
  const subject = getSubjectKey(title);
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
        active ? "border-primary ring-2 ring-primary/25" : "border-border"
      }`}
    >
      <span
        className="block h-16 w-full transition-transform duration-500 group-hover:scale-105 sm:h-20"
        style={{
          background: `linear-gradient(135deg, ${subjectColor(subject, 0.95)} 0%, ${subjectColor(subject, 0.6)} 100%)`,
        }}
        aria-hidden
      />
      <span className="block bg-card px-3 py-2.5">
        <span className="block truncate text-[13px] font-bold leading-tight text-foreground sm:text-sm">{title}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {hint ?? (count != null ? `${count} ${count === 1 ? "note" : "notes"}` : "")}
        </span>
      </span>
    </button>
  );
}