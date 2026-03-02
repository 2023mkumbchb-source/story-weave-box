import { Link, useLocation } from "react-router-dom";
import { BookOpen } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Blog" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/mcqs", label: "MCQs" },
  { to: "/admin", label: "Dashboard" },
];

export default function SiteFooter() {
  const location = useLocation();

  if (location.pathname === "/") return null;

  return (
    <footer className="mt-10 border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          Ompath Study
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Ompath Study</p>
      </div>
    </footer>
  );
}
