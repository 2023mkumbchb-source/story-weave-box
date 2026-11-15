import { describe, expect, it } from "vitest";
import { isReviewApproved, TOPIC_SECTIONS, validateTopicPage } from "../../supabase/functions/_shared/topic-schema";

function validPage(title = "Test topic") {
  return {
    title,
    sections: Object.fromEntries(TOPIC_SECTIONS.map((name) => [name, {
      applicable: true, content: name === "examiner_questions" || name === "common_questions" ? "Q: Example? A: Example answer." : "Verified educational content.",
      confidence: "medium",
    }])),
  };
}

describe("topic page validator", () => {
  it("accepts all required section objects", () => {
    expect(validateTopicPage(validPage()).valid).toBe(true);
  });
  it("reports missing required sections", () => {
    const page = validPage();
    delete page.sections.classification;
    expect(validateTopicPage(page).missing).toContain("classification");
  });
  it("rejects fabricated cord prolapse classification and unsafe cord replacement advice", () => {
    const page = validPage("Umbilical cord prolapse");
    page.sections.classification.applicable = true;
    page.sections.management.content = "Push the cord back into the uterus.";
    const result = validateTopicPage(page);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/classification/i);
    expect(result.errors.join(" ")).toMatch(/cord/i);
  });
});

describe("review verdict gate", () => {
  it("requires approved verdict, no high findings and fewer than three medium findings", () => {
    expect(isReviewApproved({ verdict: "approved", findings: [] })).toBe(true);
    expect(isReviewApproved({ verdict: "approved", findings: [{ severity: "medium" }, { severity: "medium" }] })).toBe(true);
    expect(isReviewApproved({ verdict: "approved", findings: [{ severity: "high" }] })).toBe(false);
    expect(isReviewApproved({ verdict: "approved", findings: [{ severity: "medium" }, { severity: "medium" }, { severity: "medium" }] })).toBe(false);
    expect(isReviewApproved({ verdict: "needs_fix", findings: [] })).toBe(false);
  });
});
