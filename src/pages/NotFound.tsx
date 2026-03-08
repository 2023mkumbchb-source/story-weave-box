import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "Page Not Found | Ompath Study";
  }, [location.pathname]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Search className="h-10 w-10" />
        </div>
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/blog">Browse Articles</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/stories">Read Stories</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
