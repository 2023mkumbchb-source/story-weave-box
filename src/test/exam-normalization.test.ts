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

  it("extracts a WordPress explanation appended to the question stem", () => {
    expect(cleanExamQuestions([{
      question: "Which fungus is associated with pigeon droppings? Cryptococcus neoformans is enriched in contaminated soil.",
      options: ["Candida", "Aspergillus", "Cryptococcus", "Mucor"],
      correct_answer: 2,
    }])).toEqual([expect.objectContaining({
      question: "Which fungus is associated with pigeon droppings? Cryptococcus neoformans is enriched in contaminated soil.",
      explanation: undefined,
    })]);

    expect(cleanExamQuestions([{
      question: "Which fungus is associated with pigeon droppings?: Cryptococcus neoformans is enriched in contaminated soil.",
      options: ["Candida", "Aspergillus", "Cryptococcus", "Mucor"],
      correct_answer: 2,
    }])).toEqual([expect.objectContaining({
      question: "Which fungus is associated with pigeon droppings?",
      explanation: "Cryptococcus neoformans is enriched in contaminated soil.",
    })]);
  });

  it("qualifies the verified C. glabrata oral step-down question", () => {
    expect(cleanExamQuestions([{
      question: "A transplant patient has systemic candidiasis due to C. glabrata resistant to fluconazole. Which is a reasonable oral alternative?",
      options: ["Fluconazole", "Posaconazole", "Nystatin", "Griseofulvin"],
      correct_answer: 1,
    }])).toEqual([expect.objectContaining({
      question: expect.stringContaining("After initial echinocandin therapy"),
      correct_answer: 1,
      explanation: expect.stringContaining("only when the isolate is susceptible"),
    })]);
  });

  it.each([
    "Aflatoxins are a serious problem because: two supplied choices are true",
    "More visible symptoms of fungal infection appearing recently because: all the above",
    "(continued options for mycetoma agents) Nocardia causes actinomycetoma",
    "All are zoophilic dermatophytes — select all that apply",
  ])("withholds a known unsafe legacy mycology item: %s", (question) => {
    expect(cleanExamQuestions([{
      question,
      options: ["Alpha", "Beta", "Gamma", "All the above"],
      correct_answer: 0,
    }])).toEqual([]);
  });

  it("withholds a shifted legacy item whose first option was appended to its stem", () => {
    expect(cleanExamQuestions([{
      question: "Fimbriae:A) Attach bacteria to various surfaces.",
      options: ["Help bacteria move", "Cause disease", "Store nutrients"],
      correct_answer: 0,
    }])).toEqual([]);
  });

  it("repairs the incomplete Aspergillus flavus option", () => {
    expect(cleanExamQuestions([{
      question: "Aflatoxins are produced by which fungus? ---",
      options: ["flavus", "Aspergillus niger", "Candida albicans"],
      correct_answer: 0,
    }])).toEqual([expect.objectContaining({
      question: "Which fungus is a major producer of aflatoxins?",
      options: ["Aspergillus flavus", "Aspergillus niger", "Candida albicans"],
      correct_answer: 0,
      explanation: expect.stringContaining("Aspergillus parasiticus"),
    })]);
  });

  it("rewrites the misleading dermatophyte isolation item as a KOH confirmation question", () => {
    expect(cleanExamQuestions([{
      question: "Most reliable lab method for isolation of Trichophyton rubrum?",
      options: ["Blood culture", "Serology", "Skin scrapings, microscopic examination using KOH", "Urease test"],
      correct_answer: 2,
    }])).toEqual([expect.objectContaining({
      question: expect.stringContaining("confirm suspected dermatophytosis"),
      correct_answer: 2,
      explanation: expect.stringContaining("species-level identification"),
    })]);
  });

  it("removes imported paper boundaries from questions and recovered explanations", () => {
    expect(cleanExamQuestions([{
      question: "Which benign tumour is composed of smooth muscle?: Leiomyoma is a benign smooth-muscle tumour. --- # GENETICS ---",
      options: ["Leiomyoma", "Lymphoma", "Melanoma"],
      correct_answer: 0,
    }, {
      question: "Which gene is mutated in cystic fibrosis? --- ## Set 2 — Genetics",
      options: ["CFTR", "RB1", "APC"],
      correct_answer: 0,
      explanation: "CFTR encodes a chloride channel. ---",
    }])).toEqual([
      expect.objectContaining({
        question: "Which benign tumour is composed of smooth muscle?",
        explanation: "Leiomyoma is a benign smooth-muscle tumour.",
      }),
      expect.objectContaining({
        question: "Which gene is mutated in cystic fibrosis?",
        explanation: "CFTR encodes a chloride channel.",
      }),
    ]);
  });
});
