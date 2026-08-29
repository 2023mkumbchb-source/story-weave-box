export interface NormalizedMcqQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  [key: string]: unknown;
}

export function cleanMcqOption(value: unknown): string {
  return String(value || "")
    .replace(/&amp;nbsp;|&nbsp;|\u00a0/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s*(?:option\s*)?[A-F][.)]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLegacyBoundaryText(value: unknown): string {
  return String(value || "")
    .replace(/\s*---\s*(?:#{1,6}\s+(?:set\b|genetics\b|ha?emat|patholog|microbi|parasit|mycolog|virolog)[\s\S]*)?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function answerIndexFromText(text: string, options: string[]): number | undefined {
  const marker = text.match(/(?:correct\s*answer|answer)\s*[:-]\s*\(?([A-F])\)?\b/i)?.[1];
  if (!marker) return undefined;
  const index = marker.toUpperCase().charCodeAt(0) - 65;
  return index >= 0 && index < options.length ? index : undefined;
}

function splitEmbeddedExplanation(question: string, correctOption: string): { question: string; explanation?: string } {
  const colon = question.lastIndexOf(":");
  if (colon < 10) return { question };
  const stem = question.slice(0, colon).trim();
  const suffix = question.slice(colon + 1).trim();
  if (suffix.length < 24 || stem.length < 10) return { question };
  const significant = correctOption.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const suffixLower = suffix.toLowerCase();
  const containsAnswerTerm = significant.some((word) => suffixLower.includes(word));
  if (!containsAnswerTerm) return { question };
  return { question: stem, explanation: cleanLegacyBoundaryText(suffix) };
}

function applyVerifiedClinicalOverride(
  question: string,
  options: string[],
  correct: number,
  explanation: string,
): { question: string; correct: number; explanation: string } {
  const isGlabrataOralAlternative = /c(?:andida)?\.?\s*glabrata/i.test(question)
    && /fluconazole[- ]resistan|resistan\w*\s+to\s+fluconazole/i.test(question)
    && /oral\s+alternative/i.test(question);
  if (!isGlabrataOralAlternative) return { question, correct, explanation };

  const posaconazole = options.findIndex((option) => /posaconazole/i.test(option));
  if (posaconazole < 0) return { question, correct, explanation };
  return {
    question: "After initial echinocandin therapy, a stable patient has fluconazole-resistant Candida glabrata candidemia whose isolate is susceptible to posaconazole. Which oral step-down option is reasonable?",
    correct: posaconazole,
    explanation: "Posaconazole tablets are an IDSA-supported oral step-down option only when the isolate is susceptible to posaconazole but not fluconazole. An echinocandin remains preferred initial therapy for invasive candidiasis.",
  };
}

function isKnownUnsafeLegacyQuestion(question: string): boolean {
  return /aflatoxins are a serious problem because/i.test(question)
    || /more visible symptoms of fungal infection appearing recently/i.test(question)
    || /continued options for mycetoma agents/i.test(question)
    || /all are zoophilic dermatophytes\b.*select all/i.test(question);
}

function applyVerifiedMycologyWording(
  question: string,
  options: string[],
  correct: number,
  explanation: string,
): { question: string; correct: number; explanation: string } {
  if (/^aflatoxins are produced by which fungus\?/i.test(question)) {
    const flavus = options.findIndex((option) => /^flavus$/i.test(option));
    if (flavus >= 0) options[flavus] = "Aspergillus flavus";
    return {
      question: "Which fungus is a major producer of aflatoxins?",
      correct: flavus >= 0 ? flavus : correct,
      explanation: "Aspergillus flavus is a major aflatoxin-producing mould. Aspergillus parasiticus can also produce aflatoxins.",
    };
  }

  if (/most reliable lab method for isolation of trichophyton rubrum/i.test(question)) {
    const koh = options.findIndex((option) => /skin scrapings.*KOH|KOH.*skin scrapings/i.test(option));
    if (koh < 0) return { question, correct, explanation };
    return {
      question: "Which rapid test can confirm suspected dermatophytosis by demonstrating fungal hyphae in skin scrapings?",
      correct: koh,
      explanation: "Direct microscopy of skin scrapings prepared with potassium hydroxide (KOH) can demonstrate fungal hyphae and confirm dermatophytosis. Culture or molecular testing is required when species-level identification is needed.",
    };
  }

  return { question, correct, explanation };
}

/**
 * Repairs legacy MCQ JSON without guessing clinical facts. Duplicate options
 * are removed, the original answer index is remapped, and an invalid index is
 * recovered only from an explicit answer-letter marker. Ambiguous questions
 * are withheld from exam mode for manual review.
 */
export function sanitizeMcqQuestions(raw: unknown): NormalizedMcqQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: any) => {
    let question = cleanLegacyBoundaryText(item?.question);
    let explanation = cleanLegacyBoundaryText(item?.explanation);
    const sourceOptions = Array.isArray(item?.options) ? item.options : [];
    const options: string[] = [];
    const oldToNew = new Map<number, number>();
    sourceOptions.forEach((value: unknown, oldIndex: number) => {
      const option = cleanMcqOption(value);
      if (!option) return;
      const key = option.toLocaleLowerCase();
      let newIndex = options.findIndex((saved) => saved.toLocaleLowerCase() === key);
      if (newIndex < 0) newIndex = options.push(option) - 1;
      oldToNew.set(oldIndex, newIndex);
    });
    // WordPress quiz exports sometimes duplicated True/False and then appended
    // part of the explanation as choices C/D. A genuine boolean item has one
    // True and one False option only.
    const trueIndex = options.findIndex((option) => /^true$/i.test(option));
    const falseIndex = options.findIndex((option) => /^false$/i.test(option));
    if (trueIndex >= 0 && falseIndex >= 0) {
      const booleanOptions = [options[trueIndex], options[falseIndex]];
      const booleanMap = new Map<number, number>();
      oldToNew.forEach((mapped, oldIndex) => {
        if (mapped === trueIndex) booleanMap.set(oldIndex, 0);
        if (mapped === falseIndex) booleanMap.set(oldIndex, 1);
      });
      options.splice(0, options.length, ...booleanOptions);
      oldToNew.clear();
      booleanMap.forEach((mapped, oldIndex) => oldToNew.set(oldIndex, mapped));
    }
    if (!question || options.length < 2 || isKnownUnsafeLegacyQuestion(question)) return [];
    const sourceCorrect = Number(item?.correct_answer);
    let correct = Number.isInteger(sourceCorrect) ? oldToNew.get(sourceCorrect) : undefined;
    if (correct === undefined) correct = answerIndexFromText(explanation, options);
    if (correct === undefined) return [];
    if (!explanation) {
      const split = splitEmbeddedExplanation(question, options[correct]);
      question = split.question;
      explanation = split.explanation || "";
    }
    ({ question, correct, explanation } = applyVerifiedClinicalOverride(question, options, correct, explanation));
    ({ question, correct, explanation } = applyVerifiedMycologyWording(question, options, correct, explanation));
    return [{ ...item, question, options, correct_answer: correct, explanation: explanation || undefined }];
  });
}
