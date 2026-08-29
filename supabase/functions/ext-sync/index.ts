// One-off migration utility: copies rows that exist in this (managed) database
// but are missing from the user's own Supabase project. Never deletes, never
// overwrites — inserts only ids that the target does not already have.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FK-safe order: parents before children.
const TABLES = [
  "academic_years",
  "semesters",
  "units",
  "syllabus_topics",
  "article_categories",
  "app_settings",
  "articles",
  "mcq_sets",
  "flashcard_sets",
  "stories",
  "essays",
  "exam_results",
  "slide_corrections",
  "medical_concepts",
  "medical_concept_aliases",
  "resource_topics",
  "search_aliases",
] as const;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Page through every id in a table (works past the 1000-row API cap). */
async function allIds(client: any, table: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await client.from(table).select("id").range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of data || []) ids.add(row.id);
    if (!data || data.length < page) break;
  }
  return ids;
}

/**
 * Insert a batch, healing schema drift: when the target project lacks a column
 * PostgREST names it in the error, so drop that key and retry rather than
 * failing the whole run.
 */
async function insertHealing(target: any, table: string, rows: any[]): Promise<{ inserted: number; dropped: string[]; error?: string }> {
  let payload = rows.map((r) => ({ ...r }));
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await target.from(table).upsert(payload, { onConflict: "id", ignoreDuplicates: true });
    if (!error) return { inserted: payload.length, dropped };
    const missing = error.message.match(/'([^']+)' column|column "([^"]+)"/)?.slice(1).find(Boolean);
    if (missing && payload.some((r) => missing in r)) {
      dropped.push(missing);
      payload = payload.map((r) => {
        const { [missing]: _omit, ...rest } = r;
        return rest;
      });
      continue;
    }
    return { inserted: 0, dropped, error: error.message };
  }
  return { inserted: 0, dropped, error: "too many schema retries" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const extUrl = (Deno.env.get("EXT_SUPABASE_URL") || "").replace(/\/+$/, "");
  const extKey = Deno.env.get("EXT_SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!extUrl || !extKey) return json({ error: "EXT_SUPABASE_URL / EXT_SUPABASE_SERVICE_ROLE_KEY not set" }, 400);

  const source = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const target = createClient(extUrl, extKey, { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "diff";
    const only: string[] | null = Array.isArray(body.tables) && body.tables.length ? body.tables : null;
    const tables = (only || TABLES).filter((t) => (TABLES as readonly string[]).includes(t));
    const batch = Math.min(Number(body.batch) || 25, 100);
    const maxRows = Math.min(Number(body.max) || 200, 600);

    if (action === "ping") {
      // Raw REST probe: the JS client masks URL mistakes as "Invalid path",
      // so show the actual HTTP status and body shape instead.
      const probe = await fetch(`${extUrl}/rest/v1/articles?select=id&limit=1`, {
        headers: { apikey: extKey, Authorization: `Bearer ${extKey}` },
      });
      const text = (await probe.text()).slice(0, 300);
      let host = "unparseable";
      try {
        const u = new URL(extUrl);
        host = `${u.protocol}//${u.hostname.replace(/^[a-z0-9]{6,}/i, "<ref>")}${u.pathname}`;
      } catch { /* keep unparseable */ }
      return json({ status: probe.status, urlShape: host, body: text });
    }



    const report: Record<string, any> = {};

    for (const table of tables) {
      let sourceIds: Set<string>;
      let targetIds: Set<string>;
      try {
        sourceIds = await allIds(source, table);
      } catch (e: any) {
        report[table] = { skipped: `source: ${e.message}` };
        continue;
      }
      try {
        targetIds = await allIds(target, table);
      } catch (e: any) {
        report[table] = { skipped: `target: ${e.message}`, source: sourceIds.size };
        continue;
      }

      const missing = [...sourceIds].filter((id) => !targetIds.has(id));
      report[table] = { source: sourceIds.size, target: targetIds.size, missing: missing.length };
      if (action !== "push" || missing.length === 0) continue;

      const slice = missing.slice(0, maxRows);
      let inserted = 0;
      const droppedCols = new Set<string>();
      const errors: string[] = [];

      for (let i = 0; i < slice.length; i += batch) {
        const chunk = slice.slice(i, i + batch);
        const { data: rows, error } = await source.from(table).select("*").in("id", chunk);
        if (error) {
          errors.push(error.message);
          continue;
        }
        const res = await insertHealing(target, table, rows || []);
        inserted += res.inserted;
        res.dropped.forEach((c) => droppedCols.add(c));
        if (res.error) errors.push(res.error);
      }

      report[table] = {
        ...report[table],
        inserted,
        remaining: missing.length - inserted,
        droppedColumns: [...droppedCols],
        errors: errors.slice(0, 3),
      };
    }

    const remaining = Object.values(report).reduce((n: number, r: any) => n + (r?.remaining ?? 0), 0);
    return json({ action, done: action !== "push" || remaining === 0, remaining, report });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
