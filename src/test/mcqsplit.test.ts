import { describe, it } from "vitest";
import { preprocessContent } from "@/pages/BlogPost";
const cases = [
  "*Entner-Doudoroff pathway is NOT found in:* A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both (a) and (b)D. Eukaryotes E. Atypical viral agents",
  "Entner-Doudoroff pathway is NOT found in: A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both x and yD. Eukaryotes E. Atypical viral agents",
  "Entner pathway is NOT found in: A. Aerobic prokaryotes B. Anaerobic prokaryotes C. Both D. Eukaryotes E. Atypical",
];
describe("d", () => { it("x", () => { cases.forEach((c) => console.log(JSON.stringify(preprocessContent(c).split("\n")))); }); });
