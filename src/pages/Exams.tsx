import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Loader2, Phone, Shield, Sparkles, Trophy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSetting, getCategoryDisplayName, getYearFromCategory } from "@/lib/store";

interface ExamSet {
  id: string;
  title: string;
  category: string;
  questions: { question: string; options: string[]; correct_answer: number; explanation?: string }[];
  created_at: string;
}

const UNLOCKED_KEY = "unlocked_exams";

function inferUnit(exam: ExamSet): string {
  const fromCategory = exam.category?.replace(/^Weekly Exam\s*:?\s*/i, "").trim();
  if (fromCategory && fromCategory !== "Weekly Exam") return getCategoryDisplayName(fromCategory);

  const titleMatch = exam.title.match(/Weekly\s+(.+?)\s+Exam/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  return "General";
}

export default function Exams() {
  useEffect(() => { document.title = "Exam Center | Kenya Meds"; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedYear = searchParams.get("year") || "All";
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [examPrice, setExamPrice] = useState(5);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");
  const [payingForExamId, setPayingForExamId] = useState<string | null>(null);
  const [unlockedExams, setUnlockedExams] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadExams();
    getSetting("exam_price").then((price) => {
      if (price && !isNaN(Number(price))) setExamPrice(Number(price));
    });

    const saved = localStorage.getItem(UNLOCKED_KEY);
    if (saved) {
      try {
        setUnlockedExams(new Set(JSON.parse(saved)));
      } catch {
        setUnlockedExams(new Set());
      }
    }
  }, []);

  const loadExams = async () => {
    const { data } = await supabase
      .from("mcq_sets")
      .select("*")
      .eq("published", true)
      .or("title.ilike.%exam%,category.ilike.Weekly Exam%")
      .order("created_at", { ascending: false });

    setExamSets((data || []) as unknown as ExamSet[]);
    setLoading(false);
  };

  const persistUnlocked = (next: Set<string>) => {
    setUnlockedExams(next);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...next]));
  };

  const pollPayment = (txnId: string, examId: string) => {
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts += 1;
      if (attempts > 60) {
        clearInterval(pollId);
        setPaymentStatus("failed");
        setPaying(false);
        return;
      }

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment?transaction_id=${encodeURIComponent(txnId)}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        const result = await resp.json();
        if (!resp.ok) return;

        if (result.status === "completed") {
          clearInterval(pollId);
          setPaymentStatus("completed");
          setPaying(false);
          const next = new Set(unlockedExams);
          next.add(examId);
          persistUnlocked(next);
        } else if (result.status === "failed") {
          clearInterval(pollId);
          setPaymentStatus("failed");
          setPaying(false);
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  const handlePay = async (exam: ExamSet) => {
    if (!phone.trim()) return;

    setPaying(true);
    setPaymentStatus("pending");
    setPayingForExamId(exam.id);

    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: {
          phone: phone.trim(),
          amount: examPrice,
          package_type: `exam:${inferUnit(exam)}`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Payment failed");
      }

      pollPayment(data.transaction_id, exam.id);
    } catch {
      setPaymentStatus("failed");
      setPaying(false);
    }
  };

  const sampleExam: ExamSet = {
    id: "sample-exam",
    title: "Sample Pathology Exam",
    category: "Pathology",
    created_at: new Date().toISOString(),
    questions: [
      {
        question: "Which process is the hallmark of acute inflammation in early tissue injury?",
        options: ["Fibrosis", "Neutrophil recruitment", "Granuloma formation", "Metaplasia"],
        correct_answer: 1,
        explanation: "Acute inflammation is dominated by vascular changes and neutrophil migration.",
      },
      {
        question: "A classic Reed-Sternberg cell is most associated with which disease?",
        options: ["Burkitt lymphoma", "Hodgkin lymphoma", "Multiple myeloma", "AML"],
        correct_answer: 1,
        explanation: "Reed-Sternberg cells are pathognomonic for Hodgkin lymphoma.",
      },
    ],
  };

  const filteredExamSets = useMemo(() => {
    if (selectedYear === "All") return examSets;
    return examSets.filter((exam) => getYearFromCategory(exam.category) === selectedYear);
  }, [examSets, selectedYear]);

  const allExams = useMemo(() => [sampleExam, ...filteredExamSets], [filteredExamSets]);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero — only text changed, no logic ── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Trophy className="h-3.5 w-3.5" /> Unit-Based Weekly Exams
            </div>
            <h1 className="mb-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">Exam Center</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Timed, proctored MCQ exams drawn from your unit content. {selectedYear === "All" ? "Select a year from the menu to narrow exams." : `Currently viewing ${selectedYear} exams.`}
            </p>
          </motion.div>

          {/* Support card — new addition, no logic impact */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-7 max-w-lg rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 dark:bg-rose-900/40 p-2 shrink-0 mt-0.5">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Support Kenya Meds</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each exam is just <strong className="text-foreground">KES {examPrice}</strong>. This goes directly toward building weekly exams, expanding the question bank, and keeping Kenya Meds free for all health students in Kenya.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Exam list — 100% original logic, only subtitle text changed ── */}
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allExams.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No exams available yet.</p>
        ) : (
          allExams.map((exam, index) => {
            const isSample = exam.id === "sample-exam";
            const unlocked = isSample || unlockedExams.has(exam.id);
            const unitName = inferUnit(exam);
            const isCurrentPayment = payingForExamId === exam.id;

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-medium text-primary">Unit: {unitName}</p>
                    <h2 className="font-serif text-lg font-bold text-foreground">{exam.title}</h2>
                    {/* CHANGED: removed "Section B SAQs · Section C LAQ" — MCQs only */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exam.questions.length} MCQs · {exam.questions.length} minutes · Section A
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-[10px] font-semibold text-foreground">
                    {isSample ? "FREE SAMPLE" : unlocked ? "UNLOCKED" : `KES ${examPrice}`}
                  </span>
                </div>

                {/* ── All payment/unlock logic is IDENTICAL to original ── */}
                {unlocked ? (
                  <Button onClick={() => navigate(`/exams/${exam.id}/start`)} className="w-full gap-2">
                    <Shield className="h-4 w-4" /> Start Exam <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {isCurrentPayment && paymentStatus === "pending" ? (
                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                        <p className="mt-2 text-sm font-medium text-foreground">Waiting for M-Pesa confirmation…</p>
                        <p className="text-xs text-muted-foreground">Complete STK prompt on your phone.</p>
                      </div>
                    ) : isCurrentPayment && paymentStatus === "failed" ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
                        <p className="text-sm font-medium text-foreground">Payment failed</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => setPaymentStatus("idle")}>Try again</Button>
                      </div>
                    ) : isCurrentPayment && paymentStatus === "completed" ? (
                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                        <CheckCircle className="mx-auto h-5 w-5 text-primary" />
                        <p className="mt-2 text-sm font-medium text-foreground">Payment confirmed.</p>
                        <Button onClick={() => navigate(`/exams/${exam.id}/start`)} className="mt-2 gap-2">
                          <Sparkles className="h-4 w-4" /> Continue to Start Page
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          type="tel"
                          placeholder="07XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <Button onClick={() => handlePay(exam)} disabled={paying || !phone.trim()} className="gap-2">
                          <Phone className="h-4 w-4" /> Pay KES {examPrice}
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Unlock is saved on this device after successful payment.
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        {/* Bottom support note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2"
        >
          <div className="rounded-full bg-rose-500/10 p-3 shrink-0">
            <Heart className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1">Every exam supports this platform</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kenya Meds is built by and for health students in Kenya. The small fee helps cover question generation, platform hosting, and new study tools — so we can keep growing and keep everything else free.
            </p>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
