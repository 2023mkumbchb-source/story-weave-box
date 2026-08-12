import { describe, expect, it } from "vitest";
import { preprocessContent, splitInlineEssayParts } from "@/lib/blog-content";

describe("multipart essay question layout", () => {
  it("places inline bold essay parts on separate lines", () => {
    const input = '**(a) Briefly describe oxidative deamination. [5 marks] (b) State the sources of amino acids. [5 marks]**';
    expect(preprocessContent(input)).toBe(
      "(a) Briefly describe oxidative deamination. [5 marks]\n(b) State the sources of amino acids. [5 marks]",
    );
  });

  it("retains introductory text before multipart questions", () => {
    expect(splitInlineEssayParts("Question: (a) Define haemostasis. (b) Give two examples.")).toEqual([
      "Question:",
      "(a) Define haemostasis.",
      "(b) Give two examples.",
    ]);
  });

  it("does not split answer bullets, explanations, or image captions", () => {
    expect(splitInlineEssayParts("- (a) First answer point (b) supporting detail")).toBeNull();
    expect(splitInlineEssayParts("Explanation: (a) causes this while (b) causes that")).toBeNull();
    expect(splitInlineEssayParts("![Diagram showing (a) brain and (b) cord](image.jpg)")).toBeNull();
  });
});
