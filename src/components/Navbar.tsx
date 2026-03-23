import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, FileText, GraduationCap, Home, LayoutDashboard, ListChecks, Menu, BookOpenCheck, Trophy, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "./ThemeToggle";
import ompathLogo from "@/assets/ompath-logo.png";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/stories", label: "Stories", icon: BookOpenCheck },
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
];

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const STORAGE_KEY = "nav_year_filter";

const YEAR_SECTIONS = [
  { label: "Blog", path: "blog", icon: BookOpen },
  { label: "Flashcards", path: "flashcards", icon: GraduationCap },
  { label: "MCQs", path: "mcqs", icon: ListChecks },
  { label: "Essays", path: "essays", icon: FileText },
  { label: "Exams", path: "exams", icon: Trophy },
];

function getActiveYear(pathname: string, search: string): number | null {
  const yearRoute = pathname.match(/^\/year\/(\d)$/);
  if (yearRoute) return Number(yearRoute[1]);
  const qp = new URLSearchParams(search).get("year");
  if (qp) {
    const m = qp.match(/Year\s(\d)/);
    if (m) return Number(m[1]);
  }
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored && stored !== "All") {
    const m = stored.match(/Year\s(\d)/);
    if (m) return Number(m[1]);
  }
  return null;
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const isExamPage = /^\/exams\/[^/]+\/start/.test(location.pathname);

  const activeYear = useMemo(
    () => getActiveYear(location.pathname, location.search),
    [location.pathname, location.search]
  );

  // Sync expanded year in sidebar with active year
  useEffect(() => {
    if (activeYear) setExpandedYear(activeYear);
  }, [activeYear]);

  useEffect(() => {
    if (activeYear) {
      sessionStorage.setItem(STORAGE_KEY, `Year ${activeYear}`);
    }
  }, [activeYear]);

  const selectYear = (yr: number | null) => {
    if (!yr) {
      sessionStorage.setItem(STORAGE_KEY, "All");
      navigate("/");
    } else {
      sessionStorage.setItem(STORAGE_KEY, `Year ${yr}`);
      navigate(`/year/${yr}`);
    }
  };

  const activeSection = useMemo(() => {
    for (const s of YEAR_SECTIONS) {
      if (location.pathname.startsWith(`/${s.path}`)) return s.path;
    }
    if (location.pathname.match(/^\/blog\//)) return "blog";
    return null;
  }, [location.pathname]);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  if (isExamPage) return null;

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-[hsl(174,62%,22%)] text-white">
        {/* ── Primary bar ── */}
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white/10 p-1">
              <img src={ompathLogo} alt="OMPATH logo" className="h-full w-full object-contain" loading="lazy" />
            </div>
            <span className="font-serif">OMPATH</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {/* Year pills */}
            <div className="mr-2 flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
              {YEAR_OPTIONS.map((yr) => (
                <button
                  key={yr}
                  onClick={() => selectYear(activeYear === yr ? null : yr)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeYear === yr
                      ? "bg-white text-[hsl(174,62%,22%)] shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Y{yr}
                </button>
              ))}
            </div>

            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(l.to) ? "bg-white/20" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <button className="text-white p-1">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[hsl(174,62%,16%)] border-r-0 p-0 text-white [&>button]:text-white">
                {/* Sidebar header */}
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white/10 p-1">
                    <img src={ompathLogo} alt="OMPATH logo" className="h-full w-full object-contain" />
                  </div>
                  <span className="font-serif text-lg font-bold">OMPATH</span>
                </div>

                {/* Sidebar content */}
                <div className="flex flex-col overflow-y-auto h-[calc(100%-65px)]">
                  {/* Quick links */}
                  <div className="border-b border-white/10 px-3 py-3">
                    {links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive(l.to)
                            ? "bg-white/15 text-white"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <l.icon className="h-4 w-4" />
                        {l.label}
                      </Link>
                    ))}
                  </div>

                  {/* Year sections */}
                  <div className="px-3 py-3">
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">Academic Years</p>
                    {YEAR_OPTIONS.map((yr) => {
                      const isExpanded = expandedYear === yr;
                      const isYearActive = activeYear === yr;
                      return (
                        <div key={yr} className="mb-1">
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedYear(null);
                              } else {
                                setExpandedYear(yr);
                                selectYear(yr);
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                              isYearActive
                                ? "bg-white/15 text-white"
                                : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            <span>Year {yr}</span>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-3 border-l border-white/10 pl-3 py-1">
                                  {YEAR_SECTIONS.map((s) => {
                                    const to = `/${s.path}?year=${encodeURIComponent(`Year ${yr}`)}`;
                                    const active = activeSection === s.path && activeYear === yr;
                                    return (
                                      <Link
                                        key={s.path}
                                        to={to}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                                          active
                                            ? "bg-white/15 text-white"
                                            : "text-white/60 hover:text-white hover:bg-white/10"
                                        }`}
                                      >
                                        <s.icon className="h-3.5 w-3.5" />
                                        {s.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* ── Secondary bar: desktop only ── */}
        <AnimatePresence>
          {activeYear && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden md:block overflow-hidden border-t border-white/10 bg-[hsl(174,62%,18%)]"
            >
              <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6" style={{ scrollbarWidth: "none" }}>
                <span className="mr-2 shrink-0 text-xs font-bold text-white/50">Year {activeYear}</span>
                {YEAR_SECTIONS.map((s) => {
                  const to = `/${s.path}?year=${encodeURIComponent(`Year ${activeYear}`)}`;
                  const active = activeSection === s.path;
                  return (
                    <Link
                      key={s.path}
                      to={to}
                      className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-white/20 text-white"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <s.icon className="h-3.5 w-3.5" />
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
