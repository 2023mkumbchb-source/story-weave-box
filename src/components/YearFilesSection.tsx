import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, FolderOpen, Stethoscope } from "lucide-react";
import ShareButton from "@/components/ShareButton";

export type LibraryCollection = { label: string; href: string };
export type LibraryGroup = { title: string; description: string; folderHref: string; collections: LibraryCollection[] };

interface Props {
  id: string;
  eyebrow: string;
  heading: string;
  intro: string;
  allHref: string;
  allLabel: string;
  groups: LibraryGroup[];
  credit?: string;
  share?: { url: string; title: string; text: string };
}

export default function YearFilesSection({ id, eyebrow, heading, intro, allHref, allLabel, groups, credit, share }: Props) {
  return (
    <section className="mt-6" aria-labelledby={id}>
      <div className="border-b border-border pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Stethoscope className="h-4 w-4" /> {eyebrow}
            </p>
            <h2 id={id} className="mt-1 font-serif text-2xl font-bold text-foreground">{heading}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
            {credit && <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary"><BadgeCheck className="h-3.5 w-3.5" /> {credit}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {share && <ShareButton url={share.url} title={share.title} text={share.text} />}
            <Link to={allHref} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <FolderOpen className="h-4 w-4" /> {allLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border border-b border-border">
        {groups.map((group, index) => (
          <article key={group.title} className="grid gap-4 py-5 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:items-start">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <h3 className="font-serif text-xl font-bold text-foreground">{group.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{group.description}</p>
              {group.collections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label={`${group.title} collections`}>
                  {group.collections.map((collection) => (
                    <Link key={collection.href} to={collection.href} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <FolderOpen className="h-3.5 w-3.5" /> {collection.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to={group.folderHref} aria-label={`Open all ${group.title} files`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Browse &amp; download <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
