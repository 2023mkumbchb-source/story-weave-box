import { describe, it } from "vitest";
import { preprocessContent } from "@/pages/BlogPost";
const cases = [
  "Entner pathway is NOT found in: A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both (a) and (b)D. Eukaryotes E. Atypical",
  "*Entner pathway is NOT found in:* A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both x and yD. Eukaryotes E. Atypical",
];
describe("d", () => { it("x", () => { cases.forEach((c) => console.log(JSON.stringify(preprocessContent(c).split("\n")))); }); });
