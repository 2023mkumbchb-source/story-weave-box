import { describe, expect, it } from "vitest";
import { cleanExamQuestions } from "@/pages/ExamStart";

describe("exam question normalization", () => {
  it("removes repeated labelled choices and remaps the answer", () => {
    expect(cleanExamQuestions([{ question: "  Test? ", options: ["A. Alpha", "B. Beta", "D. Beta", "D. Delta"], correct_answer: 3 }])).toEqual([
      { question: "Test?", options: ["Alpha", "Beta", "Delta"], correct_answer: 2, explanation: undefined },
    ]);
  });

  it("drops incomplete questions without a valid answer", () => {
    expect(cleanExamQuestions([{ question: "Broken", options: ["Only one"], correct_answer: 0 }])).toEqual([]);
  });

  it("recovers an invalid imported answer index from an explicit answer marker", () => {
    expect(cleanExamQuestions([{
      question: "Flexor digitorum longus",
      options: ["Superficial to tibialis posterior", "Arises from the tibia", "Communicates with FHL", "None", "All of the above"],
      correct_answer: 32,
      explanation: "Correct answer: E. All of the above.",
    }])).toEqual([expect.objectContaining({ correct_answer: 4 })]);
  });

  it("withholds an ambiguous invalid answer instead of guessing", () => {
    expect(cleanExamQuestions([{
      question: "Unverified question",
      options: ["Alpha", "Beta", "Gamma"],
      correct_answer: 12,
      explanation: "Review this item.",
    }])).toEqual([]);
  });

  it("does not trust an explanation that merely repeats an option", () => {
    expect(cleanExamQuestions([{
      question: "Potentially incorrect imported anatomy item",
      options: ["Tibia", "Fibula", "All of the above"],
      correct_answer: 32,
      explanation: "All of the above statements are correct.",
    }])).toEqual([]);
  });

  it("repairs WordPress True/False exports containing duplicated choices and explanation fragments", () => {
    expect(cleanExamQuestions([{
      question: "Receptor agonists result in a drug response.",
      options: ["True", "False", "True", "This is the mechanism by which many drugs exert their therapeutic effects."],
      correct_answer: 0,
      explanation: "Agonists activate receptors.",
    }])).toEqual([expect.objectContaining({ options: ["True", "False"], correct_answer: 0 })]);
  });
});
