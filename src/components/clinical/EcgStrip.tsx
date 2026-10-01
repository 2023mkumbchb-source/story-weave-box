import { useMemo } from "react";
import type { EcgKind } from "@/clinical/stations";

const W = 640; const H = 150; const BASE = 90;
const g = (x: number, mu: number, sd: number, amp: number) => amp * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));

interface Beat { at: number; p?: boolean; wide?: boolean; st?: number; t?: number; tw?: number; r?: number; pr?: number }

/** Each rhythm is a list of beats; y(x) is the sum of small waves, so the tracing is generated rather than drawn from an image. */
function beatsFor(kind: EcgKind): { beats: Beat[]; noise?: number; flutter?: number; extraP?: number } {
  const regular = (rr: number, f: (i: number) => Beat) => Array.from({ length: Math.ceil(W / rr) + 1 }, (_, i) => f(i));
  switch (kind) {
    case "af": { const rrs = [70, 112, 60, 95, 128, 66, 101, 84, 118, 72]; let x = 24; return { beats: rrs.map((rr) => { const b = { at: x, p: false } as Beat; x += rr; return b; }), noise: 2.2 }; }
    case "stemi": return { beats: regular(100, (i) => ({ at: 30 + i * 100, p: true, st: 24, t: 14, tw: 18 })) };
    case "hyperk": return { beats: regular(88, (i) => ({ at: 30 + i * 88, p: false, wide: true, t: 40, tw: 8 })) };
    case "chb": return { beats: regular(150, (i) => ({ at: 40 + i * 150, p: false, wide: true, t: 6, tw: 14 })), extraP: 52 };
    case "svt": return { beats: regular(42, (i) => ({ at: 20 + i * 42, p: false, t: 5, tw: 7, r: 0.8 })) };
    case "pe": return { beats: regular(46, (i) => ({ at: 20 + i * 46, p: true, t: -10, tw: 7, r: 0.8, pr: 14 })) };
    case "flutter": return { beats: regular(120, (i) => ({ at: 30 + i * 120, p: false, t: 4, tw: 10 })), flutter: 40 };
    case "vt": return { beats: regular(44, (i) => ({ at: 20 + i * 44, p: false, wide: true, r: 1.5, t: 0 })) };
  }
}

export default function EcgStrip({ kind, label }: { kind: EcgKind; label?: string }) {
  const d = useMemo(() => {
    const { beats, noise = 0, flutter = 0, extraP = 0 } = beatsFor(kind);
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 1) {
      let y = 0;
      for (const b of beats) {
        const r = b.r ?? 1; const wide = b.wide ? 2.2 : 1;
        if (b.p) y += g(x, b.at, 5, 6) * 1;
        if (b.pr !== undefined) { /* shortened PR already by spacing */ }
        const q = b.at + 18;
        // QRS: sharp spike (wide variant is broader and taller)
        y += g(x, q, 1.6 * wide, 46 * r) - g(x, q - 4 * wide, 1.3, 8) - g(x, q + 5 * wide, 1.8 * wide, 12 * r);
        if (b.st) y += (x > q + 6 && x < q + 52) ? b.st * Math.exp(-((x - (q + 6)) / 70)) : 0;
        if (b.t) y += g(x, q + 34 * wide, b.tw ?? 12, b.t);
      }
      if (extraP) y += g(((x % extraP) + extraP) % extraP, extraP / 2, 4, 6);
      if (flutter) y += 7 * (((x % 30) / 30) - 0.5) * (flutter / 40) * 2;
      if (noise) y += noise * Math.sin(x * 0.9) + noise * 0.7 * Math.sin(x * 1.7 + 1);
      pts.push(`${x},${(BASE - y).toFixed(1)}`);
    }
    return "M" + pts.join(" L");
  }, [kind]);
  return (
    <figure className="overflow-hidden rounded-xl border border-rose-300/60 bg-rose-50">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? "ECG rhythm strip"} className="block h-auto w-full">
        <defs>
          <pattern id="ecg-small" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="rgb(244 63 94 / .18)" strokeWidth=".6" /></pattern>
          <pattern id="ecg-big" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="url(#ecg-small)" /><path d="M40 0H0V40" fill="none" stroke="rgb(244 63 94 / .38)" strokeWidth=".9" /></pattern>
        </defs>
        <rect width={W} height={H} fill="url(#ecg-big)" />
        <path d={d} fill="none" stroke="#111827" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {label && <figcaption className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">{label}</figcaption>}
    </figure>
  );
}
