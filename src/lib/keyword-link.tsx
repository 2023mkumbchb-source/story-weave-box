import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildBlogPath, buildFlashcardPath, type Article, type FlashcardSet, type Story } from "@/lib/store";
import { slugify } from "@/lib/deep-link";
import { buildStoryPath, stripRichText } from "@/lib/seo";

export type LinkEntry = { term: string; path: string; lower: string; target: string; category?: string | null; quality: number };
interface Ctx { entries: LinkEntry[]; used: Set<string>; usedTargets: Set<string>; currentPath: string | null; currentCategory: string | null }
const KeywordLinkContext = createContext<Ctx | null>(null);
let cache: LinkEntry[] | null = null;
let cachePromise: Promise<LinkEntry[]> | null = null;

const HIGH_VALUE_TERMS = [
  "general pathology", "clinical pathology", "clinical techniques", "oncopathology", "oncology",
  "osteochondroma", "bone tumour", "bone tumor", "parasitology", "entomology", "bacteriology",
  "microbiology", "hematopathology", "neuropathology", "inflammation", "neoplasia", "necrosis",
  "thrombosis", "embolism", "granuloma", "tuberculosis", "malaria", "schistosomiasis",
  "university of nairobi", "uon", "kenyatta university", "moi university", "kabarak university", "aga khan",
  "apoptosis", "metaplasia", "dysplasia", "hyperplasia", "hypertrophy", "atrophy", "ischemia",
  "infarction", "atherosclerosis", "vasculitis", "amyloidosis", "carcinoma", "sarcoma", "lymphoma",
  "leukemia", "anaemia", "anemia", "haemostasis", "hemostasis", "coagulation", "immunology",
  "hypersensitivity", "autoimmunity", "immunodeficiency", "mycology", "virology", "helminthiasis",
  "toxoplasmosis", "leishmaniasis", "trypanosomiasis", "amoebiasis", "giardiasis", "candidiasis",
  "cryptococcosis", "aspergillosis", "dermatophytosis", "influenza", "hepatitis", "rabies", "hiv",
  "streptococcus", "staphylococcus", "clostridium", "mycobacterium", "pseudomonas", "salmonella",
  "shigella", "cholera", "syphilis", "pharmacology", "pharmacokinetics", "pharmacodynamics",
];
const HIGH_VALUE_SET = new Set(HIGH_VALUE_TERMS);

export function stripCatalogLabel(title: string): string {
  return title
    .replace(/\s+[—–-]\s+(?:Notes|CAT(?:\s+20\d{2}(?:\/\d{2,4})?)?|Past Paper(?:\s+20\d{2}(?:\/\d{2,4})?)?|MCQ Bank|Course Outline|Revision Guide)\s*$/i, "")
    .replace(/\s+\|\s+(?:Notes|CAT|Past Paper|MCQ Bank|Course Outline|Revision Guide)\s*$/i, "")
    .trim();
}

function cleanTerm(raw: string): string {
  return stripRichText(raw).replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\s]+/gu, "")
    .replace(/\b(year|unit|chapter|overview|introduction|definition|summary|clinical notes|study notes)\b/gi, " ")
    .replace(/\s+/g, " ").trim().replace(/^[-—–:;,.]+|[-—–:;,.]+$/g, "");
}

export function isUsefulTerm(term: string): boolean {
  if (term.length < 5 || term.length > 80 || !/[a-z]/i.test(term) || /^\d+$/.test(term)) return false;
  const words = term.split(/\s+/);
  if (words.length > 8) return false;
  const banned = /^(the|and|but|with|from|into|onto|over|under|this|that|these|those|also|then|than|when|where|while|because|therefore|however|thus|hence|other|another|first|second|third|final|note|notes|definition|overview|introduction|summary|causes|cause|features|feature|management|treatment|diagnosis|classification|types|type|examples|example|important|various|common|general|specific|clinical|study|chapter|section|topic|topics|article|articles|page|pages|year|years|unit|units|method|methods|process|processes|effect|effects|symptom|symptoms|sign|signs|drug|drugs|disease|diseases|patient|patients|test|tests|level|levels|stage|stages|step|steps|number|numbers|name|names|group|groups|case|cases|tissue|tissues|body|organ|organs|cell|cells|blood|fluid|fluids|system|systems|function|functions|structure|structures|action|actions|table|tables|figure|figures|image|images|review)$/i;
  if (words.length === 1) {
    if (banned.test(term)) return false;
    // Single words are highlighted only when they are recognised medical
    // concepts (or have a strongly medical scientific suffix).
    return HIGH_VALUE_SET.has(term.toLowerCase()) || /(?:itis|osis|oma|emia|uria|pathy|plasm|cyte|virus|coccus|mycin)$/i.test(term);
  }
  const meaningful = words.filter(word => word.length > 3 && !banned.test(word));
  return meaningful.length > 0;
}

