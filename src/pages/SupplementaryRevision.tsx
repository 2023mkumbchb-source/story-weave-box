import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, CheckCircle2, Clock, ExternalLink, FileQuestion, GraduationCap, Loader2, Pin, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Resource = { title: string; slug: string; kind: string; reason: string };
type Subject = { name: string; level: string; colour: string; resources: Resource[] };
type LiveResource = { id: string; title: string; category: string; type: "Article" | "Exam / MCQ" | "Flashcards"; path: string; group: string; size: number };

const GROUP_ORDER = ["Year 2 Microbiology", "Year 2 Parasitology", "Year 3 Bacteriology & Parasitology II", "Medical Virology", "Medical Mycology", "General Pathology", "Systemic Pathology", "Haematology"];

function resourceGroup(title: string, category: string): string | null {
  const text = `${title} ${category}`.toLowerCase();
  const year2 = /year\s*2/.test(category.toLowerCase());
  if (/virolog|\bvirus|\bviral|\bhiv\b|hepatitis virus/.test(text)) return "Medical Virology";
  if (/mycolog|\bfung(?:us|i|al)\b|candida|aspergill|cryptococc|histoplas/.test(text)) return "Medical Mycology";
  if (year2 && /parasitol|parasite|protozo|helminth|malaria|plasmod|schistosom|entomolog/.test(text)) return "Year 2 Parasitology";
  if (year2 && /microbiolog|bacteriolog|bacteri|staphyl|streptococ|gram[ -]/.test(text)) return "Year 2 Microbiology";
  if (/bacteriolog|parasitology ii|parasitology 2|year\s*3.*parasitol|medical microbiolog/.test(text)) return "Year 3 Bacteriology & Parasitology II";
  if (/haemat|hemat|blood transfusion|anaemia|anemia|leuk|leuka|lymphoma|coagulation|haemostasis|hemostasis/.test(text)) return "Haematology";
  if (/general pathology|cell injury|inflammation|tissue repair|wound healing|neoplas|hemodynamic|haemodynamic|immunopath/.test(text)) return "General Pathology";
  if (/patholog|oncopath|cardiovascular|respiratory|gastrointestinal|hepatobiliary|\brenal\b|endocrine|neuropath|reproductive|\bbreast\b|bone and soft tissue|\bskin\b/.test(text)) return "Systemic Pathology";
  return null;
}

