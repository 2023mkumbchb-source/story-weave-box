import { describe, expect, it } from "vitest";
import { groupHits, parseYearNumber, SEARCH_GROUPS, type SearchHit } from "@/lib/search";
import { hasEssayContent, hasStoryContent, isPublicStudyTitle } from "@/lib/content-policy";

describe("public content policy", () => {
  it("quarantines accidental administrative imports but keeps real study papers", () => {
    expect(isPublicStudyTitle("NOTICE TO ALL STUDENTS 75% Class attendance — Past Paper")).toBe(false);
    expect(isPublicStudyTitle("Students Handbook, 2019 Edition — Past Paper")).toBe(false);
    expect(isPublicStudyTitle("General Pathology CAT 2019")).toBe(true);
  });
  it("quarantines empty essay containers", () => {
    expect(hasEssayContent({ short_answer_questions: [], long_answer_questions: [] })).toBe(false);
    expect(hasEssayContent({ short_answer_questions: [{ question: "Define shock" }], long_answer_questions: [] })).toBe(true);
  });
  it("quarantines empty story shells", () => {
    expect(hasStoryContent({ content: "" })).toBe(false);
    expect(hasStoryContent({ content: "A complete clinical narrative. ".repeat(8) })).toBe(true);
  });
});

describe("parseYearNumber", () => {
  it("accepts a plain number", () => {
    expect(parseYearNumber(2)).toBe(2);
  });
  it("accepts a bare numeric string", () => {
    expect(parseYearNumber("3")).toBe(3);
  });
  it("extracts the number out of a 'Year N' label", () => {
    expect(parseYearNumber("Year 4")).toBe(4);
  });
  it("returns null for empty/undefined input instead of matching everything", () => {
    expect(parseYearNumber(undefined)).toBeNull();
    expect(parseYearNumber("")).toBeNull();
  });
});

function hit(overrides: Partial<SearchHit>): SearchHit {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Sample",
    slug: overrides.slug ?? "sample",
    category: overrides.category ?? "Year 1: Anatomy",
    kind: overrides.kind ?? "article",
    contentType: overrides.contentType ?? "Notes",
    reason: overrides.reason ?? "Matched title",
    href: overrides.href ?? "/blog/sample",
    score: overrides.score ?? 50,
    ...overrides,
  };
}

describe("groupHits", () => {
  it("promotes the first article/Notes hit to Best Explanation and never duplicates it", () => {
    const notes = hit({ id: "notes-1", contentType: "Notes", kind: "article" });
    const mcq = hit({ id: "mcq-1", contentType: "MCQ Bank", kind: "mcq" });
    const grouped = groupHits([notes, mcq]);
    expect(grouped["Best Explanation"]).toEqual([notes]);
    expect(grouped["Notes"]).toBeUndefined();
    expect(grouped["MCQ Bank"]).toEqual([mcq]);
  });

  it("folds Revision Guide and Course Outline content types into Notes", () => {
    const guide = hit({ id: "g1", contentType: "Revision Guide" });
    const outline = hit({ id: "o1", contentType: "Course Outline" });
    const grouped = groupHits([guide, outline]);
    expect(grouped["Notes"]).toEqual([guide, outline]);
  });

  it("only every group key is one of the known SEARCH_GROUPS (plus Best Explanation)", () => {
    const grouped = groupHits([hit({ contentType: "Flashcards", kind: "flashcard" })]);
    for (const key of Object.keys(grouped)) {
      expect([...SEARCH_GROUPS, "Best Explanation"]).toContain(key);
    }
  });
});
