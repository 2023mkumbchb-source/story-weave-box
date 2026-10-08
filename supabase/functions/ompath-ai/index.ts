import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "google/gemini-3-flash-preview";

interface Source { id?: string; kind?: string; title: string; subtitle?: string; snippet?: string }

const strip = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/<[^>]+>/g, " ").replace(/[#*_>`|]/g, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";
    if (question.length < 2) return json({ error: "Please type a question." }, 400);
    const sources: Source[] = Array.isArray(body?.sources) ? body.sources.slice(0, 8) : [];
    const history: { role: string; content: string }[] = Array.isArray(body?.history)
      ? body.history.slice(-6).filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      : [];

    // Pull real text from the top matching notes so the answer is grounded in the site.
    const ids = sources.filter((s) => s.kind === "article" && s.id).map((s) => s.id!).slice(0, 4);
    let excerpts = "";
    if (ids.length) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data } = await sb.from("articles").select("id,title,category,content").in("id", ids).eq("published", true);
      excerpts = (data ?? []).map((a: any) => `### ${a.title} (${a.category})\n${strip(String(a.content ?? "")).slice(0, 2500)}`).join("\n\n");
    }
    const list = sources.map((s, i) => `${i + 1}. ${s.title}${s.subtitle ? ` — ${s.subtitle}` : ""}${s.snippet ? `: ${s.snippet}` : ""}`).join("\n");

    const system = `You are Ompath AI, the study assistant of Ompath Study, a medical school study site (MBChB Years 1-6, Kenya).
Answer clearly and concisely for a medical student (max ~250 words, markdown, short headings and bullets).
If site material is provided, base your answer on it first and mention the matching notes by title. If the site has nothing relevant, answer from sound medical knowledge and say briefly that it is general guidance.
When the student asks for "notes on X", give a short high-yield overview of X and tell them the matching notes/files are listed below your answer. Never invent note titles. Never mention Google Drive.`;
    const context = `Matching items found on Ompath Study:\n${list || "(none found)"}\n\n${excerpts ? `Excerpts from the top notes:\n${excerpts}` : ""}`;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured yet." }, 500);
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [{ role: "system", content: system }, ...history, { role: "user", content: `${context}\n\nStudent question: ${question}` }],
      }),
      signal: req.signal,
    });
    if (!upstream.ok || !upstream.body) {
      const status = upstream.status;
      const msg = status === 429 ? "Ompath AI is busy right now. Please try again in a minute."
        : status === 402 ? "Ompath AI has run out of credits for now."
        : "Ompath AI could not answer right now.";
      return json({ error: msg }, status === 429 || status === 402 || status === 403 ? status : 502);
    }
    const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "text/event-stream" };
    const run = upstream.headers.get("X-Lovable-AIG-Run-ID");
    if (run) headers["X-Lovable-AIG-Run-ID"] = run;
    return new Response(upstream.body, { headers });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return new Response(null, { status: 499, headers: corsHeaders });
    return json({ error: "Ompath AI could not answer right now." }, 500);
  }
});
