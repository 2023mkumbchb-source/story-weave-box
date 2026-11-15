import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type QueueArticle = { id: string; title: string; slug: string | null; category: string | null; published: boolean; ai_check_status: string; review_loop_count: number };
type Finding = { id: string; article_id: string; section: string; claim: string; verdict: string; severity: string; reference: string; suggested_fix: string; student_message?: string | null };

export default function AdminReviewQueue() {
  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-review-queue", { body: { action: "queue" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setArticles(data.articles || []);
      setFindings(data.findings || []);
    } catch (error: any) {
      toast({ title: "Could not load review queue", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: string, articleId: string, findingId?: string) => {
    const key = findingId || articleId;
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke("admin-review-queue", { body: { action, article_id: articleId, finding_id: findingId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: action === "mark-reviewed" ? "Marked as medically reviewed" : action === "rewrite" ? "Rewrite pipeline completed" : action === "apply-fix" ? "Fix applied; page remains unpublished for review" : "Finding dismissed" });
      await load();
    } catch (error: any) {
      toast({ title: "Review action failed", description: error.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  return <div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">OmpathStudy administration</p><h1 className="mt-1 font-serif text-3xl font-bold">Clinical review queue</h1><p className="mt-2 text-sm text-muted-foreground">Pages requiring human review and their open audit findings. Applying a fix unpublishes the page until it is reviewed again.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </div>
    {loading ? <p className="py-12 text-center text-muted-foreground">Loading review queue…</p> : articles.length === 0 ? <div className="rounded-xl border border-border p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/><h2 className="mt-3 text-lg font-semibold">No pages awaiting review</h2></div> :
      <div className="space-y-5">{articles.map(article => {
        const pageFindings = findings.filter(f => f.article_id === article.id);
        return <section key={article.id} className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{article.title}</h2><p className="mt-1 text-xs text-muted-foreground">{article.category || "Uncategorised"} · {article.ai_check_status} · {article.review_loop_count} correction loops · {article.published ? "Currently published" : "Draft"}</p><Link className="mt-2 inline-block text-sm text-primary underline" to={article.slug ? `/blog/${article.slug}` : `/blog/${article.id}`}>Open article</Link></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy === article.id} onClick={() => void act("rewrite", article.id)}><RefreshCw className="mr-1.5 h-3.5 w-3.5"/>Remove and rewrite</Button>
              <Button size="sm" disabled={busy === article.id} onClick={() => void act("mark-reviewed", article.id)}><ShieldCheck className="mr-1.5 h-3.5 w-3.5"/>Mark reviewed</Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">{pageFindings.length === 0 ? <p className="text-sm text-muted-foreground">No open findings recorded.</p> : pageFindings.map(finding => <div key={finding.id} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase">{finding.section}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${finding.severity === "high" ? "bg-destructive/10 text-destructive" : finding.severity === "medium" ? "bg-amber-500/10 text-amber-700" : "bg-muted text-muted-foreground"}`}>{finding.severity}</span><span className="text-xs text-muted-foreground">{finding.verdict}</span></div>
            <p className="mt-2 text-sm"><strong>Claim:</strong> {finding.claim}</p>
            {finding.student_message && <p className="mt-2 text-sm"><strong>Student report:</strong> {finding.student_message}</p>}
            {finding.reference && <p className="mt-2 text-xs text-muted-foreground"><strong>Reference:</strong> {finding.reference}</p>}
            {finding.suggested_fix && <p className="mt-2 text-sm"><strong>Suggested fix:</strong> {finding.suggested_fix}</p>}
            <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" disabled={busy === finding.id || !finding.suggested_fix} onClick={() => void act("apply-fix", article.id, finding.id)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/>Apply fix</Button><Button size="sm" variant="ghost" disabled={busy === finding.id} onClick={() => void act("dismiss", article.id, finding.id)}><XCircle className="mr-1.5 h-3.5 w-3.5"/>Dismiss</Button></div>
          </div>)}</div>
        </section>;
      })}</div>}
    <div className="mt-6 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0"/>AI checking is not a substitute for clinical judgement. Human review is required for unresolved findings.</div>
  </div>;
}