const subjects: Subject[] = [
  { name: "Year 2 Microbiology", level: "Foundation microbiology — kept separate from Year 3 bacteriology", colour: "bg-sky-500", resources: [
    { title: "Principles of Medical Microbiology and Parasitology LAQs & SAQs", slug: "principles-of-medical-microbiology-and-parasitology-laqs-amp-saqs", kind: "Core notes", reason: "Verified long-form revision bank with 54,000+ characters." },
    { title: "Department of Medical Microbiology & Parasitology Past Paper", slug: "department-of-medical-microbiology-amp-parasit", kind: "Past paper", reason: "Year 2 microbiology examination practice with worked answers." },
    { title: "Medical Bacteriology and Entomology MCQs", slug: "medical-bacteriology-and-entomology", kind: "MCQ bank", reason: "High-volume recall and differential practice." },
  ]},
  { name: "Year 2 Parasitology", level: "Parasitology I — foundations, protozoa, helminths and entomology", colour: "bg-amber-500", resources: [
    { title: "Medical Parasitology", slug: "medical-parasitology-year-2", kind: "Core notes", reason: "Structured Year 2 foundation with more than 130 headings." },
    { title: "Medical Entomology Questions", slug: "medical-entomology-questions", kind: "Question bank", reason: "The largest verified parasitology resource in the catalogue." },
    { title: "Amebae: Medical Parasitology Overview", slug: "amebae", kind: "Focused notes", reason: "Protozoal morphology, disease, diagnosis and treatment." },
  ]},
  { name: "Year 3 Bacteriology & Parasitology II", level: "Applied organisms, clinical disease and laboratory diagnosis", colour: "bg-cyan-600", resources: [
    { title: "Medical Bacteriology and Parasitology End-Year Examination", slug: "medical-bacteriology-parasitology-review", kind: "Past paper", reason: "Applied Year 3 bacteriology and parasitology practice." },
    { title: "MBMM 3311 Medical Bacteriology Examination", slug: "year-2-medical-bacteriology", kind: "Exam notes", reason: "Year 3 bacteriology questions, diagnosis and worked answers." },
    { title: "Year 3 Parasitology, Entomology and Bacteriology Q&A", slug: "medical-microbiology-qampa-guide", kind: "Question bank", reason: "Integrated applied revision without replacing the Year 2 foundation sections." },
  ]},
  { name: "Medical Virology", level: "Year 3", colour: "bg-violet-500", resources: [
    { title: "Basic Virology, Viral Replication, Prions & Slow Viruses", slug: "virology-prions-poxviruses-vzv", kind: "Core exam review", reason: "Verified, structured coverage with 76 headings." },
    { title: "Hepatitis, Oncogenic Viruses & Paramyxoviruses", slug: "medical-virology-revision", kind: "Past paper", reason: "High-yield clinical virology and laboratory diagnosis." },
    { title: "Vaccines, Antivirals, Rabies, CMV & EBV", slug: "high-yield-virology-notes", kind: "Exam notes", reason: "Completes the major virus families and prevention topics." },
  ]},
  { name: "Medical Mycology", level: "Year 3", colour: "bg-fuchsia-500", resources: [
    { title: "Mycology Revision: Fungal Infections, Histoplasmosis & Cryptococcosis", slug: "mycology-revision-fungal-infections", kind: "Core notes", reason: "Verified classification, pathogenesis, diagnosis and treatment." },
    { title: "Mycoses: Superficial, Cutaneous & Systemic Fungal Infections", slug: "mycoses-fungal-infection-types", kind: "Focused notes", reason: "Organises fungi by depth and clinical syndrome." },
    { title: "Medical Virology & Mycology MCQ Bank", slug: "medical-virology-and-mycology-mcq-bank", kind: "MCQ bank", reason: "Large mixed bank for exam-speed practice." },
  ]},
  { name: "General Pathology", level: "Year 3", colour: "bg-rose-500", resources: [
    { title: "Pathology Essays", slug: "7a2c699d-pathology-essays-past-paper", kind: "Essay bank", reason: "Largest verified general-pathology essay resource." },
    { title: "Inflammation and Tissue Repair", slug: "inflammation-tissue-repair-mcqs-cellular-immunology", kind: "MCQ bank", reason: "Core mechanisms, mediators, healing and repair." },
    { title: "Neoplasia", slug: "89053c8f-neoplasia-past-paper", kind: "Past paper", reason: "High-yield carcinogenesis, grading, staging and spread." },
  ]},
  { name: "Systemic Pathology", level: "Year 3", colour: "bg-orange-500", resources: [
    { title: "Systemic Pathology Essays", slug: "6249adb1-systemic-pathology-essays-past-paper", kind: "Essay bank", reason: "Broad organ-system coverage and model answers." },
    { title: "Gastrointestinal and Liver Pathology", slug: "1de62a74-gastrointestinal-and-liver-past-paper", kind: "Past paper", reason: "Verified organ-based exam practice." },
    { title: "Cardiovascular Pathology", slug: "51f52e96-cardiovascular-pathology-past-paper", kind: "Past paper", reason: "Atherosclerosis, IHD, vascular and cardiac disease." },
  ]},
  { name: "Haematology", level: "Year 3", colour: "bg-red-600", resources: [
    { title: "Hematologic Malignancies and Bleeding Disorders", slug: "hematologic-malignancies-and-bleeding-disorders", kind: "Core notes", reason: "Anaemias, leukaemias, lymphomas and haemostasis." },
    { title: "Haematology MCQs End Year 2025", slug: "haematology-exam-mcqs", kind: "Past paper", reason: "Large recent examination bank with explanations." },
    { title: "Blood Transfusion Medicine: Exam-Focused Review", slug: "blood-transfusion-medicine-an-exam-focused-review", kind: "Focused notes", reason: "ABO/Rh, compatibility, components and reactions." },
  ]},
];

