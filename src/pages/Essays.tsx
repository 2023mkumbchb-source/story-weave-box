import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryDisplayName } from "@/lib/store";

interface Essay {
  id: string;
  title: string;
  category: string;
  short_answer_questions: { question: string; answer: string }[];
  long_answer_questions: { question: string; answer: string }[];
  created_at: string;
  article_id: string | null;
}

export default function Essays() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("essays")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEssays((data || []) as unknown as Essay[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-br from-accent/5 via-background to-primary/5 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent-foreground">
              <FileText className="h-3.5 w-3.5" /> SAQs & LAQs
            </div>
            <h1 className="mb-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              Essays & Written Questions
            </h1>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground leading-relaxed">
              Short answer and long answer questions generated from your articles. Practice writing structured medical answers.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : essays.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No essays yet. Essays are auto-generated when articles are created.
          </p>
        ) : (
          <div className="space-y-3">
            {essays.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/essays/${e.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold text-foreground truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.category !== "Uncategorized" && (
                        <span className="text-primary">{getCategoryDisplayName(e.category)} · </span>
                      )}
                      {e.short_answer_questions.length} SAQs · {e.long_answer_questions.length} LAQs
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
