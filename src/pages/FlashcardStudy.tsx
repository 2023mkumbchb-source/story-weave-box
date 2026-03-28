import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getFlashcardSetById, getCategoryDisplayName, type FlashcardSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import FlashcardViewer from "@/components/FlashcardViewer";
import { markFlashcardVisited } from "@/lib/progress-store";
import { updateMetaTags } from "@/lib/seo";

export default function FlashcardStudy() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [set, setSet] = useState<FlashcardSet | null>(null);

  useEffect(() => {
    if (id) {
      getFlashcardSetById(id)
        .then((s) => {
          setSet(s);
          if (s) {
            markFlashcardVisited(s.id);
            updateMetaTags({
              title: `${s.title} – Flashcards | OMPATH`,
              description: `Study ${s.title} flashcards on OMPATH. Interactive medical study cards for health students in Kenya.`,
            });
          }
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

