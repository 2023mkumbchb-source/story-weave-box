import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, BookOpen, Clock, Trophy, Zap, Heart, ChevronRight, CheckCircle, Star } from "lucide-react";

interface ExamSet {
  id: string;
  title: string;
  category: string;
  published_at: string;
  questions: { question: string }[];
}

interface AppSettings {
  exam_price_kes?: number;
}

const UNLOCKED_KEY = "unlocked_exams";

function getUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function unlockExam(id: string) {
  try {
    const s = getUnlocked();
    s.add(id);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...s]));
  } catch {}
}

export default function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(50);
  const [unlocked, setUnlocked] = useState<Set<string>>(getUnlocked());
  const [paying, setPaying] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [showPhoneFor, setShowPhoneFor] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: examData }, { data: settings }] = await Promise.all([
        supabase
          .from("mcq_sets")
          .select("id, title, category, published_at, questions")
          .eq("published", true)
          .ilike("category", "%Weekly Exam%")
          .order("published_at", { ascending: false }),
        supabase.from("app_settings").select("exam_price_kes").single(),
      ]);
      if (examData) setExams(examData as unknown as ExamSet[]);
      if (settings?.exam_price_kes) setPrice(settings.exam_price_kes);
      setLoading(false);
    };
    load();
  }, []);

  const handlePayAndStart = async (examId: string) => {
    if (!phone.trim() || phone.length < 9) return;
    setPaying(examId);
    setCheckingPayment(false);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: { phone: phone.replace(/\s/g, ""), amount: price, examId },
      });
      if (error) throw error;
      // Poll for payment confirmation
      setCheckingPayment(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const { data: payData } = await supabase.functions.invoke("check-payment", {
          body: { checkoutId: data?.checkoutId, examId },
        });
        if (payData?.paid) {
          clearInterval(poll);
          unlockExam(examId);
          setUnlocked(getUnlocked());
          setPaying(null);
          setCheckingPayment(false);
          setShowPhoneFor(null);
          navigate(`/exams/${examId}`);
        } else if (attempts > 20) {
          clearInterval(poll);
          setPaying(null);
          setCheckingPayment(false);
        }
      }, 3000);
    } catch {
      setPaying(null);
      setCheckingPayment(false);
    }
  };

  const unitLabel = (category: string) =>
    category.replace(/^Weekly Exam\s*:?\s*/i, "").trim() || "General";

  const weekLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/15 via-background to-accent/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3" /> Weekly Exams
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-600">
              <CheckCircle className="h-3 w-3" /> New every week
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
            Test Your Knowledge.<br className="hidden sm:block" />
            <span className="text-primary">Every Week.</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mb-6">
            Practice with real exam-style MCQs drawn from your units. A new set drops every week — timed, proctored, and scored.
          </p>

          {/* Support card */}
          <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur p-4 sm:p-5 max-w-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-500/10 p-2 shrink-0">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Support Ompath Study</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each exam costs just <strong className="text-foreground">KES {price}</strong> — this goes directly toward building and maintaining weekly exams, question banks, and study tools for health students across Kenya. Your support keeps this free for everyone else.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sample exam ── */}
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Try for free</p>
        <div
          onClick={() => navigate("/exams/sample-exam")}
          className="group cursor-pointer rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 p-4 sm:p-5 flex items-center gap-4 hover:border-primary/60 hover:shadow-md transition-all mb-8"
        >
          <div className="rounded-xl bg-primary/10 p-3 shrink-0">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Sample Exam — Try Before You Pay</p>
            <p className="text-xs text-muted-foreground mt-0.5">2 questions · No payment needed · See how the exam works</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-600">Free</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Exam list ── */}
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Weekly exams</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No exams published yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back next week — a new exam drops every Monday.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const isUnlocked = unlocked.has(exam.id);
              const qCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
              const unit = unitLabel(exam.category);
              const isPayingThis = paying === exam.id;
              const isShowingPhone = showPhoneFor === exam.id;

              return (
                <div key={exam.id}
                  className={`rounded-2xl border bg-card transition-all ${
                    isUnlocked ? "border-primary/30 hover:border-primary/50" : "border-border hover:border-border/80"
                  }`}>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className={`rounded-xl p-2.5 sm:p-3 shrink-0 ${isUnlocked ? "bg-primary/10" : "bg-muted"}`}>
                        {isUnlocked
                          ? <Trophy className="h-5 w-5 text-primary" />
                          : <Lock className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                            {unit}
                          </span>
                          {isUnlocked && (
                            <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">{exam.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{qCount} questions</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{qCount} minutes</span>
                          <span>{weekLabel(exam.published_at)}</span>
                        </div>
                      </div>

                      {/* Action — desktop */}
                      <div className="hidden sm:block shrink-0">
                        {isUnlocked ? (
                          <Button size="sm" onClick={() => navigate(`/exams/${exam.id}`)} className="gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" /> Start Exam
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setShowPhoneFor(isShowingPhone ? null : exam.id)}
                            className="gap-1.5">
                            <Lock className="h-3.5 w-3.5" /> KES {price}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Action — mobile */}
                    <div className="sm:hidden mt-3">
                      {isUnlocked ? (
                        <Button size="sm" onClick={() => navigate(`/exams/${exam.id}`)} className="w-full gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" /> Start Exam
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setShowPhoneFor(isShowingPhone ? null : exam.id)}
                          className="w-full gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> Unlock for KES {price}
                        </Button>
                      )}
                    </div>

                    {/* Payment input */}
                    {isShowingPhone && !isUnlocked && (
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">M-Pesa Payment</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Enter your Safaricom number. You'll receive an M-Pesa prompt for <strong className="text-foreground">KES {price}</strong>.
                          </p>
                          <div className="flex gap-2">
                            <div className="flex items-center rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground shrink-0">
                              +254
                            </div>
                            <input
                              type="tel"
                              placeholder="7XX XXX XXX"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayAndStart(exam.id)}
                          disabled={phone.length < 9 || isPayingThis}
                          className="w-full gap-2"
                        >
                          {isPayingThis
                            ? checkingPayment
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment...</>
                              : <><Loader2 className="h-4 w-4 animate-spin" /> Sending prompt...</>
                            : <>Pay KES {price} &amp; Start</>
                          }
                        </Button>
                        {isPayingThis && checkingPayment && (
                          <p className="text-xs text-center text-muted-foreground">
                            Check your phone and enter your M-Pesa PIN to complete payment.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom support note */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="rounded-full bg-rose-500/10 p-3 shrink-0">
            <Heart className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground mb-1">Every exam supports this platform</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ompath Study is built by students, for students. The small fee per exam helps cover the cost of generating questions, maintaining the platform, and creating new study tools — so we can keep growing. Thank you for your support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