const plan = [
  ["13 Aug", "Baseline", "40 mixed questions; record weak topics; review bacterial structure and virulence"],
  ["14 Aug", "Year 2 Microbiology", "Sterilisation, disinfection, specimen collection, culture and antimicrobial testing"],
  ["15 Aug", "Year 3 Bacteriology", "Gram-positive cocci, Gram-negative organisms and laboratory diagnosis"],
  ["16 Aug", "Year 2 Parasitology I", "Protozoa: amoebae, Giardia, Trichomonas, malaria and life cycles"],
  ["17 Aug", "Year 2 Parasitology I + Year 3 Parasitology II", "Helminths, schistosomiasis, filariasis, entomology and applied diagnosis"],
  ["18 Aug", "Virology I", "Structure, classification, replication, pathogenesis, diagnostics and vaccines"],
  ["19 Aug", "Virology II", "HIV, hepatitis, herpesviruses, respiratory and oncogenic viruses"],
  ["20 Aug", "Mycology", "Classification, superficial/systemic/opportunistic mycoses and antifungals"],
  ["21 Aug", "General Pathology I", "Cell injury, adaptation, necrosis, apoptosis and inflammation"],
  ["22 Aug", "General Pathology II", "Healing, haemodynamic disorders, immunopathology and neoplasia"],
  ["23 Aug", "Systemic Pathology I", "Cardiovascular, respiratory, gastrointestinal and hepatobiliary"],
  ["24 Aug", "Systemic Pathology II", "Renal, endocrine, CNS, reproductive, breast, bone and skin"],
  ["25 Aug", "Haematology I", "RBC indices, anaemia approach, haemolysis and haemoglobin disorders"],
  ["26 Aug", "Haematology II", "Leukaemias, lymphomas, plasma-cell disorders and marrow failure"],
  ["27 Aug", "Haematology III", "Platelets, coagulation, bleeding disorders and blood transfusion"],
  ["28 Aug", "Mock 1", "Timed microbiology, parasitology, virology and mycology paper; correct every error"],
  ["29 Aug", "Mock 2", "Timed general and systemic pathology paper; write two essay outlines"],
  ["30 Aug", "Mock 3", "Timed haematology paper; revisit the three weakest topics"],
  ["31 Aug", "Final recall", "Life cycles, diagnostic algorithms, comparison tables and error notebook only"],
  ["1 Sep", "Exam day", "20-minute light recall; no new material; arrive early and rested"],
] as const;

