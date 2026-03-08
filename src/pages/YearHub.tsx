import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookMarked, BookOpen, FileText, GraduationCap, ListChecks, Trophy } from "lucide-react";
import { YEAR_CATEGORIES } from "@/lib/store";

const YEAR_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export default function YearHub() {
  const { yearNumber } = useParams();
  const parsedYear = Number(yearNumber);

  if (!YEAR_NUMBERS.includes(parsedYear as (typeof YEAR_NUMBERS)[number])) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">Invalid year</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please choose a valid year from the menu.</p>
      </div>
    );
  }

  const yearLabel = `Year ${parsedYear}`;
  const units = YEAR_CATEGORIES[yearLabel] || [];

  const sections = [
    {
      title: "Blog",
      description: "All study notes organized by unit",
      to: `/blog?year=${encodeURIComponent(yearLabel)}`,
      icon: BookOpen,
    },
    {
      title: "Flashcards",
      description: "Quick review cards for this year",
      to: `/flashcards?year=${encodeURIComponent(yearLabel)}`,
      icon: GraduationCap,
    },
    {
      title: "MCQs",
      description: "Practice quizzes for this year",
      to: `/mcqs?year=${encodeURIComponent(yearLabel)}`,
      icon: ListChecks,
    },
    {
      title: "Exams",
      description: "Timed tests filtered to this year",
      to: `/exams?year=${encodeURIComponent(yearLabel)}`,
      icon: Trophy,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Study navigation</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground">{yearLabel}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a section below to continue with {yearLabel} content only.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.title}
            to={section.to}
            className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="mb-3 flex items-center gap-2">
              <section.icon className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold text-foreground">{section.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{section.description}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Open {section.title}
              <ArrowRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg font-bold text-foreground">Units in {yearLabel}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {units.map((unit) => (
            <span key={unit} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {unit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
