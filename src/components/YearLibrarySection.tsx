import { useEffect, useState } from "react";
import registry from "@/data/libraries.json";
import { SITE_URL } from "@/lib/seo";
import { countFiles, folderMeta, libraryPath } from "@/lib/libraryMeta";
import YearFilesSection, { type LibraryGroup } from "@/components/YearFilesSection";
import { Skeleton } from "@/components/ui/skeleton";
import { loadLibrary } from "@/lib/libraryData";

interface Node { n: string; s: string; d?: Node[]; f?: unknown[] }

/** The course-work library for a year: always the first section on that year's page. */
export default function YearLibrarySection({ year }: { year: number }) {
  const def = registry.libraries.find((l) => l.year === year);
  const [roots, setRoots] = useState<Node[] | null>(null);

  useEffect(() => {
    if (!def) return;
    let cancelled = false;
    loadLibrary(def.dataFile)
      .then((lib) => { if (!cancelled && lib) setRoots(lib.d as Node[]); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [def]);

  if (!def) return null;
  if (!roots) return <div className="mt-6 space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;

  const total = roots.reduce((s, n) => s + countFiles(n as never), 0);
  const groups: LibraryGroup[] = roots.map((subject) => {
    const n = countFiles(subject as never);
    const kinds = (subject.d ?? []).map((c) => c.n.toLowerCase());
    return {
      title: subject.n,
      description: `${n.toLocaleString()} file${n === 1 ? "" : "s"}${kinds.length ? ` · ${kinds.join(", ")}` : ""}.`,
      folderHref: libraryPath(def, [subject.s]),
      collections: (subject.d ?? []).map((c) => ({ label: `${c.n} (${countFiles(c as never)})`, href: libraryPath(def, [subject.s, c.s]) })),
    };
  });
  const meta = folderMeta(registry, def, [], total);

  return (
    <YearFilesSection
      id={`year-${year}-library`}
      eyebrow="Course work library"
      heading={`${def.label} study files`}
      intro={`${def.tagline}. Open a ${def.rootLabel === "departments" ? "department" : "subject"} for textbooks, lecture slides, notes and past papers — read them here or download them.`}
      allHref={libraryPath(def)}
      allLabel={`All ${def.label} files (${total.toLocaleString()})`}
      groups={groups}
      credit={registry.credit}
      share={{ url: `${SITE_URL}${libraryPath(def)}`, title: meta.title, text: meta.shareText }}
    />
  );
}
