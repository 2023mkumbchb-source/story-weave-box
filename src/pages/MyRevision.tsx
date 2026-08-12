import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Bookmark, BookOpen, CalendarDays, CheckCircle2, Clock, Flame, Loader2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getActivity, getBookmarks, getProgress, computeStreak, type BookmarkRow, type ResourceProgress } from "@/lib/study";
import { supabase } from "@/integrations/supabase/client";
import { buildBlogPath } from "@/lib/store";

type ArticleSummary = { id:string; title:string; slug:string|null; category:string; updated_at:string|null; created_at:string };

export default function MyRevision() {
  const { user, loading: authLoading } = useAuth();
  const [progress,setProgress]=useState<ResourceProgress[]>([]), [bookmarks,setBookmarks]=useState<BookmarkRow[]>([]);
  const [articles,setArticles]=useState<ArticleSummary[]>([]), [streak,setStreak]=useState(0), [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;(async()=>{setLoading(true);const [p,b,a]=await Promise.all([getProgress(user?.id||null),getBookmarks(user?.id||null),getActivity(user?.id||null)]);const ids=[...new Set([...p,...b].filter(x=>x.resource_type==='article').map(x=>x.resource_id))];let rows:ArticleSummary[]=[];if(ids.length){const {data}=await supabase.from('articles').select('id,title,slug,category,updated_at,created_at').in('id',ids).eq('published',true);rows=(data||[]) as ArticleSummary[]}if(alive){setProgress(p);setBookmarks(b);setArticles(rows);setStreak(computeStreak(a));setLoading(false)}})();return()=>{alive=false}},[user?.id]);
  const byId=useMemo(()=>new Map(articles.map(a=>[a.id,a])),[articles]);
  const ongoing=progress.filter(p=>p.status==='in_progress'||p.status==='revisit'||p.status==='difficult');
  const completed=progress.filter(p=>p.status==='completed').length;
  const saved=bookmarks.filter(b=>b.resource_type==='article');
  if(authLoading||loading)return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;
  const ResourceList=({items,empty}:{items:{resource_id:string;status?:string}[];empty:string})=><div className="space-y-2">{items.length?items.slice(0,12).map((p,i)=>{const a=byId.get(p.resource_id);return a?<Link key={`${p.resource_id}-${i}`} to={buildBlogPath(a)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40"><BookOpen className="h-4 w-4 text-primary"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block truncate text-xs text-muted-foreground">{a.category}</span></span>{p.status&&<span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase">{p.status.replace('_',' ')}</span>}</Link>:null}):<p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>}</div>;
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12"><Helmet><title>My Revision | OmpathStudy</title><meta name="robots" content="noindex"/></Helmet>
    <div className="rounded-3xl bg-[hsl(174,62%,20%)] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-white/60">Personal study space</p><h1 className="mt-2 font-serif text-3xl font-bold">My Revision</h1><p className="mt-2 max-w-2xl text-sm text-white/75">Continue where you stopped, revisit difficult material and keep your exam preparation together.</p>{!user&&<Link to="/login" className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-bold text-[hsl(174,62%,20%)]">Sign in to sync across devices</Link>}</div>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[[Clock,'In progress',ongoing.length],[CheckCircle2,'Completed',completed],[Bookmark,'Saved',saved.length],[Flame,'Study streak',`${streak} days`]].map(([Icon,label,value]:any)=><div key={label} className="rounded-2xl border border-border bg-card p-4"><Icon className="h-5 w-5 text-primary"/><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
    <div className="mt-8 grid gap-8 lg:grid-cols-2"><section><h2 className="mb-3 font-serif text-xl font-bold">Continue studying</h2><ResourceList items={ongoing} empty="Open a study note and mark it for revision."/></section><section><h2 className="mb-3 font-serif text-xl font-bold">Saved resources</h2><ResourceList items={saved} empty="Use the Save button on any article to build your list."/></section></div>
    <div className="mt-8 grid gap-3 sm:grid-cols-2"><Link to="/revision-planner" className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 hover:border-primary"><CalendarDays className="h-6 w-6 text-primary"/><span><strong className="block">Build a revision plan</strong><span className="text-sm text-muted-foreground">Turn your units and exam date into daily tasks.</span></span></Link><Link to="/search" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40"><Target className="h-6 w-6 text-primary"/><span><strong className="block">Find a weak topic</strong><span className="text-sm text-muted-foreground">Search notes, CATs, papers and flashcards together.</span></span></Link></div>
  </main>;
}
