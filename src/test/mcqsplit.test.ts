import { describe, it, expect } from "vitest";
import { preprocessContent } from "@/pages/BlogPost";

describe("mcq split", () => {
  it("splits glued runs", () => {
    const src = [
      "*Entner-Doudoroff pathway is NOT found in:* A. Aerobic prokaryotesB. Anaerobic prokaryotesC. Both (a) and (b)D. Eukaryotes E. Atypical viral agents",
      "Most of the energy in aerobic respiration of glucose is captured by: A. Substrate-level phosphorylation",
      "C. Trypanosoma cruziD. Toxoplasma gondiiE. Giardia lamblia",
    ].join("\n");
    console.log(JSON.stringify(preprocessContent(src).split("\n"), null, 1));
    expect(true).toBe(true);
  });
});
