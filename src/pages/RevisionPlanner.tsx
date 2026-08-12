import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CalendarDays, Check, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAcademicYears, getUnitsForYear, type Unit } from "@/lib/academic";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type PlanItem = {
  id: string;
  scheduled_date: string;
  resource_title: string | null;
  activity: string;
  estimated_minutes: number;
  status: string;
};

/** YYYY-MM-DD in the learner's local timezone. A plain toISOString().slice(0,10)
 *  shifts the calendar day for anyone east of UTC (e.g. Kenya, UTC+3), which
 *  would silently schedule the first day or two of a plan on the wrong date. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RevisionPlanner() {
  const { user } = useAuth();
  const [year, setYear] = useState(3);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(90);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getAcademicYears();
    getUnitsForYear(year).then(setUnits);
  }, [year]);

  useEffect(() => {
    if (!user) { setItemsLoading(false); return; }
    let alive = true;
    setItemsLoading(true);
    (supabase as any)
      .from("revision_plan_items")
      .select("id,scheduled_date,resource_title,activity,estimated_minutes,status")
      .eq("user_id", user.id)
      .order("scheduled_date")
      .limit(100)
      .then(({ data }: any) => {
        if (!alive) return;
        setItems(data || []);
        setItemsLoading(false);
      });
    return () => { alive = false; };
  }, [user?.id]);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !date || !selected.length) return;
    setLoading(true);
    try {
      const chosen = units.filter((u) => selected.includes(u.id));
      const studyDays = Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
      const { data: plan, error } = await (supabase as any)
        .from("revision_plans")
        .insert({
          user_id: user.id,
          title: `Year ${year} revision plan`,
          unit_ids: selected,
          exam_date: date,
          daily_minutes: minutes,
          study_days: studyDays,
          activity_types: ["read", "practice"],
        })
        .select()
        .single();
      if (error || !plan) throw error || new Error("Plan could not be created");

      const rowCount = Math.min(studyDays, Math.max(7, chosen.length * 3));
      const rows = [];
      for (let i = 0; i < rowCount; i++) {
        const unit = chosen[i % chosen.length];
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + i);
        rows.push({
          plan_id: plan.id,
          user_id: user.id,
          scheduled_date: localDateStr(scheduledDate),
          unit_id: unit.id,
          resource_title: unit.name,
          activity: i % 3 === 2 ? "practice questions" : "review notes",
          estimated_minutes: Math.max(20, Math.floor(minutes / (i % 2 ? 2 : 1))),
          display_order: i,
        });
      }
      const { data: inserted, error: itemsError } = await (supabase as any)
        .from("revision_plan_items")
        .insert(rows)
        .select();
      if (itemsError) throw itemsError;
      setItems(inserted || []);
      toast({ description: "Your revision plan is ready." });
    } catch {
      toast({ description: "Could not build your plan. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (item: PlanItem) => {
    const status = item.status === "completed" ? "pending" : "completed";
    setItems((v) => v.map((x) => (x.id === item.id ? { ...x, status } : x)));
    try {
      const { error } = await (supabase as any).from("revision_plan_items").update({ status }).eq("id", item.id);
      if (error) throw error;
    } catch {
      setItems((v) => v.map((x) => (x.id === item.id ? { ...x, status: item.status } : x)));
      toast({ description: "Could not update that task. Please try again.", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <LockKeyhole className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-serif text-3xl font-bold">Revision Planner</h1>
        <p className="mt-2 text-muted-foreground">Sign in to create and save a personal examination plan.</p>
        <Link to="/login" className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 font-bold text-primary-foreground">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Helmet>
        <title>Revision Planner | OmpathStudy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
        <Link to="/my-revision" className="hover:text-primary">My Revision</Link> ›{" "}
        <span className="text-foreground">Revision Planner</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <form onSubmit={generate} className="h-fit rounded-2xl border border-border bg-card p-5">
          <CalendarDays className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="mt-3 font-serif text-2xl font-bold">Build your plan</h1>

          <label htmlFor="rp-year" className="mt-5 block text-xs font-bold">Academic year</label>
          <select
            id="rp-year"
            value={year}
            onChange={(e) => { setYear(+e.target.value); setSelected([]); }}
            className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-background p-2.5"
          >
            {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>

          <fieldset className="mt-4">
            <legend className="block text-xs font-bold">Units</legend>
            <div className="mt-2 max-h-56 space-y-1 overflow-auto">
              {units.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No units published for Year {year} yet.
                </p>
              )}
              {units.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => setSelected((v) => (v.includes(u.id) ? v.filter((x) => x !== u.id) : [...v, u.id]))}
                    className="h-4 w-4"
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor="rp-date" className="mt-4 block text-xs font-bold">Exam date</label>
          <input
            id="rp-date"
            type="date"
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-background p-2.5"
          />

          <label htmlFor="rp-minutes" className="mt-4 block text-xs font-bold">Minutes per day</label>
          <input
            id="rp-minutes"
            type="number"
            min="20"
            max="480"
            value={minutes}
            onChange={(e) => setMinutes(+e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-background p-2.5"
          />

          <Button disabled={loading || !date || !selected.length} className="mt-5 w-full min-h-[44px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate plan"}
          </Button>
        </form>

        <section>
          <h2 className="font-serif text-2xl font-bold">Your schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">A balanced sequence of reading and question practice.</p>

          <div className="mt-5 space-y-2">
            {itemsLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            ) : items.length ? (
              items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={i.status === "completed"}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    i.status === "completed" ? "border-primary/20 bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      i.status === "completed" ? "bg-primary text-primary-foreground" : "border-border"
                    }`}
                    aria-hidden="true"
                  >
                    {i.status === "completed" && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{i.resource_title}</strong>
                    <span className="text-xs text-muted-foreground">
                      {i.scheduled_date} · {i.activity} · {i.estimated_minutes} min
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Choose units and an exam date to generate your schedule.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
