import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryDisplayName } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

interface Essay {
  id: string;
  title: string;
  category: string;
  short_answer_questions: { question: string; answer: string }[];
  long_answer_questions: { question: string; answer: string }[];
  article_id: string | null;
}

export default function EssayStudy() {
  const { id } = useParams();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSaq, setOpenSaq] = useState<Set<number>>(new Set());
  const [openLaq, setOpenLaq] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      supabase
        .from("essays")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          setEssay(data as unknown as Essay | null);
          setLoading(false);
        });
    }
  }, [id]);

  const toggleSaq = (i: number) => {
    setOpenSaq((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const toggleLaq = (i: number) => {
    setOpenLaq((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!essay) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">Essay not found</h1>
        <Button asChild variant="outline"><Link to="/essays"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 pb-20">
      <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-1 mb-4">
        <Link to="/essays"><ArrowLeft className="h-4 w-4" /> Back to Essays</Link>
      </Button>

      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">{essay.title}</h1>
        {essay.category !== "Uncategorized" && (
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {getCategoryDisplayName(essay.category)}
          </span>
        )}
        {essay.article_id && (
          <Link to={`/blog/${essay.article_id}`} className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <BookOpen className="h-3 w-3" /> View Article
          </Link>
        )}
      </div>

      {/* SAQs */}
      {essay.short_answer_questions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Short Answer Questions ({essay.short_answer_questions.length})
          </h2>
          <div className="space-y-2">
            {essay.short_answer_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => toggleSaq(i)} className="w-full flex items-start justify-between gap-3 p-4 text-left">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <p className="text-sm font-medium text-foreground break-words">{q.question}</p>
                  </div>
                  {openSaq.has(i) ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                </button>
                <AnimatePresence>
                  {openSaq.has(i) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pl-12">
                        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LAQs */}
      {essay.long_answer_questions.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" /> Long Answer Questions ({essay.long_answer_questions.length})
          </h2>
          <div className="space-y-2">
            {essay.long_answer_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => toggleLaq(i)} className="w-full flex items-start justify-between gap-3 p-4 text-left">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent-foreground">{i + 1}</span>
                    <p className="text-sm font-medium text-foreground break-words">{q.question}</p>
                  </div>
                  {openLaq.has(i) ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                </button>
                <AnimatePresence>
                  {openLaq.has(i) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pl-12">
                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