async function loadEntries(): Promise<LinkEntry[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const [{ data: articles }, { data: flashcards }, { data: stories }] = await Promise.all([
        supabase.from("articles").select("id,title,slug,meta_title,meta_description,tags,category,exam_type").eq("published", true).is("deleted_at", null).limit(1500),
        supabase.from("flashcard_sets").select("id,title,slug,meta_title,meta_description,category").eq("published", true).is("deleted_at", null).limit(1200),
        supabase.from("stories").select("id,title,meta_title,meta_description").eq("published", true).limit(500),
      ]);
      const entries: LinkEntry[] = [], seen = new Set<string>();
      const add = (raw: string | null | undefined, path: string, quality: number, category?: string | null) => {
        const term = cleanTerm(raw || ""), lower = term.toLowerCase(), key = `${path}|${lower}`;
        if (!isUsefulTerm(term) || seen.has(key)) return;
        seen.add(key); entries.push({ term, lower, path, target: slugify(term), category, quality });
      };
      const addTitle = (raw: string | null | undefined, path: string, category?: string | null, quality = 12) => {
        const base = stripCatalogLabel(stripRichText(raw || ""));
        add(base, path, quality, category);
        add(base.replace(/\b(MCQs?|Quiz|Questions?|Answers?|Exam(?:ination)?|Study Notes?|Flashcards?)\b/gi, " "), path, quality - 1, category);
        if (base.split(/\s+/).length <= 7) base.split(/\s+(?:and|vs\.?|versus|&)\s+|\s*[:—–]\s*/i).forEach(p => add(p, path, quality - 2, category));
      };
      const aliases = (title: string | null | undefined, path: string, desc?: string | null, tags?: string[], category?: string | null, quality = 12) => {
        addTitle(title, path, category, quality);
        add(category, path, 2, category);
        (tags || []).slice(0, 8).forEach(t => add(t, path, 4, category));
        const base = stripCatalogLabel(title || "");
        add(base.replace(/\([^)]{2,80}\)/g, " "), path, quality - 2, category);
        base.match(/\(([^)]{3,80})\)/g)?.forEach(m => add(m.slice(1, -1), path, quality - 3, category));
        base.split(/[:—–-]/).forEach(p => add(p, path, quality - 4, category));
        const haystack = `${title || ""} ${desc || ""}`.toLowerCase();
        HIGH_VALUE_TERMS.forEach(term => { if (haystack.includes(term)) add(term, path, 5, category); });
      };
      (articles as Partial<Article>[] || []).forEach(a => aliases(a.meta_title || a.title, buildBlogPath(a as Article), a.meta_description, (a as any).tags, a.category, (a as any).exam_type ? 10 : 14));
      (flashcards as Partial<FlashcardSet>[] || []).forEach(f => aliases(f.meta_title || f.title, buildFlashcardPath(f as FlashcardSet), f.meta_description, [], (f as any).category, 8));
      (stories as Partial<Story>[] || []).forEach(s => aliases(s.meta_title || s.title, buildStoryPath(s as Story), s.meta_description, [], null, 6));
      entries.sort((a,b) => b.term.length-a.term.length || b.quality-a.quality); cache=entries; return entries;
    } catch { return []; }
  })();
  return cachePromise;
}

export function KeywordLinkProvider({ currentPath, currentCategory, children }: { currentPath?: string; currentCategory?: string; children: ReactNode }) {
  const [entries,setEntries]=useState<LinkEntry[]>(cache||[]);
  useEffect(()=>{ loadEntries().then(setEntries); },[]);
  const ctx=useMemo<Ctx>(()=>({entries,used:new Set(),usedTargets:new Set(),currentPath:currentPath||null,currentCategory:currentCategory||null}),[entries,currentPath,currentCategory]);
  return <KeywordLinkContext.Provider value={ctx}>{children}</KeywordLinkContext.Provider>;
}

export function linkifyText(text: string, ctx: Ctx | null, keyPrefix="k"): ReactNode {
  if(!ctx||!ctx.entries.length||!text)return text;
  const {entries,used,usedTargets,currentPath,currentCategory}=ctx;
  const pool=entries.filter(e=>!used.has(e.lower)&&e.path!==currentPath&&(!usedTargets.has(e.path)||e.quality>=12))
    .sort((a,b)=>Number(b.category===currentCategory)-Number(a.category===currentCategory)||b.quality-a.quality||b.term.length-a.term.length).slice(0,5000);
  const out:ReactNode[]=[];let rest=text,i=0;
  while(true){const found=findBestMatch(rest,pool);if(!found){out.push(rest);break}const{entry,index,matched}=found;const before=rest.slice(0,index);used.add(entry.lower);usedTargets.add(entry.path);if(before)out.push(<span key={`${keyPrefix}-b-${i}`}>{before}</span>);out.push(<DeepLinkSpan key={`${keyPrefix}-l-${i}`} path={`${entry.path}#${entry.target||slugify(matched)}`} title={entry.term} label={matched}/>);rest=rest.slice(index+matched.length);if(++i>28){out.push(rest);break}}
  return <>{out}</>;
}

function DeepLinkSpan({path,title,label}:{path:string;title:string;label:string}){const navigate=useNavigate();return <button type="button" className="deep-link" onClick={e=>{e.preventDefault();try{sessionStorage.setItem("deep_link_return",`${window.location.pathname}${window.location.search}${window.location.hash}|${window.scrollY}`)}catch{}navigate(path)}} aria-label={`${label}: open the detailed ${title} study page`} title={`Study ${title} in detail`}>{label}</button>}
function findBestMatch(text:string,pool:LinkEntry[]){const lower=text.toLowerCase();let best:{entry:LinkEntry;index:number;matched:string}|null=null;for(const entry of pool){let from=0;while(from<lower.length){const index=lower.indexOf(entry.lower,from);if(index<0)break;const end=index+entry.term.length,before=index===0?"":lower[index-1],after=end>=lower.length?"":lower[end];if(!/[a-z0-9]/i.test(before)&&!/[a-z0-9]/i.test(after)){if(!best||index<best.index||(index===best.index&&(entry.term.length>best.entry.term.length||(entry.term.length===best.entry.term.length&&entry.quality>best.entry.quality))))best={entry,index,matched:text.slice(index,end)};break}from=index+1}}return best}
export function useKeywordLinks(){return useContext(KeywordLinkContext)}
