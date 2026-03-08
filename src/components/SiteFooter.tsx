import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Phone, MessageCircle, Download } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/year/1", label: "Year 1" },
  { to: "/year/2", label: "Year 2" },
  { to: "/year/3", label: "Year 3" },
  { to: "/year/4", label: "Year 4" },
  { to: "/year/5", label: "Year 5" },
  { to: "/year/6", label: "Year 6" },
  { to: "/stories", label: "Stories" },
  { to: "/admin", label: "Dashboard" },
];

export default function SiteFooter() {
  const location = useLocation();

  if (location.pathname === "/") return null;
  if (/^\/exams\/[^/]+\/start/.test(location.pathname)) return null;

  return (
    <footer className="mt-10 border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <a href="tel:+254115475543" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors" aria-label="Call us">
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a href="https://wa.me/254115475543" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors" aria-label="WhatsApp">
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
            <InstallAppButton />
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Ompath Study</p>
        </div>
      </div>
    </footer>
  );
}

function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  // Always show the button - on iOS/unsupported it'll guide users
  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Install app"
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </button>
  );
}
