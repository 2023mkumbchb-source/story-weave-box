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

function answerIndexFromText(text: string, options: string[]): number | undefined {
  const marker = text.match(/(?:correct\s*answer|answer)\s*[:-]\s*\(?([A-F])\)?\b/i)?.[1];
  if (!marker) return undefined;
  const index = marker.toUpperCase().charCodeAt(0) - 65;
  return index >= 0 && index < options.length ? index : undefined;
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
    const question = String(item?.question || "").replace(/\s+/g, " ").trim();
    const explanation = String(item?.explanation || "").replace(/\s+/g, " ").trim();
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
    if (!question || options.length < 2) return [];
    const sourceCorrect = Number(item?.correct_answer);
    let correct = Number.isInteger(sourceCorrect) ? oldToNew.get(sourceCorrect) : undefined;
    if (correct === undefined) correct = answerIndexFromText(explanation, options);
    if (correct === undefined) return [];
    return [{ ...item, question, options, correct_answer: correct, explanation: explanation || undefined }];
  });
}
