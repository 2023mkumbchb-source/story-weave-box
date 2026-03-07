import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Shield, Trophy, User, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ExamMode from "@/components/ExamMode";

interface ExamSet {
  id: string;
  title: string;
  category: string;
  questions: { question: string; options: string[]; correct_answer: number; explanation?: string }[];
}

interface StudentInfo {
  name: string;
  university: string;
  course: string;
}

const UNLOCKED_KEY = "unlocked_exams";

const UNIVERSITIES = [
  "University of Nairobi",
  "Kenyatta University",
  "Moi University",
  "Jomo Kenyatta University of Agriculture and Technology",
  "Egerton University",
  "Maseno University",
  "Mount Kenya University",
  "Kabarak University",
  "Daystar University",
  "Strathmore University",
  "KCA University",
  "United States International University",
  "Kenya Methodist University",
  "Africa Nazarene University",
  "Dedan Kimathi University",
  "Masinde Muliro University",
  "Technical University of Kenya",
  "Other",
];

// Health-related courses — what the student is studying
const COURSES = [
  "Medicine (MBChB)",
  "Pharmacy (B.Pharm)",
  "Nursing",
  "Dental Surgery (BDS)",
  "Clinical Medicine",
  "Physiotherapy",
  "Medical Laboratory Science",
  "Nutrition and Dietetics",
  "Public Health",
  "Health Records & Information Management",
  "Biomedical Science",
  "Other",
];

function sampleExam(): ExamSet {
  return {
    id: "sample-exam",
    title: "Sample Pathology Exam",
    category: "Pathology",
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
}

export default function ExamStart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({ name: "", university: "", course: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!id) { navigate("/exams"); return; }

      const unlockedRaw = localStorage.getItem(UNLOCKED_KEY);
      const unlocked = new Set<string>(unlockedRaw ? JSON.parse(unlockedRaw) : []);
      const isSample = id === "sample-exam";
      if (!isSample && !unlocked.has(id)) { navigate("/exams"); return; }

      if (isSample) { setExam(sampleExam()); setLoading(false); return; }

      const { data } = await supabase
        .from("mcq_sets")
        .select("id, title, category, questions")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();

      if (!data) { navigate("/exams"); return; }
      setExam(data as unknown as ExamSet);
      setLoading(false);
    };
    run();
  }, [id, navigate]);

  const unitName = useMemo(() => {
    if (!exam) return "General";
    const fromCategory = exam.category?.replace(/^Weekly Exam\s*:?\s*/i, "").trim();
    return fromCategory && fromCategory !== "Weekly Exam" ? fromCategory : "General";
  }, [exam]);

  // 1 min per MCQ question
  const totalMinutes = useMemo(() => {
    if (!exam) return 60;
    return exam.questions.length;
  }, [exam]);

  const handleStartExam = () => {
    if (!studentInfo.name.trim() || !studentInfo.university || !studentInfo.course) return;
    setStarted(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!exam) return null;

  if (started) {
    return (
      <ExamMode
        questions={exam.questions}
        title={exam.title}
        setId={exam.id === "sample-exam" ? undefined : exam.id}
        timeLimitMinutes={totalMinutes}
        studentInfo={studentInfo}
        unitName={unitName}
        onExit={() => setStarted(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Link to="/exams"><ArrowLeft className="h-4 w-4" /> Back to Exams</Link>
        </Button>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Trophy className="h-3.5 w-3.5" /> Ready to start
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{exam.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Unit: {unitName}</p>

          {/* Single section — MCQs only */}
          <div className="mt-5">
            <div className="rounded-xl border border-border bg-card p-3 inline-block">
              <p className="text-xs text-muted-foreground">Section A — MCQs</p>
              <p className="text-sm font-semibold text-foreground">{exam.questions.length} questions · {totalMinutes} minutes</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 text-foreground"><Shield className="h-4 w-4 text-primary" /> Exam rules</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Exam opens in full-screen mode.</li>
              <li>Switching tabs will <strong className="text-foreground">auto-submit</strong> the exam.</li>
              <li>Time limit: <strong className="text-foreground">{totalMinutes} minutes</strong> — auto-submits when time runs out.</li>
              <li>Answers are hidden during the exam and only revealed after <strong className="text-foreground">midnight</strong>.</li>
              <li>Copy, paste, and right-click are disabled.</li>
            </ul>
          </div>

          {/* Student Registration Form */}
          {!showForm ? (
            <div className="mt-6">
              <Button onClick={() => setShowForm(true)} className="gap-2 sm:min-w-[220px]">
                <User className="h-4 w-4" /> Register & Start Exam
              </Button>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Make sure your device is charged and stable.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                <GraduationCap className="h-5 w-5 text-primary" /> Student Information
              </h3>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name *</label>
                <Input
                  placeholder="Enter your full name"
                  value={studentInfo.name}
                  onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">University *</label>
                <select
                  value={studentInfo.university}
                  onChange={(e) => setStudentInfo({ ...studentInfo, university: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select university...</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Course *</label>
                <select
                  value={studentInfo.course}
                  onChange={(e) => setStudentInfo({ ...studentInfo, course: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select your course...</option>
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleStartExam}
                  disabled={!studentInfo.name.trim() || !studentInfo.university || !studentInfo.course}
                  className="gap-2 flex-1"
                >
                  <BookOpen className="h-4 w-4" /> Start Exam Now
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
