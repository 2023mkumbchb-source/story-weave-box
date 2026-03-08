import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, Menu, X, BookMarked } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

const links = [
  { to: "/stories", label: "Stories", icon: BookMarked },
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
];

const YEAR_OPTIONS = ["All", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
const STORAGE_KEY = "nav_year_filter";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<string>(() => sessionStorage.getItem(STORAGE_KEY) || "All");

  const isExamPage = /^\/exams\/[^/]+\/start/.test(location.pathname);

  useEffect(() => {
    const qpYear = new URLSearchParams(location.search).get("year");
    if (qpYear && YEAR_OPTIONS.includes(qpYear)) {
      setYear(qpYear);
      sessionStorage.setItem(STORAGE_KEY, qpYear);
      return;
    }

    const yearRoute = location.pathname.match(/^\/year\/(\d)$/);
    if (yearRoute) {
      const yr = `Year ${yearRoute[1]}`;
      if (YEAR_OPTIONS.includes(yr)) {
        setYear(yr);
        sessionStorage.setItem(STORAGE_KEY, yr);
      }
    }
  }, [location.pathname, location.search]);

  const setYearRoute = (nextYear: string) => {
    setYear(nextYear);
    sessionStorage.setItem(STORAGE_KEY, nextYear);
    setOpen(false);

    if (nextYear === "All") {
      navigate("/");
      return;
    }

    const yearNum = nextYear.replace("Year ", "");
    navigate(`/year/${yearNum}`);
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const currentYearLabel = useMemo(() => (year === "All" ? "Years" : year), [year]);

  if (isExamPage) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          Ompath Study
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currentYearLabel}</label>
          <select
            value={year}
            onChange={(e) => setYearRoute(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground"
            aria-label="Select study year"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-2 p-4">
              <select
                value={year}
                onChange={(e) => setYearRoute(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                aria-label="Select study year"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(l.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
