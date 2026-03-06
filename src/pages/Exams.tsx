import { useState, useEffect } from "react";
import { Phone, Loader2, CheckCircle, XCircle, Clock, Shield, Trophy, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSetting } from "@/lib/store";
import ExamMode from "@/components/ExamMode";

interface ExamSet {
  id: string;
  title: string;
  category: string;
  questions: { question: string; options: string[]; correct_answer: number; explanation?: string }[];
  created_at: string;
}

export default function Exams() {
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [examPrice, setExamPrice] = useState(5);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");
  const [transactionId, setTransactionId] = useState("");
  const [unlockedExams, setUnlockedExams] = useState<Set<string>>(new Set());
  const [activeExam, setActiveExam] = useState<ExamSet | null>(null);
  const [payingForExamId, setPayingForExamId] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
    getSetting("exam_price").then((p) => {
      if (p && !isNaN(Number(p))) setExamPrice(Number(p));
    });
    // Load previously unlocked exams from localStorage
    const saved = localStorage.getItem("unlocked_exams");
    if (saved) {
      try { setUnlockedExams(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const loadExams = async () => {
    const { data } = await supabase
      .from("mcq_sets")
      .select("*")
      .eq("published", true)
      .ilike("title", "%exam%")
      .order("created_at", { ascending: false });
    setExamSets((data || []) as unknown as ExamSet[]);
    setLoading(false);
  };

  const handlePay = async (examId: string) => {
    if (!phone.trim()) return;
    setPaying(true);
    setPaymentStatus("pending");
    setPayingForExamId(examId);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: { phone: phone.trim(), amount: examPrice, package_type: "exam" },
      });
      if (error || !data?.success) throw new Error(data?.error || "Payment failed");
      setTransactionId(data.transaction_id);
      // Poll for payment completion
      pollPayment(data.transaction_id, examId);
    } catch (err: any) {
      setPaymentStatus("failed");
      setPaying(false);
    }
  };

  const pollPayment = (txnId: string, examId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { // 2 minutes max
        clearInterval(interval);
        setPaymentStatus("failed");
        setPaying(false);
        return;
      }
      try {
        const { data } = await supabase.functions.invoke("check-payment", {
          body: {},
          headers: {},
        });
        // Use fetch directly for GET with query params
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment?transaction_id=${txnId}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const result = await resp.json();
        if (result.status === "completed") {
          clearInterval(interval);
          setPaymentStatus("completed");
          setPaying(false);
          const newUnlocked = new Set(unlockedExams);
          newUnlocked.add(examId);
          setUnlockedExams(newUnlocked);
          localStorage.setItem("unlocked_exams", JSON.stringify([...newUnlocked]));
        } else if (result.status === "failed") {
          clearInterval(interval);
          setPaymentStatus("failed");
          setPaying(false);
        }
      } catch {}
    }, 2000);
  };

  const isUnlocked = (examId: string) => unlockedExams.has(examId);

  if (activeExam) {
    return (
      <ExamMode
        questions={activeExam.questions}
        title={activeExam.title}
        setId={activeExam.id}
        onExit={() => setActiveExam(null)}
      />
    );
  }

  // Sample exam for demonstration
  const sampleExam: ExamSet = {
    id: "sample-exam",
    title: "Sample Medical Exam – Try Free",
    category: "Sample",
    created_at: new Date().toISOString(),
    questions: [
      { question: "Which enzyme is responsible for the conversion of angiotensin I to angiotensin II?", options: ["Renin", "ACE", "Chymase", "Pepsin"], correct_answer: 1, explanation: "Angiotensin-Converting Enzyme (ACE) converts angiotensin I to angiotensin II in the lungs." },
      { question: "The normal range of hemoglobin in adult males is:", options: ["10-12 g/dL", "12-14 g/dL", "13.5-17.5 g/dL", "15-20 g/dL"], correct_answer: 2, explanation: "Normal hemoglobin for adult males is 13.5-17.5 g/dL." },
      { question: "Which of the following is NOT a cardinal sign of inflammation?", options: ["Rubor (redness)", "Tumor (swelling)", "Pallor (paleness)", "Dolor (pain)"], correct_answer: 2, explanation: "The 5 cardinal signs are rubor, tumor, calor, dolor, and functio laesa. Pallor is not one." },
      { question: "Which cranial nerve is responsible for taste sensation in the anterior 2/3 of the tongue?", options: ["CN V (Trigeminal)", "CN VII (Facial)", "CN IX (Glossopharyngeal)", "CN XII (Hypoglossal)"], correct_answer: 1, explanation: "The facial nerve (CN VII) via the chorda tympani carries taste from the anterior 2/3 of the tongue." },
      { question: "What is the most common cause of iron deficiency anemia in developing countries?", options: ["Poor dietary intake", "Hookworm infestation", "Chronic blood loss", "Malabsorption"], correct_answer: 1, explanation: "Hookworm infestation is the most common cause of iron deficiency anemia in developing countries." },
    ],
  };

  const allExams = [sampleExam, ...examSets];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Trophy className="h-3.5 w-3.5" /> Weekly Medical Exams
            </div>
            <h1 className="mb-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Exam Center
            </h1>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground leading-relaxed">
              Timed, proctored exams generated from your study material. Pay KES {examPrice} via M-Pesa to unlock each exam. The sample exam below is free!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Exams List */}
      <section className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allExams.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No exams available yet. Check back on Friday!</p>
        ) : (
          allExams.map((exam, i) => {
            const isSample = exam.id === "sample-exam";
            const unlocked = isSample || isUnlocked(exam.id);

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-bold text-foreground">{exam.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exam.questions.length} questions · {exam.category}
                      {!isSample && ` · ${new Date(exam.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {isSample && (
                    <span className="shrink-0 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                      FREE
                    </span>
                  )}
                  {!isSample && unlocked && (
                    <span className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-bold text-primary">
                      <CheckCircle className="inline h-3 w-3 mr-1" />PAID
                    </span>
                  )}
                </div>

                {unlocked ? (
                  <Button onClick={() => setActiveExam(exam)} className="w-full gap-2">
                    <Shield className="h-4 w-4" /> Start Exam <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {payingForExamId === exam.id && paymentStatus === "pending" ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium text-foreground">Waiting for M-Pesa confirmation...</p>
                        <p className="text-xs text-muted-foreground">Check your phone and enter your PIN</p>
                      </div>
                    ) : payingForExamId === exam.id && paymentStatus === "failed" ? (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
                        <XCircle className="h-5 w-5 text-destructive mx-auto" />
                        <p className="text-sm font-medium text-foreground">Payment failed</p>
                        <Button size="sm" variant="outline" onClick={() => setPaymentStatus("idle")}>Try Again</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            type="tel"
                            placeholder="07XX XXX XXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handlePay(exam.id)}
                            disabled={paying || !phone.trim()}
                            className="gap-2 shrink-0"
                          >
                            <Phone className="h-4 w-4" />
                            Pay KES {examPrice}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </section>
    </div>
  );
}
