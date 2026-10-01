import { useMemo, useState } from "react";
import { anionGap, bmi, bmiBand, correctedCalcium, correctedSodium, eddFromLmp, eGFRCockcroft, fmtGa, GCS, gcsBand, gestationDays, ivDose, map, maintenancePerHour, MNEMONICS, paedWeight, parkland, RANGES, SCORES, shockIndex, type ScoreDef } from "@/clinical/tools";

const TONE = { good: "border-emerald-500/50 bg-emerald-500/10 text-emerald-800", warn: "border-amber-500/50 bg-amber-500/10 text-amber-800", bad: "border-rose-500/50 bg-rose-500/10 text-rose-800" };
const inputCls = "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Num({ label, value, set, unit, step = "any" }: { label: string; value: string; set: (v: string) => void; unit?: string; step?: string }) {
  return (
    <label className="block min-w-0 text-[11px] font-bold text-muted-foreground">{label}{unit ? <span className="font-normal"> ({unit})</span> : null}
      <input type="number" inputMode="decimal" step={step} value={value} onChange={(e) => set(e.target.value)} className={`${inputCls} mt-1 text-foreground`} />
    </label>
  );
}
const n = (s: string) => (s === "" ? NaN : Number(s));
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
function Out({ children, tone }: { children: React.ReactNode; tone?: keyof typeof TONE }) { return <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold leading-relaxed ${tone ? TONE[tone] : "border-border bg-muted/40 text-foreground"}`}>{children}</div>; }
function Panel({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border bg-card p-4"><h3 className="font-serif text-base font-bold text-foreground">{title}</h3>{blurb && <p className="mt-0.5 text-[11px] text-muted-foreground">{blurb}</p>}<div className="mt-3">{children}</div></section>;
}

function ScorePanel({ def }: { def: ScoreDef }) {
  const [on, setOn] = useState<string[]>([]);
  const score = def.items.filter((i) => on.includes(i.id)).reduce((s, i) => s + i.pts, 0);
  const band = def.band(score);
  return (
    <Panel title={def.title} blurb={def.blurb}>
      <ul className="space-y-1.5">{def.items.map((i) => <li key={i.id}><label className="flex cursor-pointer items-start gap-2 text-xs"><input type="checkbox" checked={on.includes(i.id)} onChange={() => setOn((a) => (a.includes(i.id) ? a.filter((x) => x !== i.id) : [...a, i.id]))} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" /><span className="min-w-0 flex-1">{i.label}</span><span className="shrink-0 text-muted-foreground">+{i.pts}</span></label></li>)}</ul>
      <Out tone={band.tone}>Score {score}: {band.text}</Out>
    </Panel>
  );
}

function Gcs() {
  const [e, setE] = useState(4); const [v, setV] = useState(5); const [m, setM] = useState(6);
  const total = e + v + m; const b = gcsBand(total);
  const sel = (label: string, opts: [string, number][], val: number, set: (n: number) => void) => (
    <label className="block min-w-0 text-[11px] font-bold text-muted-foreground">{label}<select value={val} onChange={(x) => set(Number(x.target.value))} className={`${inputCls} mt-1 text-foreground`}>{opts.map(([t, p]) => <option key={t} value={p}>{p} — {t}</option>)}</select></label>
  );
  return <Panel title="Glasgow Coma Scale" blurb="Report as GCS 14 (E4 V4 M6) — always the components, not just the total.">{<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{sel("Eye", GCS.eye, e, setE)}{sel("Verbal", GCS.verbal, v, setV)}{sel("Motor", GCS.motor, m, setM)}</div>}<Out tone={b.tone}>GCS {total} (E{e} V{v} M{m}) — {b.text}</Out></Panel>;
}

export function ToolsLab() {
  const [tab, setTab] = useState<"calc" | "scores" | "ranges" | "memory">("calc");
  const [wt, setWt] = useState("70"); const [ht, setHt] = useState("170");
  const [sys, setSys] = useState("100"); const [dia, setDia] = useState("60"); const [hr, setHr] = useState("110");
  const [age, setAge] = useState("5"); const [ageUnit, setAgeUnit] = useState<"y" | "m">("y");
  const [tbsa, setTbsa] = useState("15"); const [bw, setBw] = useState("14");
  const [na, setNa] = useState("140"); const [cl, setCl] = useState("100"); const [hco3, setHco3] = useState("12"); const [k, setK] = useState("4.5");
  const [ca, setCa] = useState("2.0"); const [alb, setAlb] = useState("25"); const [glu, setGlu] = useState("30"); const [na2, setNa2] = useState("128");
  const [lmp, setLmp] = useState(""); const [mgkg, setMgkg] = useState("50"); const [dkg, setDkg] = useState("14");
  const [yrs, setYrs] = useState("55"); const [crea, setCrea] = useState("120"); const [female, setFemale] = useState(false);

  const ageYears = ageUnit === "y" ? n(age) : n(age) / 12;
  const pw = paedWeight(ageYears);
  const lmpDate = lmp ? new Date(lmp) : null;
  const days = lmpDate ? gestationDays(lmpDate) : NaN;
  const ag = anionGap(n(na), n(cl), n(hco3), n(k));
  const bmiVal = bmi(n(wt), n(ht));
  const shock = shockIndex(n(hr), n(sys));
  const mp = map(n(sys), n(dia));
  const park = parkland(n(bw), n(tbsa));
  const tabs = useMemo(() => [["calc", "Calculators"], ["scores", "Risk scores"], ["ranges", "Normal values"], ["memory", "Checklists"]] as const, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold ${tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{label}</button>)}</div>
      <p className="rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">Revision aids for the ward round. Always check results against your hospital protocol and use clinical judgement before acting on any number.</p>

      {tab === "calc" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Panel title="Vital sign maths" blurb="MAP, shock index and BMI.">
            <div className="grid grid-cols-3 gap-2"><Num label="Systolic" value={sys} set={setSys} unit="mmHg" /><Num label="Diastolic" value={dia} set={setDia} unit="mmHg" /><Num label="Pulse" value={hr} set={setHr} unit="/min" /></div>
            <Out tone={mp < 65 || shock > 0.9 ? "bad" : "good"}>MAP {f(mp, 0)} mmHg · shock index {f(shock, 2)} {shock > 0.9 ? "— raised: think shock" : "— normal (< 0.7)"}</Out>
            <div className="mt-3 grid grid-cols-2 gap-2"><Num label="Weight" value={wt} set={setWt} unit="kg" /><Num label="Height" value={ht} set={setHt} unit="cm" /></div>
            <Out>BMI {f(bmiVal)} kg/m² — {Number.isFinite(bmiVal) ? bmiBand(bmiVal) : "—"}</Out>
          </Panel>
          <Panel title="Child: weight, fluids, dose" blurb="Estimate weight, then work out boluses and doses in mg/kg.">
            <div className="grid grid-cols-2 gap-2"><Num label="Age" value={age} set={setAge} unit={ageUnit === "y" ? "years" : "months"} /><label className="block text-[11px] font-bold text-muted-foreground">Unit<select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value as "y" | "m")} className={`${inputCls} mt-1 text-foreground`}><option value="y">years</option><option value="m">months</option></select></label></div>
            <Out>Estimated weight {f(pw)} kg · 20 ml/kg bolus = {f(pw * 20, 0)} ml (10–15 ml/kg in severe malnutrition = {f(pw * 10, 0)}–{f(pw * 15, 0)} ml) · maintenance {f(maintenancePerHour(pw), 0)} ml/h</Out>
            <div className="mt-3 grid grid-cols-2 gap-2"><Num label="Dose" value={mgkg} set={setMgkg} unit="mg/kg" /><Num label="Weight" value={dkg} set={setDkg} unit="kg" /></div>
            <Out>{f(ivDose(n(mgkg), n(dkg)), 0)} mg per dose</Out>
          </Panel>
          <Panel title="Burns: Parkland formula" blurb="4 ml × weight × %TBSA over 24 h; half in the first 8 hours from the time of the burn. Add maintenance for children.">
            <div className="grid grid-cols-2 gap-2"><Num label="%TBSA burnt" value={tbsa} set={setTbsa} unit="%" /><Num label="Weight" value={bw} set={setBw} unit="kg" /></div>
            <Out>{f(park, 0)} ml in 24 h · first 8 h: {f(park / 2, 0)} ml ({f(park / 2 / 8, 0)} ml/h) · next 16 h: {f(park / 2 / 16, 0)} ml/h{Number(bw) < 30 ? ` · plus maintenance ${f(maintenancePerHour(n(bw)), 0)} ml/h` : ""}</Out>
          </Panel>
          <Panel title="Acid–base and electrolytes" blurb="Anion gap (normal 8–12 without K⁺).">
            <div className="grid grid-cols-4 gap-2"><Num label="Na⁺" value={na} set={setNa} /><Num label="Cl⁻" value={cl} set={setCl} /><Num label="HCO₃⁻" value={hco3} set={setHco3} /><Num label="K⁺" value={k} set={setK} /></div>
            <Out tone={ag - n(k) > 12 ? "warn" : "good"}>Anion gap {f(ag - n(k), 0)} (with K⁺: {f(ag, 0)}) {ag - n(k) > 12 ? "— raised: lactate, ketones, uraemia, toxins (MUDPILES)" : "— normal"}</Out>
            <div className="mt-3 grid grid-cols-2 gap-2"><Num label="Calcium" value={ca} set={setCa} unit="mmol/L" /><Num label="Albumin" value={alb} set={setAlb} unit="g/L" /></div>
            <Out>Corrected calcium {f(correctedCalcium(n(ca), n(alb)), 2)} mmol/L</Out>
            <div className="mt-3 grid grid-cols-2 gap-2"><Num label="Sodium" value={na2} set={setNa2} unit="mmol/L" /><Num label="Glucose" value={glu} set={setGlu} unit="mmol/L" /></div>
            <Out>Glucose-corrected sodium {f(correctedSodium(n(na2), n(glu)), 0)} mmol/L</Out>
          </Panel>
          <Panel title="Kidney: Cockcroft–Gault" blurb="Creatinine clearance, used for drug dosing. Unreliable in AKI.">
            <div className="grid grid-cols-3 gap-2"><Num label="Age" value={yrs} set={setYrs} unit="y" /><Num label="Weight" value={wt} set={setWt} unit="kg" /><Num label="Creatinine" value={crea} set={setCrea} unit="µmol/L" /></div>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={female} onChange={(e) => setFemale(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Female</label>
            <Out>{f(eGFRCockcroft(n(yrs), n(wt), n(crea), female), 0)} ml/min</Out>
          </Panel>
          <Panel title="Pregnancy dates" blurb="Naegele’s rule: LMP + 280 days.">
            <label className="block text-[11px] font-bold text-muted-foreground">First day of last menstrual period<input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className={`${inputCls} mt-1 text-foreground`} /></label>
            <Out>{lmpDate && Number.isFinite(days) ? `EDD ${eddFromLmp(lmpDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} · gestation today ${days >= 0 ? fmtGa(days) : "—"}` : "Choose the LMP date."}</Out>
          </Panel>
          <Gcs />
        </div>
      )}

      {tab === "scores" && <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{SCORES.map((s) => <ScorePanel key={s.id} def={s} />)}</div>}

      {tab === "ranges" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RANGES.map((g) => <Panel key={g.group} title={g.group}><dl className="divide-y divide-border text-xs">{g.rows.map(([a, b]) => <div key={a} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"><dt className="font-semibold text-foreground">{a}</dt><dd className="text-right text-muted-foreground">{b}</dd></div>)}</dl></Panel>)}
        </div>
      )}

      {tab === "memory" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {MNEMONICS.map((m) => <Panel key={m.title} title={m.title}><ul className="space-y-1 text-xs leading-relaxed text-foreground">{m.lines.map((l) => <li key={l}>• {l}</li>)}</ul></Panel>)}
        </div>
      )}
    </div>
  );
}
