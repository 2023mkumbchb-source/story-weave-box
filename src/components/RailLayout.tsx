import StudyPanel from "@/components/StudyPanel";

/**
 * Puts the study desk (countdown, today's classes, shortcuts, saved files…) beside a page on wide screens, so no page
 * is left with an empty margin. On phones and tablets the page is shown on its own.
 */
export default function RailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1680px] xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-5 xl:pr-5">
      <div className="min-w-0">{children}</div>
      <aside className="hidden xl:block" aria-label="Study desk">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto py-6 pr-1">
          <StudyPanel />
        </div>
      </aside>
    </div>
  );
}
