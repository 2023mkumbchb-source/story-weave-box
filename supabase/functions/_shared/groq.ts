const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
  return value;
}

export function groqModel(): string {
  return Deno.env.get("GROQ_MODEL")?.trim() || "llama-3.3-70b-versatile";
}

export async function groqJson(messages: ChatMessage[], maxTokens = 12000): Promise<string> {
  const apiKey = requiredSecret("GROQ_API_KEY");
  const model = groqModel();
  let lastError = "Groq request failed";

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, messages, temperature: 0.2, max_tokens: maxTokens,
          response_format: { type: "json_object" }, stream: false,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `Groq HTTP ${response.status}: ${detail.slice(0, 500)}`;
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          continue;
        }
        throw new Error(lastError);
      }
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Groq returned an empty JSON response");
      return content;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === 0 && error instanceof DOMException && error.name === "AbortError") continue;
      if (attempt === 0 && /fetch failed|network/i.test(lastError)) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        continue;
      }
      throw new Error(lastError);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(lastError);
}
