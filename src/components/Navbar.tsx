import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, FileText, GraduationCap, LayoutDashboard, ListChecks, Menu, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import ompathLogo from "@/assets/ompath-logo.png";

const links = [
  { to: "/", label: "Home" },
  { to: "/stories", label: "Stories" },
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
  // /year/3
  const yearRoute = pathname.match(/^\/year\/(\d)$/);
  if (yearRoute) return Number(yearRoute[1]);
  // /blog?year=Year%203  or /mcqs?year=Year%202
  const qp = new URLSearchParams(search).get("year");
  if (qp) {
    const m = qp.match(/Year\s(\d)/);
    if (m) return Number(m[1]);
  }
  // Check sessionStorage
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
  const [open, setOpen] = useState(false);

  const isExamPage = /^\/exams\/[^/]+\/start/.test(location.pathname);

  const activeYear = useMemo(
    () => getActiveYear(location.pathname, location.search),
    [location.pathname, location.search]
  );

  // Keep sessionStorage in sync
  useEffect(() => {
    if (activeYear) {
      sessionStorage.setItem(STORAGE_KEY, `Year ${activeYear}`);
    }
  }, [activeYear]);

  const selectYear = (yr: number | null) => {
    setOpen(false);
    if (!yr) {
      sessionStorage.setItem(STORAGE_KEY, "All");
      navigate("/");
    } else {
      sessionStorage.setItem(STORAGE_KEY, `Year ${yr}`);
      navigate(`/year/${yr}`);
    }
  };

  // Determine which sub-section is active based on pathname
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
    <nav className="sticky top-0 z-40 border-b border-border bg-[hsl(174,62%,22%)] text-white">
      {/* ── Primary bar ── */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white/10 p-1">
            <img src={ompathLogo} alt="Ompath Study logo" className="h-full w-full object-contain" loading="lazy" />
          </div>
          <span className="font-serif">Ompath Study</span>
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
          <button className="text-white" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Secondary bar: Year sub-navigation (shows when a year is active) ── */}
      <AnimatePresence>
        {activeYear && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/10 bg-[hsl(174,62%,18%)]"
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

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {/* Year grid */}
              <p className="mb-1 text-xs font-bold text-white/50">Select Year</p>
              <div className="mb-2 grid grid-cols-6 gap-1">
                {YEAR_OPTIONS.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => selectYear(activeYear === yr ? null : yr)}
                    className={`rounded-lg py-2 text-sm font-bold transition-all ${
                      activeYear === yr
                        ? "bg-white text-[hsl(174,62%,22%)] shadow"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              {/* Year sections if year active */}
              {activeYear && (
                <div className="mb-2 grid grid-cols-2 gap-1.5">
                  {YEAR_SECTIONS.map((s) => {
                    const to = `/${s.path}?year=${encodeURIComponent(`Year ${activeYear}`)}`;
                    const active = activeSection === s.path;
                    return (
                      <Link
                        key={s.path}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                        }`}
                      >
                        <s.icon className="h-4 w-4" />
                        {s.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-white/10 pt-2">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2.5 text-sm font-medium ${
                      isActive(l.to) ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
