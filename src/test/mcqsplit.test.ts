import { describe, it, expect } from "vitest";
import { preprocessContent } from "@/pages/BlogPost";
describe("mcq preprocessing", () => {
  it("splits glued choice runs with inline (a)/(b) references", () => {
    expect(preprocessContent("Entner pathway is NOT found in: A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both (a) and (b)D. Eukaryotes E. Atypical").split("\n"))
      .toEqual(["Entner pathway is NOT found in", "A) Aerobic prokaryotes", "B) Anaerobic prokaryotes", "C) Both (a) and (b)", "D) Eukaryotes", "E) Atypical"]);
  });
  it("leaves medical prose alone", () => {
    const prose = "Spores of B. subtilis and C. tetani were compared in the assay.";
    expect(preprocessContent(prose).trim()).toBe(prose);
  });
});
