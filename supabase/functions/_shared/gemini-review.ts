const REVIEW_PROMPT = `You are a strict clinical fact-checker for a medical education site
used by Kenyan MBChB students. Review the page JSON. List every
clinical claim in management, classification, doses, causes,
investigations and examiner answers. For each claim give: claim,
verdict (supported | unsupported | contradicted | unverifiable),
severity (high | medium | low), the standard guideline or reference
that supports or contradicts it, and a corrected wording. Flag
invented classifications, outdated practice, internal contradictions
between sections, and wrong MCQ answers. Also list missing sections
a standard textbook would include. Return ONLY JSON:
{"verdict":"approved|needs_fix|rejected","overall_confidence":0-1,
"findings":[{"section":"","claim":"","verdict":"","severity":"",
"reference":"","suggested_fix":""}],"missing_sections":[]}
Approve only if there are no high-severity findings and fewer than 3
medium findings.`;

export const GEMINI_REVIEW_PROMPT = REVIEW_PROMPT;

export type ReviewFinding = {
  section: string;
  claim: string;
  verdict: "supported" | "unsupported" | "contradicted" | "unverifiable";
  severity: "high" | "medium" | "low";
  reference: string;
  suggested_fix: string;
};

export type ReviewResult = {
  verdict: "approved" | "needs_fix" | "rejected";
  overall_confidence: number;
  findings: ReviewFinding[];
  missing_sections: string[];
};

export function geminiReviewModel(): string {
  return Deno.env.get("GEMINI_REVIEW_MODEL")?.trim() || "gemini-2.5-flash";
}

export async function reviewWithGemini(page: unknown): Promise<ReviewResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) throw new Error("Missing required Edge Function secret: GEMINI_API_KEY");
  const model = geminiReviewModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: REVIEW_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(page) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini review HTTP ${response.status}: ${detail.slice(0, 500)}`);
    }
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("");
    if (!raw) throw new Error("Gemini reviewer returned no content");
    const parsed = JSON.parse(raw);
    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    const normalized: ReviewResult = {
      verdict: ["approved", "needs_fix", "rejected"].includes(parsed.verdict) ? parsed.verdict : "needs_fix",
      overall_confidence: Math.max(0, Math.min(1, Number(parsed.overall_confidence) || 0)),
      findings: findings.map((f: any) => ({
        section: String(f.section || ""),
        claim: String(f.claim || ""),
        verdict: ["supported", "unsupported", "contradicted", "unverifiable"].includes(f.verdict) ? f.verdict : "unverifiable",
        severity: ["high", "medium", "low"].includes(f.severity) ? f.severity : "high",
        reference: String(f.reference || ""),
        suggested_fix: String(f.suggested_fix || ""),
      })),
      missing_sections: Array.isArray(parsed.missing_sections) ? parsed.missing_sections.map(String) : [],
    };
    const high = normalized.findings.some((f) => f.severity === "high");
    const medium = normalized.findings.filter((f) => f.severity === "medium").length;
    if (high || medium >= 3) normalized.verdict = "needs_fix";
    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}
