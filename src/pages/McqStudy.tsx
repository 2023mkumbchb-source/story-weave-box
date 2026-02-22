import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getMcqSetById, getCategoryDisplayName, type McqSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import McqViewer from "@/components/McqViewer";
import { markMcqVisited } from "@/lib/progress-store";

export default function McqStudy() {
  const { id } = useParams();
  const [set, setSet] = useState<McqSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getMcqSetById(id)
        .then((s) => {
          setSet(s);
          if (s) markMcqVisited(s.id);
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
        <h1 className="mb-4 font-display text-3xl font-bold text-foreground">Set not found</h1>
        <Button asChild variant="outline">
          <Link to="/mcqs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to MCQs
          </Link>
        </Button>
      </div>
    );
  }

  const unitName = getCategoryDisplayName(set.category);

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-6 py-10 sm:py-12 pb-20">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground -ml-1">
        <Link to="/mcqs">
          <ArrowLeft className="h-4 w-4" /> Back to MCQs
        </Link>
      </Button>
      {unitName && unitName !== "Uncategorized" && (
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            {unitName}
          </span>
        </div>
      )}
      <McqViewer
        questions={set.questions}
        title={set.title}
        setId={set.id}
        category={set.category}
      />
    </div>
  );
}
