import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Unlock, ListChecks } from "lucide-react";
import { getMcqSetById, getCategoryDisplayName, type McqSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import McqViewer from "@/components/McqViewer";
import ExamMode from "@/components/ExamMode";
import { markMcqVisited } from "@/lib/progress-store";

export default function McqStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState<McqSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [examMode, setExamMode] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/mcqs");
    }
  };

  useEffect(() => {
    if (id) {
      getMcqSetById(id)
        .then((s) => {
          setSet(s);
          if (s) markMcqVisited(s.id);
          if (s && (!s.access_password || s.access_password === "")) {
            setPasswordUnlocked(true);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleUnlock = () => {
    if (set && passwordInput === set.access_password) {
      setPasswordUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">Set not found</h1>
        <Button asChild variant="outline">
          <Link to="/mcqs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to MCQs</Link>
        </Button>
      </div>
    );
  }

  const unitName = getCategoryDisplayName(set.category);
  const isLocked = set.access_password && set.access_password !== "" && !passwordUnlocked;
  const hideAnswers = !!(set.access_password && set.access_password !== "" && !passwordUnlocked);

  if (examMode) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:py-12">
        <ExamMode
          questions={set.questions}
          title={set.title}
          setId={set.id}
          onExit={() => setExamMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:py-12">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-1 gap-2 text-muted-foreground" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setExamMode(true)}>
          <ListChecks className="h-4 w-4" /> Exam Mode
        </Button>
      </div>

      {unitName && unitName !== "Uncategorized" && (
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            {unitName}
          </span>
        </div>
      )}

      {isLocked && (
        <div className="mb-6 rounded-2xl border-2 border-amber-500/30 bg-amber-50 p-6 text-center dark:bg-amber-950/20">
          <Lock className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-400" />
          <h3 className="mb-2 font-serif text-lg font-bold text-foreground">Password Protected</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This quiz is locked. Enter the password to view answers and explanations.
          </p>
          <div className="mx-auto flex max-w-xs items-center justify-center gap-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className={passwordError ? "border-destructive" : ""}
            />
            <Button onClick={handleUnlock} size="sm" className="shrink-0 gap-2">
              <Unlock className="h-4 w-4" /> Unlock
            </Button>
          </div>
          {passwordError && <p className="mt-2 text-sm font-medium text-destructive">Wrong password</p>}
          <p className="mt-3 text-xs text-muted-foreground">Or continue without unlocking — answers will be hidden</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPasswordUnlocked(false)}>
            Continue without password →
          </Button>
        </div>
      )}

      <McqViewer
        questions={set.questions}
        title={set.title}
        setId={set.id}
        category={set.category}
        hideAnswers={hideAnswers}
      />
    </div>
  );
}