export default function SupplementaryRevision() {
  const [done, setDone] = useState<string[]>(() => JSON.parse(localStorage.getItem("supplementary-plan-done") || "[]"));
  const [allResources, setAllResources] = useState<LiveResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourceError, setResourceError] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  useEffect(() => localStorage.setItem("supplementary-plan-done", JSON.stringify(done)), [done]);
  useEffect(() => {
    let active = true;
    (async () => {
      setResourcesLoading(true); setResourceError(false);
      const [articles, exams, flashcards] = await Promise.all([
        supabase.from("articles").select("id,title,slug,category,content").eq("published", true).is("deleted_at", null),
        supabase.from("mcq_sets").select("id,title,slug,category,questions").eq("published", true).is("deleted_at", null),
        supabase.from("flashcard_sets").select("id,title,slug,category,cards").eq("published", true).is("deleted_at", null),
      ]);
      if (!active) return;
      if (articles.error || exams.error || flashcards.error) { setResourceError(true); setResourcesLoading(false); return; }
      const rows: LiveResource[] = [];
      for (const row of articles.data || []) {
        const group = resourceGroup(row.title, row.category); if (!group) continue;
        rows.push({ id: row.id, title: row.title, category: row.category, type: "Article", path: `/blog/${row.slug || row.id}`, group, size: row.content?.length || 0 });
      }
      for (const row of exams.data || []) {
        const group = resourceGroup(row.title, row.category); if (!group) continue;
        rows.push({ id: row.id, title: row.title, category: row.category, type: "Exam / MCQ", path: `/exams/${row.slug || row.id}/start`, group, size: Array.isArray(row.questions) ? row.questions.length : 0 });
      }
      for (const row of flashcards.data || []) {
        const group = resourceGroup(row.title, row.category); if (!group) continue;
        rows.push({ id: row.id, title: row.title, category: row.category, type: "Flashcards", path: `/flashcards/${row.slug || row.id}`, group, size: Array.isArray(row.cards) ? row.cards.length : 0 });
      }
      rows.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.title.localeCompare(b.title));
      setAllResources(rows); setResourcesLoading(false);
    })().catch(() => { if (active) { setResourceError(true); setResourcesLoading(false); } });
    return () => { active = false; };
  }, []);
  const progress = useMemo(() => Math.round((done.length / plan.length) * 100), [done]);
  const visibleResources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allResources.filter((item) => (groupFilter === "All" || item.group === groupFilter) && (!needle || `${item.title} ${item.category} ${item.type}`.toLowerCase().includes(needle)));
  }, [allResources, groupFilter, query]);
  const groupedResources = useMemo(() => GROUP_ORDER.map((group) => ({ group, resources: visibleResources.filter((item) => item.group === group) })).filter((entry) => entry.resources.length), [visibleResources]);
  const toggle = (date: string) => setDone((current) => current.includes(date) ? current.filter((x) => x !== date) : [...current, date]);

  return <>
    <Helmet>
      <title>Supplementary Exam Revision Plan 2026 | Ompath Study</title>
      <meta name="description" content="A focused revision schedule for microbiology, parasitology, virology, mycology, general and systemic pathology, and haematology before 1 September 2026." />
    </Helmet>
    <div className="bg-gradient-to-b from-primary/10 via-background to-background">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><Target className="h-4 w-4" /> Supplementary exam sprint</span>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-5xl">Your focused revision plan to 1 September</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">Seven examinable areas, correctly separated by year and taught in three passes: understand, retrieve, then perform under time.</p>
          <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm font-semibold"><span>{done.length} of {plan.length} days completed</span><span>{progress}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>
    </div>

    <div className="mx-auto max-w-6xl space-y-12 px-4 pb-16">
      <section>
        <div className="mb-5 flex items-center gap-2"><Pin className="h-5 w-5 text-primary" /><h2 className="font-serif text-2xl font-bold">Pinned verified resources</h2></div>
        <div className="grid gap-5 lg:grid-cols-2">
          {subjects.map((subject) => <article key={subject.name} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-start gap-3 border-b p-4"><span className={`mt-1 h-3 w-3 rounded-full ${subject.colour}`} /><div><h3 className="font-bold">{subject.name}</h3><p className="text-xs text-muted-foreground">{subject.level}</p></div></div>
            <div className="divide-y">{subject.resources.map((resource) => <Link key={resource.slug} to={`/blog/${resource.slug}`} className="group flex gap-3 p-4 transition-colors hover:bg-muted/50">
              <BookOpen className="mt-1 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold group-hover:text-primary">{resource.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{resource.kind} · {resource.reason}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>)}</div>
          </article>)}
        </div>
      </section>

      <section id="all-resources" className="scroll-mt-24">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Complete live library</p><h2 className="font-serif text-2xl font-bold">All revision resources on the site</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{allResources.length} resources</span></div>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">Automatically includes every published note, CAT, past paper, essay bank, MCQ/exam and flashcard set matching your supplementary units. New matching material appears here automatically.</p>
        <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all revision materials…" className="pl-9" /></label>
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>All</option>{GROUP_ORDER.map((group) => <option key={group}>{group}</option>)}</select>
        </div>
        {resourcesLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : resourceError ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">The live resource catalogue could not load. Refresh to try again.</p> : groupedResources.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No resources match this search.</p> : <div className="space-y-7">
          {groupedResources.map(({ group, resources }) => <div key={group}><div className="mb-3 flex items-center justify-between border-b pb-2"><h3 className="font-serif text-xl font-bold">{group}</h3><span className="text-xs font-semibold text-muted-foreground">{resources.length}</span></div><div className="grid gap-2 md:grid-cols-2">
            {resources.map((resource) => { const Icon = resource.type === "Article" ? BookOpen : resource.type === "Flashcards" ? GraduationCap : FileQuestion; return <Link key={`${resource.type}-${resource.id}`} to={resource.path} className="group flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5 group-hover:text-primary">{resource.title}</span><span className="mt-1 block text-xs text-muted-foreground">{resource.type} · {resource.category}{resource.size ? ` · ${resource.type === "Article" ? `${Math.max(1, Math.round(resource.size / 1000))}k characters` : `${resource.size} items`}` : ""}</span></span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></Link>; })}
          </div></div>)}
        </div>}
      </section>

      <section>
        <div className="mb-5 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-serif text-2xl font-bold">Daily schedule</h2></div>
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6"><strong>Daily method:</strong> 60–90 min notes → 45–60 min closed-book questions → 20 min correction log. On mock days, reproduce exam timing and mark every uncertain answer.</div>
        <div className="space-y-2">{plan.map(([date, subject, task]) => {
          const checked = done.includes(date);
          return <button key={date} onClick={() => toggle(date)} className={`grid w-full grid-cols-[2.5rem_4.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl border p-3 text-left transition-colors sm:grid-cols-[2.5rem_5rem_9rem_minmax(0,1fr)] ${checked ? "border-primary/30 bg-primary/5" : "bg-card hover:border-primary/30"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{checked && <CheckCircle2 className="h-4 w-4" />}</span>
            <span className="pt-1 text-xs font-bold text-muted-foreground">{date}</span><span className="col-span-2 font-semibold sm:col-span-1">{subject}</span><span className="col-start-3 text-sm leading-6 text-muted-foreground sm:col-start-4">{task}</span>
          </button>;
        })}</div>
      </section>

      <section className="rounded-2xl bg-foreground p-6 text-background sm:p-8">
        <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h2 className="font-serif text-2xl font-bold">Non-negotiable exam rules</h2></div>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-background/80 sm:grid-cols-2"><li>• Draw every parasite life cycle from memory.</li><li>• For organisms, learn transmission → disease → specimen → test → treatment.</li><li>• For pathology essays, use definition → causes → pathogenesis → morphology → complications.</li><li>• For haematology, interpret indices and coagulation results before naming the disease.</li><li>• Reattempt every wrong question after 24–48 hours.</li><li>• On 31 August, revise your error notebook—not whole textbooks.</li></ul>
      </section>
    </div>
  </>;
}
