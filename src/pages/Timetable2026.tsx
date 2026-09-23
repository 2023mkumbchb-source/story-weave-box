import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, GraduationCap, Hospital, UsersRound } from "lucide-react";
import {
  MBCHB_2026_TRIMESTER_1,
  OFFICIAL_2026_SCHEDULES,
  YEAR_TEACHING_STAFF,
} from "@/lib/timetable2026";

const YEAR_LABELS: Record<number, string> = {
  1: "Year 1 · 2026 intake",
  2: "Year 2 · 2025 intake",
  3: "Year 3 · 2024 intake",
  4: "Year 4 · 2023 intake",
  5: "Year 5 · 2022 intake",
  6: "Year 6 · 2021 intake",
};

const YEAR4_UNITS = [
  ["MBSG 4611", "Junior Clerkship in General Surgery I", "Dr. Mark Siboe"],
  ["MBSG 4612", "Junior Clerkship in General Surgery II", "Dr. Mark Siboe"],
  ["MBSG 4613a", "Clinical Rotation for Junior Clerkship in General Surgery I", "Dr. Mark Siboe"],
  ["MBSG 4613b", "Clinical Rotation for Junior Clerkship in General Surgery I", "No lecturer"],
  ["MBSG 4626a", "Clinical Rotation for Junior Clerkship in General Surgery II", "Dr. Mark Siboe"],
  ["MBSG 4626b", "Clinical Rotation for Junior Clerkship in General Surgery II", "No lecturer"],
  ["MBSG 4639a", "Clinical Rotation for Junior Clerkship in General Surgery III", "No lecturer"],
  ["MBSG 4639b", "Clinical Rotation for Junior Clerkship in General Surgery III", "Dr. Mulongo"],
  ["MBSG 4640a", "Clinical Rotation for Junior Clerkship in General Surgery IV", "Dr. Njuguna"],
  ["MBSG 4640b", "Clinical Rotation for Junior Clerkship in General Surgery IV", "Dr. Mulongo"],
  ["MBIM 4111", "Junior Clerkship in Internal Medicine I", "Dr. Rosslyn Ngugi"],
  ["MBIM 4112", "Junior Clerkship in Internal Medicine II", "Dr. Alex Mogere"],
  ["MBIM 4113a", "Clinical Rotation for Junior Clerkship in Internal Medicine I", "Dr. Rosslyn Ngugi"],
  ["MBIM 4113b", "Clinical Rotation for Junior Clerkship in Internal Medicine I", "No lecturer"],
  ["MBIM 4126a", "Clinical Rotation for Junior Clerkship in Internal Medicine II", "Dr. Alex Mogere"],
  ["MBIM 4126b", "Clinical Rotation for Junior Clerkship in Internal Medicine II", "No lecturer"],
  ["MBIM 4139a", "Clinical Rotation for Junior Clerkship in Internal Medicine III", "Dr. Rosslyn Ngugi"],
  ["MBIM 4139b", "Clinical Rotation for Junior Clerkship in Internal Medicine III", "No lecturer"],
  ["MBIM 4140a", "Clinical Rotation for Junior Clerkship in Internal Medicine IV", "Dr. Rosslyn Ngugi"],
  ["MBIM 4140b", "Clinical Rotation for Junior Clerkship in Internal Medicine IV", "No lecturer"],
  ["MBOG 4211", "Junior Clerkship in Reproductive Health I (OBS)", "Dr. Muthoni Ritho"],
  ["MBOG 4212", "Junior Clerkship in Reproductive Health II (GYN)", "Dr. Momanyi Mokaya"],
  ["MBOG 4213a", "Clinical Rotation for Junior Clerkship in Reproductive Health I", "Dr. Muthoni Ritho"],
  ["MBOG 4213b", "Clinical Rotation for Junior Clerkship in Reproductive Health I", "No lecturer"],
  ["MBOG 4226a", "Clinical Rotation for Junior Clerkship in Reproductive Health II", "Dr. Kinuthia"],
  ["MBOG 4226b", "Clinical Rotation for Junior Clerkship in Reproductive Health II", "No lecturer"],
  ["MBOG 4239a", "Clinical Rotation for Junior Clerkship in Reproductive Health III", "Dr. Momanyi Mokaya"],
  ["MBOG 4239b", "Clinical Rotation for Junior Clerkship in Reproductive Health III", "No lecturer"],
  ["MBOG 4240a", "Clinical Rotation for Junior Clerkship in Reproductive Health IV", "Dr. Momanyi Mokaya"],
  ["MBOG 4240b", "Clinical Rotation for Junior Clerkship in Reproductive Health IV", "No lecturer"],
  ["MBPE 4311", "Junior Clerkship in Pediatrics and Child Health", "Dr. Rose Munge"],
  ["MBPE 4312", "Junior Clerkship in Pediatrics and Child Health", "Dr. Agisa"],
  ["MBPE 4313a", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health I", "Dr. Rose Munge"],
  ["MBPE 4313b", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health I", "No lecturer"],
  ["MBPE 4326a", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health II", "Dr. Agisa"],
  ["MBPE 4326b", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health II", "No lecturer"],
  ["MBPE 4339a", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health III", "Dr. Rose Munge"],
  ["MBPE 4339b", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health III", "No lecturer"],
  ["MBPE 4340a", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health IV", "Dr. Rose Munge"],
  ["MBPE 4340b", "Clinical Rotation for Junior Clerkship in Pediatrics and Child Health IV", "No lecturer"],
  ["MBPS 4511", "Junior Clerkship in Mental Health I", "Dr. Neema Araka"],
  ["MBPS 4512", "Junior Clerkship in Mental Health II", "No lecturer"],
  ["MBPS 4513a", "Clinical Rotation for Junior Clerkship in Mental Health I", "No lecturer"],
  ["MBPS 4513b", "Clinical Rotation for Junior Clerkship in Mental Health I", "No lecturer"],
  ["MBPS 4526a", "Clinical Rotation for Junior Clerkship in Mental Health II", "Dr. Neema Araka"],
  ["MBPS 4526b", "Clinical Rotation for Junior Clerkship in Mental Health II", "No lecturer"],
  ["MBPS 4537a", "Clinical Rotation for Junior Clerkship in Mental Health III", "No lecturer"],
  ["MBPS 4537b", "Clinical Rotation for Junior Clerkship in Mental Health III", "No lecturer"],
  ["MBPS 4538a", "Clinical Rotation for Junior Clerkship in Mental Health IV", "No lecturer"],
  ["MBPS 4538b", "Clinical Rotation for Junior Clerkship in Mental Health IV", "No lecturer"],
  ["MBPL 4411", "Clinical Pharmacology", "Dr. Ndemo"],
] as const;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function semesterWeek() {
  const start = new Date(`${MBCHB_2026_TRIMESTER_1.startDate}T00:00:00`);
  const elapsed = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  return Math.floor(elapsed / 7) + 1;
}

export default function Timetable2026() {
  const [year, setYear] = useState(4);
  const [openTable, setOpenTable] = useState(0);
  const schedules = OFFICIAL_2026_SCHEDULES[year] || [];
  const staff = YEAR_TEACHING_STAFF[year] || [];
  const week = semesterWeek();

  const unitRows = useMemo(() => year === 4 ? YEAR4_UNITS : [], [year]);

  return (
    <section className="min-h-[70vh] bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                <CalendarDays className="h-4 w-4" />
                Official 2026 timetable
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">MBChB September–December 2026</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Choose any year to view the published weekly timetable. The teaching period runs from 7 September to 4 December 2026, with the end-semester CAT scheduled for 8–12 December.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-3"><p className="font-serif text-xl font-bold">Week {week}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Current</p></div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3"><p className="font-serif text-xl font-bold">1–6</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Years</p></div>
              <div className="hidden rounded-2xl border border-border bg-background px-4 py-3 sm:block"><p className="font-serif text-xl font-bold">2026</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Trimester 1</p></div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[1,2,3,4,5,6].map((n) => (
              <button key={n} onClick={() => { setYear(n); setOpenTable(0); }} className={`rounded-2xl border px-3 py-3 text-left transition ${year === n ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Year {n}</p>
                <p className="mt-1 text-xs font-semibold">{YEAR_LABELS[n].split(" · ")[1]}</p>
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-bold">{YEAR_LABELS[year]}</h2>
            {year === 4 && <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">Junior clerkship · Thika Level 5</span>}
            {year === 6 && <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">Senior clerkship · TL5 / KUTRRH</span>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {staff.map((name) => <span key={name} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">{name}</span>)}
          </div>

          <div className="mt-7 space-y-3">
            {schedules.map((table, index) => (
              <div key={table.label} className="overflow-hidden rounded-2xl border border-border bg-background">
                <button onClick={() => setOpenTable(openTable === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left">
                  <span><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{year === 4 || year === 5 || year === 6 ? "Rotation / teaching grid" : "Weekly timetable"}</span><span className="mt-1 block text-sm font-bold">{table.label}</span></span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openTable === index ? "rotate-180" : ""}`} />
                </button>
                {openTable === index && (
                  <div className="border-t border-border p-3 sm:p-4">
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="min-w-[900px] w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border-b border-r border-border p-2 text-left">Day</th>
                            <th className="border-b border-r border-border p-2 text-left">Group</th>
                            {table.timeBands.map((band) => <th key={band} className="border-b border-border p-2 text-left">{band}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, ri) => (
                            <tr key={`${row.day}-${row.group || ""}-${ri}`} className="align-top">
                              <td className="border-b border-r border-border p-2 font-bold whitespace-nowrap">{row.day}</td>
                              <td className="border-b border-r border-border p-2 font-bold text-primary">{row.group || "All"}</td>
                              <td colSpan={table.timeBands.length} className="border-b border-border p-2">
                                <div className="flex flex-wrap gap-2">
                                  {row.entries.map((entry, ei) => <span key={`${entry}-${ei}`} className="rounded-lg border border-border bg-card px-2.5 py-2 font-medium">{cleanText(entry)}</span>)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                      This view preserves the published unit codes, groups, venues and rotation labels. It does not infer a learner's individual group or rotation when the profile does not contain that information.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {year === 4 && (
            <div className="mt-7 rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Year 4 · this semester</p>
                  <h3 className="mt-1 font-serif text-xl font-bold">All official Year 4 units and lecturers</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">These are the unit codes/titles and lecturer assignments published in the September–December 2026 timetable. Clinical rotations are included because they are part of the timetable.</p>
                </div>
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[760px] w-full text-xs">
                  <thead><tr className="border-b border-border text-left"><th className="p-2">Code</th><th className="p-2">Unit</th><th className="p-2">Lecturer</th></tr></thead>
                  <tbody>{unitRows.map(([code,title,lecturer]) => <tr key={code} className="border-b border-border/70"><td className="p-2 font-mono font-bold text-primary">{code}</td><td className="p-2">{title}</td><td className="p-2 text-muted-foreground">{lecturer}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
                <Hospital className="h-4 w-4 shrink-0 text-primary" />
                Year 4 clinical rotations are scheduled at Thika Level 5 Hospital; common-class venue is listed as to be determined in the official timetable.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
