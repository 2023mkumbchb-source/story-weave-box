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

async function callAI(messages: any[], geminiKey?: string): Promise<string> {
  // Prioritize client-provided key, then fall back to server secret
  const apiKey = (geminiKey && geminiKey.length > 0) ? geminiKey : Deno.env.get("GEMINI_API_KEY");
  
  if (!apiKey || apiKey.length === 0) {
    throw new Error(
      "No Gemini API key configured. Please save your Gemini API key in Settings."
    );
  }

  const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
  const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
  const prompt = systemMsg + "\n\n" + userMsg;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText.substring(0, 300));
    throw new Error(
      `Gemini API error (${response.status}). Verify your API key is valid and the Generative AI API is enabled.`
    );
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notes, type, count = 20, geminiKey } = await req.json();
    const cardCount = Math.min(Math.max(Number(count) || 20, 5), 50);

    if (!notes || typeof notes !== "string") {
      throw new Error("Invalid input: notes must be a non-empty string");
    }

    // Auto-categorize request
    if (type === "categorize") {
      const catList = `\nAvailable unit categories:\n${UNIT_CATEGORIES.join("\n")}\n\nYou MUST pick one of these exact category names if the content relates to any of them. If none match, create a short descriptive category name.`;
      const messages = [
        { role: "system", content: `You categorize medical study notes into the correct unit/course category. ${catList}\n\nReturn ONLY the exact category name, nothing else. Do not include course codes.` },
        { role: "user", content: notes.slice(0, 500) },
      ];
      const category = await callAI(messages, geminiKey);
      return new Response(JSON.stringify({ category: category.trim().replace(/^["']|["']$/g, "") }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt: string;
    if (type === "article") {
      systemPrompt = `You are a medical education expert. Convert notes into a comprehensive study article that goes BEYOND the provided notes. Include commonly tested "must know" topics for that unit that medical students need for exams.

IMPORTANT FORMATTING RULES:
- Do NOT use asterisks (*) for emphasis in regular text
- Use ## for section headings and ### for sub-headings
- Use **bold** ONLY for key terms in bullet points
- Keep text clean and readable without excessive formatting marks

Format the output EXACTLY like this:

TITLE (first line, no markdown symbols, no asterisks - make it descriptive and exam-relevant)

(blank line)

## Summary
A concise 3-4 sentence overview covering the key clinical significance.

## Key Points
- **Point 1**: Brief explanation with clinical relevance
- **Point 2**: Brief explanation
- **Point 3**: Brief explanation
(cover ALL major topics including commonly tested ones not in the notes)

## Detailed Notes
Write detailed, exam-focused explanations organized by topic with clear paragraphs. Use subheadings (###) for different sections. Include:
- Pathophysiology
- Clinical features and presentations
- Diagnostic criteria and investigations
- Management and treatment approaches
- Complications and prognosis

## Practice Questions
1. Question? → Answer
2. Question? → Answer
(at least 8 practice questions covering commonly tested concepts)

Make it at least 800 words. Include high-yield exam content beyond the provided notes. Do NOT use asterisks except for **bold key terms**.`;
    } else if (type === "mcqs") {
      systemPrompt = `You are a medical exam question writer. Create EXACTLY ${cardCount} high-quality exam-style MCQ questions. Focus on questions that are commonly asked in medical exams. Include questions from commonly tested topics in this medical unit, not just from the notes provided. Each question MUST have exactly 4 options, one correct answer, AND a clear 1-2 sentence explanation of why the correct answer is right and key differentiators.

Return ONLY a valid JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "Brief explanation."}]

The correct_answer is the 0-based index. No markdown, no code blocks - just the raw JSON array with exactly ${cardCount} items. Include commonly asked exam-style questions for this medical topic. Mix difficulty levels. Test understanding and clinical application, not just memorization.`;
    } else {
      systemPrompt = `You are a medical education expert creating flashcards. Create EXACTLY ${cardCount} flashcards covering the notes AND commonly tested topics in this medical unit. Go beyond the provided notes to include "must know" concepts students need. Return ONLY a valid JSON array: [{"question": "...", "answer": "..."}]. No markdown, no code blocks - just the raw JSON array with exactly ${cardCount} items.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: type === "flashcards"
          ? `Create exactly ${cardCount} flashcards from these notes (include additional must-know topics):\n\n${notes}`
          : type === "mcqs"
          ? `Create exactly ${cardCount} MCQs from these notes. Include commonly tested exam questions on this topic:\n\n${notes}`
          : notes,
      },
    ];

    const text = await callAI(messages, geminiKey);

    let result;
    if (type === "article") {
      const lines = text.trim().split("\n");
      const title = lines[0].replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      const content = lines.slice(1).join("\n").trim();
      result = { title, content };
    } else if (type === "mcqs") {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to parse MCQs from AI response");
      result = JSON.parse(jsonMatch[0]);
    } else {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to parse flashcards from AI response");
      result = JSON.parse(jsonMatch[0]);
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
