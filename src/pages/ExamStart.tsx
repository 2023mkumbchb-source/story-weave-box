import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Shield, Trophy, User, GraduationCap, BookOpen, Plus, Check } from "lucide-react";
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

const BASE_UNIVERSITIES = [
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
];

const BASE_COURSES = [
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

  // approved custom institutions fetched from DB
  const [extraUniversities, setExtraUniversities] = useState<string[]>([]);
  const [extraCourses, setExtraCourses] = useState<string[]>([]);

  // "add new" UI states
  const [addingUni, setAddingUni] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [customUniInput, setCustomUniInput] = useState("");
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [submittingUni, setSubmittingUni] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [uniSubmitted, setUniSubmitted] = useState(false);
  const [courseSubmitted, setCourseSubmitted] = useState(false);

  // Load exam
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

  // Load approved custom institutions from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("pending_institutions")
        .select("type, value")
        .eq("status", "approved");
      if (data) {
        setExtraUniversities(data.filter((d) => d.type === "university").map((d) => d.value));
        setExtraCourses(data.filter((d) => d.type === "course").map((d) => d.value));
      }
    };
    load();
  }, []);

  const allUniversities = useMemo(
    () => [...BASE_UNIVERSITIES, ...extraUniversities].sort(),
    [extraUniversities]
  );

  const allCourses = useMemo(
    () => [...BASE_COURSES, ...extraCourses].sort(),
    [extraCourses]
  );

  const unitName = useMemo(() => {
    if (!exam) return "General";
    const fromCategory = exam.category?.replace(/^Weekly Exam\s*:?\s*/i, "").trim();
    return fromCategory && fromCategory !== "Weekly Exam" ? fromCategory : "General";
  }, [exam]);

  const totalMinutes = useMemo(() => {
    if (!exam) return 60;
    return exam.questions.length;
  }, [exam]);

  // Submit a custom university to DB (pending review)
  const handleSubmitCustomUni = async () => {
    const val = customUniInput.trim();
    if (!val) return;
    setSubmittingUni(true);
    try {
      await supabase.from("pending_institutions").upsert(
        { type: "university", value: val, submitted_by: studentInfo.name || "Anonymous", status: "pending" },
        { onConflict: "type,value", ignoreDuplicates: true }
      );
      // Use the submitted value immediately for this session
      setStudentInfo((prev) => ({ ...prev, university: val }));
      setUniSubmitted(true);
      setAddingUni(false);
      setCustomUniInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingUni(false);
    }
  };

  // Submit a custom course to DB (pending review)
  const handleSubmitCustomCourse = async () => {
    const val = customCourseInput.trim();
    if (!val) return;
    setSubmittingCourse(true);
    try {
      await supabase.from("pending_institutions").upsert(
        { type: "course", value: val, submitted_by: studentInfo.name || "Anonymous", status: "pending" },
        { onConflict: "type,value", ignoreDuplicates: true }
      );
      setStudentInfo((prev) => ({ ...prev, course: val }));
      setCourseSubmitted(true);
      setAddingCourse(false);
      setCustomCourseInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingCourse(false);
    }
  };

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
              <li>Answers are only revealed after <strong className="text-foreground">midnight</strong>.</li>
              <li>Copy, paste, and right-click are disabled.</li>
            </ul>
          </div>

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

              {/* Full Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name *</label>
                <Input
                  placeholder="Enter your full name"
                  value={studentInfo.name}
                  onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                />
              </div>

              {/* University */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">University *</label>
                {!addingUni ? (
                  <div className="space-y-2">
                    <select
                      value={studentInfo.university}
                      onChange={(e) => {
                        if (e.target.value === "__add__") {
                          setAddingUni(true);
                          setStudentInfo({ ...studentInfo, university: "" });
                        } else {
                          setStudentInfo({ ...studentInfo, university: e.target.value });
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Select university...</option>
                      {allUniversities.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      <option value="__add__">+ My university is not listed</option>
                    </select>
                    {uniSubmitted && studentInfo.university && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        "{studentInfo.university}" submitted for review. You can use it now.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your university name"
                      value={customUniInput}
                      onChange={(e) => setCustomUniInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmitCustomUni(); }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitCustomUni}
                        disabled={!customUniInput.trim() || submittingUni}
                        className="gap-1"
                      >
                        {submittingUni ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Use this
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddingUni(false); setCustomUniInput(""); }}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will be sent to the admin for review and added to the list if approved.
                    </p>
                  </div>
                )}
              </div>

              {/* Course */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Course *</label>
                {!addingCourse ? (
                  <div className="space-y-2">
                    <select
                      value={studentInfo.course}
                      onChange={(e) => {
                        if (e.target.value === "__add__") {
                          setAddingCourse(true);
                          setStudentInfo({ ...studentInfo, course: "" });
                        } else {
                          setStudentInfo({ ...studentInfo, course: e.target.value });
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Select your course...</option>
                      {allCourses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__add__">+ My course is not listed</option>
                    </select>
                    {courseSubmitted && studentInfo.course && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        "{studentInfo.course}" submitted for review. You can use it now.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your course name"
                      value={customCourseInput}
                      onChange={(e) => setCustomCourseInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmitCustomCourse(); }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitCustomCourse}
                        disabled={!customCourseInput.trim() || submittingCourse}
                        className="gap-1"
                      >
                        {submittingCourse ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Use this
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddingCourse(false); setCustomCourseInput(""); }}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will be sent to the admin for review and added to the list if approved.
                    </p>
                  </div>
                )}
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
