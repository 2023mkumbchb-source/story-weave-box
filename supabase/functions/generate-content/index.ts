import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNIT_CATEGORIES = [
  "Basic Pharmacology II",
  "Hematopathology",
  "Research Methodology and Proposal Writing",
  "Endocrine and Metabolic Pathology",
  "Chemical Pathology",
  "Respiratory System Pathology",
  "Junior Clerkship/Practicals in General Pathology I",
  "Gastrointestinal Pathology",
  "Female Reproductive System Pathology",
  "Cardiovascular System Pathology",
];

function cleanHeading(text: string): string {
  return text.replace(/^#+\s*/, "").replace(/^\*+|\*+$/g, "").replace(/^"|"$/g, "").replace(/\s+/g, " ").trim();
}

function normalizeArticleOutput(raw: string): { title: string; content: string } {
  const cleaned = raw.replace(/```[\s\S]*?```/g, "").trim();
  const lines = cleaned.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? "Study Article";
  const title = cleanHeading(firstNonEmpty) || "Study Article";
  const bodyStart = lines[0]?.trim() === firstNonEmpty.trim() ? 1 : 0;
  let body = lines.slice(bodyStart).join("\n").trim();
  body = body.replace(/^#\s+/gm, "## ").trim();

  const hasSummary = /^##\s+Summary\b/im.test(body);
  const hasKeyPoints = /^##\s+Key Points\b/im.test(body);
  const hasDetailed = /^##\s+Detailed Notes\b/im.test(body);
  const hasPractice = /^##\s+Practice Questions\b/im.test(body);

  if (hasSummary && hasKeyPoints && hasDetailed && hasPractice) {
    return { title, content: body };
  }

  const paragraphs = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const summary = paragraphs[0] || "High-yield summary not provided.";
  const keyPoints = paragraphs.flatMap((p) => p.split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter((s) => s.length > 25).slice(0, 8).map((s) => `- ${s}`);
  const detailed = paragraphs.slice(1).join("\n\n") || summary;
  const practiceQuestions = [
    `1. What is the core mechanism of ${title}? → Explain the key pathological or physiological process.`,
    `2. Which finding most strongly supports ${title} clinically? → Identify the highest-yield clue.`,
    `3. What is a common differential diagnosis for ${title}? → Contrast the differentiating features.`,
    `4. Which lab or investigation best confirms ${title}? → State the best first test and why.`,
    `5. What is the first-line management principle in ${title}? → Give the priority step and rationale.`,
    `6. Which complication is most exam-relevant for ${title}? → Name it and how to recognize it early.`,
    `7. What is a frequent exam trap in ${title}? → Clarify the misconception and correct concept.`,
    `8. How would ${title} present in a classic vignette? → Summarize hallmark presentation cues.`,
  ];

  const content = [
    "## Summary", summary, "",
    "## Key Points", ...(keyPoints.length ? keyPoints : ["- Add high-yield points for this topic."]), "",
    "## Detailed Notes", detailed, "",
    "## Practice Questions", ...practiceQuestions,
  ].join("\n");

  return { title, content };
}

function parseAndNormalizeMcqs(raw: string, expectedCount: number) {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse MCQs from AI response");
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error("MCQ response was not an array");

  const cleaned = parsed.map((item: any) => {
    if (!item?.question || !Array.isArray(item?.options) || item.options.length < 4) return null;
    const question = String(item.question).replace(/\s+/g, " ").trim();
    const options = item.options.slice(0, 4).map((o: any) => String(o).replace(/\s+/g, " ").trim());
    const correct_answer = Number.isInteger(item.correct_answer) ? Math.min(Math.max(item.correct_answer, 0), 3) : 0;
    const explanation = item.explanation ? String(item.explanation).trim() : "";
    if (!question) return null;
    return { question, options, correct_answer, explanation };
  }).filter(Boolean);

  const unique: any[] = [];
  const seen = new Set<string>();
  for (const q of cleaned) {
    const key = q.question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!seen.has(key)) { seen.add(key); unique.push(q); }
  }
  return unique.slice(0, expectedCount);
}

async function callAI(messages: any[], geminiKey?: string): Promise<string> {
  const apiKey = (geminiKey && geminiKey.length > 0) ? geminiKey : Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || apiKey.length === 0) {
    throw new Error("No Gemini API key configured. Please save your Gemini API key in Settings.");
  }

  const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
  const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
  const prompt = systemMsg + "\n\n" + userMsg;

  const MAX_RETRIES = 2;
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
  const REQUEST_TIMEOUT_MS = 35000;

  for (let modelIdx = 0; modelIdx < MODELS.length; modelIdx++) {
    const model = MODELS[modelIdx];
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.error) throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!text) throw new Error("Gemini returned an empty response.");
          return text;
        }

        const errText = await response.text();
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1500;
          if (attempt < MAX_RETRIES - 1) { await new Promise((r) => setTimeout(r, waitTime)); continue; }
          break;
        }
        if (response.status === 404) break;
        throw new Error(`Gemini API error (${response.status}).`);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (attempt < MAX_RETRIES - 1) continue;
          break;
        }
        throw err;
      } finally { clearTimeout(timeout); }
    }
  }
  throw new Error("Gemini is currently rate-limited. Wait a bit and retry.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notes, type, count = 20, geminiKey, title: customTitle } = await req.json();
    const cardCount = Math.min(Math.max(Number(count) || 20, 5), 100);

    if (!notes || typeof notes !== "string") {
      throw new Error("Invalid input: notes must be a non-empty string");
    }

    // ── Auto-categorize ──────────────────────────────────────────────────────
    if (type === "categorize") {
      const catList = `\nAvailable unit categories:\n${UNIT_CATEGORIES.join("\n")}`;
      const messages = [
        { role: "system", content: `You categorize medical study notes into the correct unit/course category. ${catList}\n\nReturn ONLY the exact category name, nothing else.` },
        { role: "user", content: notes.slice(0, 500) },
      ];
      const category = await callAI(messages, geminiKey);
      return new Response(JSON.stringify({ category: category.trim().replace(/^["']|["']$/g, "") }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Direct Publish: Article ──────────────────────────────────────────────
    if (type === "direct-article") {
      const messages = [
        { role: "system", content: `You are a medical content formatter. The user is pasting pre-written article content. Your job is to REFORMAT it (not rewrite) into this exact markdown structure:

First line: Title only (no # symbol, no bullets)
Then these sections in order:
## Summary
(1-2 paragraph summary of the content)

## Key Points
(bullet points with - **Term**: explanation format)

## Detailed Notes
(the main body content, properly organized with ### subheadings where appropriate, tables preserved, lists properly formatted)

## Practice Questions
(8 clinically-oriented questions in format: 1. Question? → Answer)

RULES:
- Preserve ALL original information, tables, and data
- Fix formatting issues (broken tables, missing headers, inconsistent bullets)
- Keep medical terminology accurate
- Output markdown only, no code fences
- If the content already has good structure, preserve it within the template
- Title should be specific and professional` },
        { role: "user", content: customTitle ? `Title: ${customTitle}\n\nContent:\n${notes}` : notes },
      ];
      const text = await callAI(messages, geminiKey);
      const result = normalizeArticleOutput(text);
      if (customTitle) result.title = customTitle;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Direct Publish: MCQs ─────────────────────────────────────────────────
    if (type === "direct-mcqs") {
      const messages = [
        { role: "system", content: `You are a medical MCQ formatter. The user is pasting pre-written MCQ content. Your job is to PARSE and FORMAT it into a clean JSON array. Do NOT change the questions or answers, just normalize the format.

Output ONLY a valid JSON array:
[{"question": "...", "options": ["A text", "B text", "C text", "D text"], "correct_answer": 0, "explanation": "..."}]

RULES:
- correct_answer is 0-based index (0=A, 1=B, 2=C, 3=D)
- Preserve the original question text, just clean up formatting
- If answer is marked (e.g., "Answer: B"), convert to correct_answer index
- Add brief explanations if not present
- Exactly 4 options per question
- Return up to ${cardCount} questions
- No markdown, no code blocks, just the JSON array` },
        { role: "user", content: notes },
      ];
      const text = await callAI(messages, geminiKey);
      const result = parseAndNormalizeMcqs(text, cardCount);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Direct Publish: Flashcards ───────────────────────────────────────────
    if (type === "direct-flashcards") {
      const messages = [
        { role: "system", content: `You are a flashcard formatter. The user is pasting pre-written flashcard content. Parse and format into JSON.

Output ONLY a valid JSON array: [{"question": "...", "answer": "..."}]

RULES:
- Preserve original content, just normalize formatting
- Return up to ${cardCount} cards
- No markdown, no code blocks, just the JSON array` },
        { role: "user", content: notes },
      ];
      const text = await callAI(messages, geminiKey);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to parse flashcards");
      const parsed = JSON.parse(jsonMatch[0]);
      const result = parsed
        .filter((item: any) => item?.question && item?.answer)
        .map((item: any) => ({ question: String(item.question).trim(), answer: String(item.answer).trim() }))
        .slice(0, cardCount);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard generation ──────────────────────────────────────────────────
    let systemPrompt: string;
    if (type === "article") {
      systemPrompt = `You are a medical education expert. Convert notes into a clinically useful, exam-focused study article with strict markdown formatting.

STRICT OUTPUT FORMAT:
- Return markdown only
- First line MUST be the title only (no #, no bullets, no asterisks)
- Then include these exact sections in this order:
  ## Summary
  ## Key Points
  ## Detailed Notes
  ## Practice Questions
- In Key Points, use bullet format: - **Term**: concise explanation
- In Practice Questions, include at least 8 clinically-oriented Q→A lines:
  1. Question? → Answer
- Do not output code fences

QUALITY RULES:
- Write concise, clear, exam-ready language
- Include clinically relevant patterns, not just definitions
- Add high-yield differentiators and common exam traps
- Keep output around 600-1000 words
- Title must be specific and professional`;
    } else if (type === "mcqs") {
      systemPrompt = `You are a senior medical exam question writer. Create EXACTLY ${cardCount} high-quality, clinically-oriented MCQs.

REQUIREMENTS:
- Return ONLY a valid JSON array
- Schema: {"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "..."}
- correct_answer is 0-based index
- Exactly 4 options per question
- Include a clear 1-2 sentence explanation
- Questions must be vignette-style or clinically applied
- Mix difficulty levels
- No duplicates, no markdown, no code blocks`;
    } else {
      systemPrompt = `You are a medical education expert. Create EXACTLY ${cardCount} high-yield flashcards.

Return ONLY a valid JSON array: [{"question": "...", "answer": "..."}].
- Keep cards concise but concept-rich
- Clinically meaningful wording
- No duplicates, no markdown, no code blocks`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: type === "flashcards"
          ? `Create exactly ${cardCount} flashcards from these notes:\n\n${notes}`
          : type === "mcqs"
          ? `Create exactly ${cardCount} MCQs from these notes:\n\n${notes}`
          : notes,
      },
    ];

    const text = await callAI(messages, geminiKey);

    let result;
    if (type === "article") {
      result = normalizeArticleOutput(text);
    } else if (type === "mcqs") {
      result = parseAndNormalizeMcqs(text, cardCount);
    } else {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to parse flashcards");
      const parsed = JSON.parse(jsonMatch[0]);
      result = parsed
        .filter((item: any) => item?.question && item?.answer)
        .map((item: any) => ({ question: String(item.question).trim(), answer: String(item.answer).trim() }))
        .slice(0, cardCount);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
