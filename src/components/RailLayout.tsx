import StudyPanel from "@/components/StudyPanel";

/**
 * Puts the study desk beside a page on wide screens. The desk flows with the page (no inner scroll box),
 * so it is never cut off. On phones and tablets the page is shown on its own.
 */
export default function RailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1680px] xl:grid xl:grid-cols-[minmax(0,1fr)_310px] xl:gap-6 xl:pr-6">
      <div className="min-w-0">{children}</div>
      <aside className="hidden xl:block" aria-label="Study desk">
        <div className="py-6">
          <StudyPanel />
        </div>
      </aside>
    </div>
  );
}
