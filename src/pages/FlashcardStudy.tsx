import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getFlashcardSetById, getCategoryDisplayName, type FlashcardSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import FlashcardViewer from "@/components/FlashcardViewer";
import { markFlashcardVisited } from "@/lib/progress-store";
import { Helmet } from "react-helmet-async";

export default function FlashcardStudy() {
  const { id } = useParams();
  const location = useLocation();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const ogUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}${location.search}`
      : location.pathname;
  const title = set?.title
    ? `${set.title} | Flashcard Study | OmpathStudy Kenya`
    : "Flashcard Study | OmpathStudy Kenya";
  const description =
    "Study a focused flashcard set on OmpathStudy—built for Kenyan medical and health students. Review key facts quickly and retain concepts for exams.";
  const keywords =
    "OmpathStudy, flashcard study, medical flashcards Kenya, nursing flashcards Kenya, exam revision, clinical concepts, medical education Kenya";

  useEffect(() => {
    if (id) {
      getFlashcardSetById(id)
        .then((s) => {
          setSet(s);
          if (s) markFlashcardVisited(s.id);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">Set not found</h1>
        <Button asChild variant="outline">
          <Link to="/flashcards">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcards
          </Link>
        </Button>
      </div>
    );
  }

  const unitName = getCategoryDisplayName(set.category);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground">
        <Link to="/flashcards">
          <ArrowLeft className="h-4 w-4" /> Back to Flashcards
        </Link>
      </Button>
      {unitName && unitName !== "Uncategorized" && (
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            {unitName}
          </span>
        </div>
      )}
      <FlashcardViewer cards={set.cards} title={set.title} setId={set.id} />
    </div>
  );
}
