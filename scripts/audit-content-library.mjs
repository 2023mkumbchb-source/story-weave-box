import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function all(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).eq("published", true).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

const articles = await all("articles", "id,title,slug,category,content,content_kind,is_raw,deleted_at");
const mcqs = await all("mcq_sets", "id,title,slug,category,questions");
const flashcards = await all("flashcard_sets", "id,title,slug,category,cards");
const essays = await all("essays", "id,title,slug,category,short_answer_questions,long_answer_questions");
const stories = await all("stories", "id,title,slug,category,content");

const findings = [];
const add = (type, row, code, detail) => findings.push({ type, id: row.id, slug: row.slug, title: row.title, code, detail });

for (const row of articles.filter((x) => !x.is_raw && !x.deleted_at)) {
  const text = String(row.content || "");
  const images = (text.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const questionHeads = (text.match(/^#{1,6}\s+(?:Q(?:uestion)?\s*)?\d+/gim) || []).length;
  const answerHeads = (text.match(/(?:^|\n)\s*(?:\*\*)?(?:Answer|Model answer|Correct answer)\s*:/gi) || []).length;
  const choices = (text.match(/^\s*(?:[-*]\s*)?(?:\*\*)?[A-F][.)]\s+/gim) || []).length;
  if (text.trim().length < 500) add("article", row, "thin-content", `${text.trim().length} characters`);
  if (/Ã.|Â.|â€|ï¿½/.test(text)) add("article", row, "encoding", "possible mojibake");
  if (questionHeads >= 2 && choices >= 8 && answerHeads === 0) add("article", row, "answers-unverified", `${questionHeads} questions, no explicit Answer headings`);
  if (/aponeurosis|spot/i.test(`${row.title} ${row.content_kind}`) && images === 0) add("article", row, "spot-without-image", "visual bank has no Markdown image");
}

for (const row of mcqs) {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  if (!questions.length) add("mcq", row, "empty", "no questions");
  if (questions.length < 10) add("mcq", row, "short-set", `${questions.length} questions`);
  questions.forEach((q, index) => {
    const options = Array.isArray(q?.options) ? q.options.map((v) => String(v || "").replace(/^\s*[A-F][.)]\s*/i, "").trim()).filter(Boolean) : [];
    if (options.length < 2 || !Number.isInteger(Number(q?.correct_answer)) || Number(q.correct_answer) < 0 || Number(q.correct_answer) >= options.length) add("mcq", row, "invalid-question", `question ${index + 1}`);
    if (new Set(options.map((v) => v.toLowerCase())).size < options.length) add("mcq", row, "duplicate-choice", `question ${index + 1}`);
    if (!String(q?.explanation || "").trim()) add("mcq", row, "missing-explanation", `question ${index + 1}`);
  });
}

for (const row of flashcards) {
  const cards = Array.isArray(row.cards) ? row.cards : [];
  if (!cards.length) add("flashcard", row, "empty", "no cards");
  cards.forEach((card, index) => {
    if (!String(card?.question || "").trim() || !String(card?.answer || "").trim()) add("flashcard", row, "incomplete-card", `card ${index + 1}`);
  });
}

for (const row of essays) {
  const questions = [
    ...(Array.isArray(row.short_answer_questions) ? row.short_answer_questions : []),
    ...(Array.isArray(row.long_answer_questions) ? row.long_answer_questions : []),
  ];
  if (!questions.length) add("essay", row, "empty", "no questions");
  questions.forEach((q, index) => {
    if (!String(q?.question || "").trim()) add("essay", row, "missing-question", `item ${index + 1}`);
    if (!String(q?.answer || q?.model_answer || "").trim()) add("essay", row, "missing-answer", `item ${index + 1}`);
  });
}

for (const row of stories) {
  const text = String(row.content || "").trim();
  if (text.length < 500) add("story", row, "thin-content", `${text.length} characters`);
}

const byCode = Object.fromEntries([...new Set(findings.map((x) => x.code))].sort().map((code) => [code, findings.filter((x) => x.code === code).length]));
console.log(JSON.stringify({
  scanned: { articles: articles.length, mcq_sets: mcqs.length, flashcard_sets: flashcards.length, essays: essays.length, stories: stories.length },
  findingCount: findings.length,
  affectedResources: new Set(findings.map((x) => `${x.type}:${x.id}`)).size,
  byCode,
  examples: findings.slice(0, 120),
}, null, 2));
