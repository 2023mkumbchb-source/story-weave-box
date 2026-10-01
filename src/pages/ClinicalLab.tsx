import { Suspense, lazy, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, ClipboardCheck, FlaskConical, HelpCircle, Layers, MessageCircleQuestion, Pill, ScanLine, ShieldAlert, Timer, type LucideIcon } from "lucide-react";
import { updateMetaTags } from "@/lib/seo";

const lz = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) => lazy(() => loader().then((m) => ({ default: m[name] })));
const StationsList = lz(() => import("@/components/clinical/labs/Stations"), "StationsList");
const StationRunner = lz(() => import("@/components/clinical/labs/Stations"), "StationRunner");
const WhyList = lz(() => import("@/components/clinical/labs/Why"), "WhyList");
const WhyRunner = lz(() => import("@/components/clinical/labs/Why"), "WhyRunner");
const TrapsLab = lz(() => import("@/components/clinical/labs/Traps"), "TrapsLab");
const DrugsList = lz(() => import("@/components/clinical/labs/Drugs"), "DrugsList");
const DrugRunner = lz(() => import("@/components/clinical/labs/Drugs"), "DrugRunner");
const FindingsLab = lz(() => import("@/components/clinical/labs/Findings"), "FindingsLab");
const QuizLab = lz(() => import("@/components/clinical/labs/Quiz"), "QuizLab");
const ToolsLab = lz(() => import("@/components/clinical/labs/Tools"), "ToolsLab");
const OsceLab = lz(() => import("@/components/clinical/labs/Osce"), "OsceLab");
const CounselList = lz(() => import("@/components/clinical/labs/Osce"), "CounselList");
const CounselRunner = lz(() => import("@/components/clinical/labs/Osce"), "CounselRunner");

const LABS: Record<string, { title: string; h1: string; blurb: string; icon: LucideIcon; wide?: boolean }> = {
  stations: { title: "Imaging & ECG stations", h1: "Describe → interpret → diagnose", blurb: "ECGs drawn live, chest and abdominal films, CT, ultrasound and clinical signs. Practise the routine examiners mark.", icon: ScanLine },
  why: { title: "Why ladders", h1: "Keep asking why", blurb: "From a bedside finding down to the physiology, then back up to the question you should ask the patient.", icon: Layers },
  traps: { title: "Ward-round traps", h1: "What lecturers catch you on", blurb: "Pulse is not blood pressure, a seizure is not epilepsy, oedema is not always the heart. Spot the trap before the consultant does.", icon: ShieldAlert },
  drugs: { title: "Drug reasoning", h1: "Why this drug?", blurb: "Class, mechanism, adverse effects, cautions, and what changes in renal impairment, pregnancy and children.", icon: Pill },
  findings: { title: "Normal or abnormal?", h1: "Say what you find — normal and abnormal", blurb: "Findings from real cases: decide whether they are normal, then learn how to report them professionally.", icon: ClipboardCheck },
  quiz: { title: "Rapid-fire clinical quiz", h1: "Mixed questions, all rotations", blurb: "Short single-best-answer questions with reasoning. The ones you miss come back sooner.", icon: HelpCircle },
  tools: { title: "Ward tools", h1: "Calculators, scores and normal values", blurb: "Fluid and dose maths, Parkland, GCS, CURB-65, Wells, anion gap, EDD, normal ranges and checklists.", icon: Calculator, wide: true },
  osce: { title: "OSCE circuit", h1: "Timed stations, back to back", blurb: "History, examination, interpretation, emergency, counselling and mental state examination — against the clock.", icon: Timer },
  counsel: { title: "Counselling stations", h1: "Communication and counselling", blurb: "Breaking bad news, HIV, family planning, insulin teaching, inhalers, consent and suicide risk.", icon: MessageCircleQuestion },
};

export default function ClinicalLab() {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const at = parts.indexOf("clinical");
  const lab = parts[at + 1] ?? "stations";
  const id = parts[at + 2];
  const meta = LABS[lab] ?? LABS.stations;
  const Icon = meta.icon;
  useEffect(() => { updateMetaTags({ title: `${meta.title} | Clinical simulator | Ompath Study`, description: meta.blurb }); window.scrollTo({ top: 0 }); }, [meta, id]);

  let view: React.ReactNode = null;
  if (lab === "stations") view = id ? <StationRunner /> : <StationsList />;
  else if (lab === "why") view = id ? <WhyRunner /> : <WhyList />;
  else if (lab === "traps") view = <TrapsLab />;
  else if (lab === "drugs") view = id ? <DrugRunner /> : <DrugsList />;
  else if (lab === "findings") view = <FindingsLab />;
  else if (lab === "quiz") view = <QuizLab />;
  else if (lab === "tools") view = <ToolsLab />;
  else if (lab === "osce") view = <><OsceLab /><h2 className="mt-8 font-serif text-lg font-bold text-foreground">Counselling stations on their own</h2><div className="mt-2"><CounselList /></div></>;
  else if (lab === "counsel") view = id ? <CounselRunner /> : <CounselList />;

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className={`mx-auto px-4 py-7 sm:px-5 sm:py-10 ${meta.wide ? "max-w-5xl" : "max-w-3xl"}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link to="/clinical" className="hover:underline">Clinical simulator</Link> › {meta.title}</p>
          <h1 className="mt-1 flex items-center gap-2 font-serif text-2xl font-bold leading-tight text-foreground sm:text-3xl"><Icon className="h-6 w-6 shrink-0 text-primary" /> <span className="min-w-0">{meta.h1}</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
      </section>
      <div className={`mx-auto px-4 py-6 sm:px-5 ${meta.wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <Suspense fallback={<div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><FlaskConical className="h-4 w-4 animate-pulse" /> Loading…</div>}>
          <div key={pathname}>{view}</div>
        </Suspense>
      </div>
    </div>
  );
}
