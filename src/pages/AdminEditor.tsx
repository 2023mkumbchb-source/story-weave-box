import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote,
  Heading2, Heading3, Undo, Redo, Save, ChevronLeft, ChevronRight,
  Plus, Search, ImagePlus, Eye, Loader2, ArrowLeft, Sparkles, Zap,
  Trash2, FolderPlus, WifiOff, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  saveArticle, saveMcqSet, UNIT_CATEGORIES, YEAR_CATEGORIES,
  getCategoryDisplayName, buildBlogPath,
  getArticleCategories, saveArticleCategory,
  type McqSet, type Article, type ArticleCategory,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { slugifyText, SITE_URL, extractFirstImageFromContent, stripRichText } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { saveDraft, getDrafts, syncDrafts, deleteDraft, type OfflineDraft } from "@/lib/offline-drafts";

type EditorMode = "articles" | "mcqs" | "stories";

const TiptapImage = Image.configure({ inline: false, allowBase64: true });

function mdToHtml(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  const lines = html.split("\n");
  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|li|blockquote|img|p|div|table|tr|td|th|thead|tbody)/.test(trimmed)) return trimmed;
    return `<p>${trimmed}</p>`;
  }).join("\n");
}

/** Extract a clean title from raw notes — first H1/H2 or first plain meaningful line. */
function extractTitleFromNotes(notes: string): string {
  if (!notes) return "";
  const lines = notes.split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (/^[-=_*]{3,}$/.test(t)) continue;
    const h = t.match(/^#{1,3}\s+(.+?)\s*#*$/);
    if (h) return h[1].replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/\*\*/g, "").trim();
    if (t.length > 3 && t.length < 140) return t.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/\*\*/g, "").trim();
    break;
  }
  return "";
}

/** Parse manually-formatted MCQs from full papers. Supports A–F options and answer markers. */
function parseMcqsFromText(raw: string): { type: "mcq"; question: string; options: string[]; correct_answer: number; explanation: string }[] {
  if (!raw) return [];
  const normalized = raw.replace(/\r/g, "").replace(/([A-F])[.)]\s+/g, "\n$1. ").replace(/\n{3,}/g, "\n\n");
  const blocks = normalized.split(/\n(?=\s*(?:#{1,4}\s*)?(?:MCQ|Multiple\s*Choice|Question|Q|\d+[.)])\s*\d*)/i);
  const out: any[] = [];
  for (const block of blocks) {
    const text = block.trim();
    if (!text) continue;
    if (/\b(?:SAQ|Short\s*Answer|Essay|LAQ|Long\s*Answer)\b/i.test(text.slice(0, 120))) continue;
    const optRe = /^\s*[-*]?\s*([A-F])[.):\-]\s+(.+)$/gm;
    const optMatches: { letter: string; text: string; index: number }[] = [];
    let m;
    while ((m = optRe.exec(text)) !== null) {
      optMatches.push({ letter: m[1].toUpperCase(), text: m[2].trim(), index: m.index });
    }
    if (optMatches.length < 2) continue;
    let qPart = text.slice(0, optMatches[0].index).trim();
    qPart = qPart
      .replace(/^#{1,4}\s*(?:MCQ|Question|Q)\s*\d+\s*[:.\-]?\s*$/gim, "")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/^---+\s*$/gm, "")
      .trim();
    if (!qPart) continue;
    const lastOpt = optMatches[optMatches.length - 1];
    const afterOpts = text.slice(lastOpt.index + lastOpt.text.length);
    const ansMatch = afterOpts.match(/(?:✅\s*)?\*?\*?\s*(?:Correct\s*)?Answer\s*:?\s*\*?\*?\s*([A-F])\b/i);
    let correctIdx = 0;
    let explanation = "";
    if (ansMatch) {
      const letter = ansMatch[1].toUpperCase();
      const idx = optMatches.findIndex(o => o.letter === letter);
      if (idx >= 0) correctIdx = idx;
      const aIdx = afterOpts.indexOf(ansMatch[0]) + ansMatch[0].length;
      explanation = afterOpts.slice(aIdx).replace(/^[\s—\-:*]*/, "").trim();
      explanation = explanation.split(/\n---|\n#{1,4}\s+(?:MCQ|Question|Q)\s*\d/i)[0].trim();
      explanation = explanation.replace(/\*\*/g, "").trim();
    }
    out.push({
      type: "mcq",
      question: qPart,
      options: optMatches.map(o => o.text.replace(/\*\*/g, "").trim()),
      correct_answer: correctIdx,
      explanation: explanation.slice(0, 2000),
    });
  }
  return out;
}

function parseWrittenQuestionsFromText(raw: string): any[] {
  if (!raw) return [];
  const lines = raw.replace(/\r/g, "").split("\n");
  const questions: any[] = [];
  let mode: "saq" | "essay" | null = null;
  let current: { type: "saq" | "essay"; lines: string[] } | null = null;

  const startNew = (type: "saq" | "essay", firstLine: string) => {
    flush();
    current = { type, lines: [firstLine].filter(Boolean) };
  };
  const flush = () => {
    if (!current) return;
    const item = current;
    const joined = item.lines.join("\n").replace(/\*\*/g, "").trim();
    current = null;
    if (!joined || /^[\-–—]+$/.test(joined)) return;
    const marksMatch = joined.match(/\(?\b(\d{1,2})\s*marks?\b\)?/i);
    const answerMatch = joined.match(/(?:Model\s*)?(?:Answer|Marking\s*Guide|Suggested\s*Answer)\s*:?\s*([\s\S]+)/i);
    const question = (answerMatch ? joined.slice(0, answerMatch.index) : joined)
      .replace(/^\s*(?:Question\s*)?\d+\s*[:.)-]\s*/i, "")
      .replace(/\(?\b\d{1,2}\s*marks?\b\)?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const answer = answerMatch ? answerMatch[1].replace(/^[-—:*\s]+/, "").trim() : "";
    if (question.length < 8) return;
    const inferredEssay = item.type === "essay" || /\b(?:essay|discuss|describe in detail|long answer)\b/i.test(question) || Number(marksMatch?.[1] || 0) >= 12;
    questions.push({
      type: inferredEssay ? "essay" : "saq",
      question,
      answer,
      marks: marksMatch ? Number(marksMatch[1]) : inferredEssay ? 20 : 5,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const heading = line.replace(/^#{1,6}\s*/, "");
    if (/\b(?:MCQ|Multiple\s*Choice)\b/i.test(heading)) { flush(); mode = null; continue; }
    if (/\b(?:SAQ|Short\s*Answer)\b/i.test(heading) && !/^\s*(?:SAQ|Short\s*Answer)\s*\d+/i.test(heading)) { flush(); mode = "saq"; continue; }
    if (/\b(?:Essay|LAQ|Long\s*Answer)\b/i.test(heading) && !/^\s*(?:Essay|LAQ|Long\s*Answer)\s*\d+/i.test(heading)) { flush(); mode = "essay"; continue; }

    const explicit = heading.match(/^(SAQ|Short\s*Answer|Essay|LAQ|Long\s*Answer)\s*\d*\s*[:.)-]?\s*(.*)$/i);
    if (explicit) {
      const type = /Essay|LAQ|Long/i.test(explicit[1]) ? "essay" : "saq";
      mode = type;
      startNew(type, explicit[2] || heading);
      continue;
    }

    const numberedWritten = mode && line.match(/^(?:Question\s*)?\d+\s*[:.)-]\s+(.+)$/i);
    if (numberedWritten) { startNew(mode, numberedWritten[1]); continue; }

    if (current) current.lines.push(line);
  }
  flush();
  return questions;
}

function htmlToMd(html: string): string {
  if (!html) return "";
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<u>(.*?)<\/u>/gi, "$1")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1")
    .replace(/<ul[^>]*>|<\/ul>/gi, "")
    .replace(/<ol[^>]*>|<\/ol>/gi, "")
    .replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<img[^>]+src="([^"]+)"[^>]*\/?>/gi, "![]($1)")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();
}

function ToolbarBtn({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={cn("rounded p-1.5 transition-colors hover:bg-muted", active && "bg-primary/10 text-primary")}>
      {children}
    </button>
  );
}

const YEARS = [0, 1, 2, 3, 4, 5, 6]; // 0 = Uncategorized

export default function AdminEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (localStorage.getItem("learninghub_auth") !== "true" && sessionStorage.getItem("learninghub_auth") !== "true") navigate("/login");
  }, [navigate]);

  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [addMethod, setAddMethod] = useState<"direct" | "gemini">("direct");
  const [geminiNotes, setGeminiNotes] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [aiMetaLoading, setAiMetaLoading] = useState(false);
  const [customCategories, setCustomCategories] = useState<ArticleCategory[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>("articles");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraft[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  // Load offline drafts
  useEffect(() => { getDrafts().then(setOfflineDrafts).catch(() => {}); }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (!isOnline) return;
    const doSync = async () => {
      const unsynced = offlineDrafts.filter(d => !d.synced);
      if (!unsynced.length) return;
      setSyncing(true);
      try {
        const result = await syncDrafts(async (draft) => {
          if (draft.type === "article") {
            await saveArticle(draft.payload as any);
          } else if (draft.type === "mcqs") {
            await saveMcqSet(draft.payload as any);
          }
        });
        if (result.synced > 0) {
          toast({ title: `Synced ${result.synced} offline drafts!` });
          const updated = await getDrafts();
          setOfflineDrafts(updated);
          await loadContent();
        }
      } catch {} finally { setSyncing(false); }
    };
    doSync();
  }, [isOnline]);

  const handleSaveOffline = async () => {
    if (!editor && editorMode === "articles") return;
    const content = editor ? htmlToMd(editor.getHTML()) : "";
    const mcqPayload = currentMcqSummary ? {
      id: currentMcqSummary.id,
      title: currentMcqSummary.title,
      questions: currentMcqSummary.questions,
      published: currentMcqSummary.published,
      original_notes: currentMcqSummary.original_notes || "",
      category: currentMcqSummary.category || `Year ${selectedYear}: General`,
      access_password: currentMcqSummary.access_password || "",
    } : null;
    const draft: OfflineDraft = {
      id: crypto.randomUUID(),
      type: editorMode === "mcqs" ? "mcqs" : "article",
      title: editorMode === "mcqs" ? (currentMcqSummary?.title || "Untitled MCQ Draft") : (editTitle || "Untitled Draft"),
      content,
      category: editCategory || currentMcqSummary?.category || `Year ${selectedYear}: General`,
      created_at: new Date().toISOString(),
      synced: false,
      payload: editorMode === "mcqs" && mcqPayload ? mcqPayload : {
        title: editTitle || "Untitled Draft",
        content,
        published: false,
        original_notes: content,
        category: editCategory || `Year ${selectedYear}: General`,
        meta_title: editMetaTitle,
        meta_description: editMetaDesc,
        slug: editSlug || slugifyText(editTitle || ""),
      },
    };
    await saveDraft(draft);
    setOfflineDrafts(prev => [...prev, draft]);
    toast({ title: `${editorMode === "mcqs" ? "MCQ set" : "Draft"} saved offline! Will sync when back online.` });
  };

  // MCQ editing state
  const [allMcqSets, setAllMcqSets] = useState<McqSet[]>([]);
  const [mcqFixingId, setMcqFixingId] = useState<string | null>(null);
  const [mcqAiUpdating, setMcqAiUpdating] = useState<string | null>(null);

  // Story editing state
  const [allStories, setAllStories] = useState<any[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editOgImage, setEditOgImage] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [editMcqPassword, setEditMcqPassword] = useState("");
  const [editMcqQuestions, setEditMcqQuestions] = useState<any[]>([]);
  const [savingMcq, setSavingMcq] = useState(false);

  // Load content based on mode
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await getArticleCategories();
      setCustomCategories(cats);
      if (editorMode === "articles") {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, category, created_at, updated_at, published, slug, meta_title, meta_description, og_image_url, is_raw")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        setAllArticles((data || []) as Article[]);
      } else if (editorMode === "mcqs") {
        const { data, error } = await supabase
          .from("mcq_sets")
          .select("id, title, category, created_at, updated_at, published, slug, questions, original_notes, access_password")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        setAllMcqSets((data || []) as McqSet[]);
      } else if (editorMode === "stories") {
        const { data, error } = await supabase
          .from("stories")
          .select("id, title, category, created_at, published, slug, content")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        setAllStories(data || []);
      }
    } catch (err: any) {
      toast({ title: "Failed to load", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, editorMode]);

  useEffect(() => { loadContent(); setCurrentIndex(0); }, [loadContent]);

  const filteredArticles = useMemo(() => {
    let list = selectedYear === 0
      ? allArticles.filter((a) => {
          const c = (a.category || "").trim();
          return !c || c.toLowerCase() === "uncategorized" || !/^Year\s*[1-6]\s*:/.test(c);
        })
      : allArticles.filter((a) => (a.category || "").startsWith(`Year ${selectedYear}:`));
    if (selectedUnit) list = list.filter((a) => a.category === selectedUnit);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
  }, [allArticles, selectedYear, selectedUnit, searchQuery]);

  const filteredMcqs = useMemo(() => {
    let list = selectedYear === 0
      ? allMcqSets.filter((m) => {
          const c = (m.category || "").trim();
          return !c || c.toLowerCase() === "uncategorized" || !/^Year\s*[1-6]\s*:/.test(c);
        })
      : allMcqSets.filter((m) => (m.category || "").startsWith(`Year ${selectedYear}:`));
    if (selectedUnit) list = list.filter((m) => m.category === selectedUnit);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return list;
  }, [allMcqSets, selectedYear, selectedUnit, searchQuery]);

  const filteredStories = useMemo(() => {
    let list = allStories;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q));
    }
    return list;
  }, [allStories, searchQuery]);

  const currentItems = editorMode === "articles" ? filteredArticles : editorMode === "mcqs" ? filteredMcqs : filteredStories;
  const currentArticleSummary = editorMode === "articles" ? (filteredArticles[currentIndex] || null) : null;
  const currentMcqSummary = editorMode === "mcqs" ? (filteredMcqs[currentIndex] || null) : null;
  const currentStorySummary = editorMode === "stories" ? (filteredStories[currentIndex] || null) : null;

  // Load full article content only when needed
  const [fullArticle, setFullArticle] = useState<Article | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!currentArticleSummary || isAddMode) { setFullArticle(null); return; }
    let cancelled = false;
    setLoadingContent(true);
    (async () => {
      try {
        const { data } = await supabase.from("articles").select("*").eq("id", currentArticleSummary.id).single();
        if (!cancelled && data) setFullArticle(data as Article);
      } catch {}
      if (!cancelled) setLoadingContent(false);
    })();
    return () => { cancelled = true; };
  }, [currentArticleSummary?.id, isAddMode]);

  const yearUnits = useMemo(() => {
    const yearKey = `Year ${selectedYear}`;
    return (YEAR_CATEGORIES[yearKey] || []).map((u) => `${yearKey}: ${u}`);
  }, [selectedYear]);

  const allCategoryOptions = useMemo(() => {
    const standard = UNIT_CATEGORIES;
    const custom = customCategories.map(c => c.name);
    return [...new Set([...standard, ...custom])].sort();
  }, [customCategories]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TiptapImage,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none text-foreground",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src && editor) editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Load article into editor
  useEffect(() => {
    if (!fullArticle || !editor || isAddMode) return;
    const html = mdToHtml(fullArticle.content || "");
    editor.commands.setContent(html);
    setEditTitle(fullArticle.title || "");
    setEditMetaTitle(fullArticle.meta_title || "");
    setEditMetaDesc(fullArticle.meta_description || "");
    setEditSlug(fullArticle.slug || "");
    setEditCategory(fullArticle.category || "");
    setEditOgImage(fullArticle.og_image_url || "");
    setEditPublished(fullArticle.published);
  }, [fullArticle, editor, isAddMode]);

  // Initialise edit fields when an MCQ set is selected
  useEffect(() => {
    if (editorMode !== "mcqs" || !currentMcqSummary || isAddMode) return;
    setEditTitle(currentMcqSummary.title || "");
    setEditCategory(currentMcqSummary.category || "");
    setEditPublished(!!currentMcqSummary.published);
    setEditSlug(currentMcqSummary.slug || "");
    setEditOgImage((currentMcqSummary as any).og_image_url || "");
    setEditMcqPassword((currentMcqSummary as any).access_password || "");
    setEditMcqQuestions(Array.isArray(currentMcqSummary.questions) ? JSON.parse(JSON.stringify(currentMcqSummary.questions)) : []);
  }, [currentMcqSummary?.id, editorMode, isAddMode]);

  // Save edited MCQ set metadata
  const handleSaveMcq = async () => {
    if (!currentMcqSummary) return;
    setSavingMcq(true);
    try {
      await saveMcqSet({
        id: currentMcqSummary.id,
        title: editTitle || currentMcqSummary.title,
        questions: editMcqQuestions,
        published: editPublished,
        original_notes: (currentMcqSummary as any).original_notes || "",
        category: editCategory || currentMcqSummary.category || `Year ${selectedYear}: General`,
        access_password: editMcqPassword || "",
        slug: editSlug || slugifyText(editTitle || currentMcqSummary.title) || "",
        og_image_url: editOgImage || "",
        is_raw: false,
      } as any);
      toast({ title: "MCQ set saved!" });
      setAllMcqSets(prev => prev.map(m => m.id === currentMcqSummary.id ? {
        ...m,
        title: editTitle || m.title,
        category: editCategory || m.category,
        published: editPublished,
        slug: editSlug || m.slug,
        og_image_url: editOgImage || (m as any).og_image_url,
        access_password: editMcqPassword,
      } as any : m));
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingMcq(false);
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    const raw = String(newCategoryName ?? "").trim();
    if (!raw) return;
    // Auto-prefix "Year N: " when in a year context and the user didn't supply one
    const name = (selectedYear >= 1 && selectedYear <= 6 && !/^Year\s*[1-6]\s*:/i.test(raw))
      ? `Year ${selectedYear}: ${raw}`
      : raw;
    try {
      await saveArticleCategory(name);
      setCustomCategories(prev => [...prev, { id: "", name, created_at: "" }]);
      setEditCategory(name);
      setNewCategoryName("");
      setShowAddCategory(false);
      toast({ title: "Category added!" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const htmlContent = editor.getHTML();
      const mdContent = htmlToMd(htmlContent);
      const payload: any = {
        title: editTitle,
        content: mdContent,
        published: editPublished,
        original_notes: fullArticle?.original_notes || "",
        category: editCategory || `Year ${selectedYear}: General`,
        meta_title: editMetaTitle,
        meta_description: editMetaDesc,
        slug: editSlug || slugifyText(editTitle),
        og_image_url: editOgImage || extractFirstImageFromContent(mdContent) || "",
      };
      if (isAddMode) {
        await saveArticle(payload);
        toast({ title: "Article created!" });
        setIsAddMode(false);
        await loadContent();
      } else if (fullArticle) {
        payload.id = fullArticle.id;
        await saveArticle(payload);
        toast({ title: "Saved!" });
        setAllArticles(prev => prev.map(a => a.id === fullArticle.id ? { ...a, title: editTitle, category: editCategory, meta_title: editMetaTitle, meta_description: editMetaDesc, slug: editSlug, og_image_url: editOgImage, published: editPublished } : a));
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save story
  const handleSaveStory = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      // Save the HTML directly so formatting & embedded images are preserved
      // exactly as authored. StoryRead renders HTML content via the rich
      // prose styles, avoiding the lossy markdown round-trip that was
      // breaking layout and duplicating images.
      const htmlContent = editor.getHTML();
      const cover = extractFirstImageFromContent(htmlContent) || "";
      if (isAddMode || !currentStorySummary) {
        if (!editTitle.trim()) {
          toast({ title: "Title required", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data, error } = await supabase.from("stories").insert({
          title: editTitle,
          content: htmlContent,
          category: editCategory || "Uncategorized",
          published: editPublished,
          cover_image_url: cover || null,
          slug: slugifyText(editTitle),
        } as any).select().single();
        if (error) throw error;
        toast({ title: "Story created!" });
        setIsAddMode(false);
        await loadContent();
        if (data) setCurrentIndex(0);
      } else {
        await supabase.from("stories").update({
          title: editTitle,
          content: htmlContent,
          category: editCategory || "Uncategorized",
          published: editPublished,
          cover_image_url: cover || null,
          slug: slugifyText(editTitle),
        } as any).eq("id", currentStorySummary.id);
        toast({ title: "Story saved!" });
        setAllStories(prev => prev.map(s => s.id === currentStorySummary.id ? { ...s, title: editTitle, content: htmlContent, category: editCategory, published: editPublished } : s));
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // MCQ AI Update - regenerate/improve all questions in a set
  const handleMcqAiUpdate = async (setId: string) => {
    setMcqAiUpdating(setId);
    try {
      const set = allMcqSets.find(m => m.id === setId);
      if (!set) throw new Error("Set not found");
      const questions = set.questions as any[];
      const topicText = `Title: ${set.title}\nCategory: ${set.category}\nQuestions:\n${questions.slice(0, 10).map((q: any) => q.question).join("\n")}`;
      
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { notes: topicText, type: "mcqs", count: Math.max(questions.length, 15) },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data) || data.length === 0) throw new Error("No MCQs generated");
      
      await supabase.from("mcq_sets").update({ questions: data as any, updated_at: new Date().toISOString() } as any).eq("id", setId);
      toast({ title: `Updated ${data.length} MCQs with AI!` });
      await loadContent();
    } catch (err: any) {
      toast({ title: "AI update failed", description: err.message, variant: "destructive" });
    } finally {
      setMcqAiUpdating(null);
    }
  };

  const goNext = () => { if (currentIndex < currentItems.length - 1) setCurrentIndex(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const startAdd = (method: "direct" | "gemini") => {
    setIsAddMode(true);
    setAddMethod(editorMode === "mcqs" ? "gemini" : method);
    setEditTitle(""); setEditMetaTitle(""); setEditMetaDesc(""); setEditSlug("");
    setEditCategory(selectedUnit || `Year ${selectedYear}: General`);
    setEditOgImage(""); setEditPublished(false); setGeminiNotes("");
    if (editor) editor.commands.setContent("<p></p>");
  };

  const handleGeminiGenerate = async () => {
    if (!geminiNotes.trim()) return;
    setGeminiLoading(true);
    try {
      // Try client-side parsing first for MCQs (fast, free, handles 5+ options)
      if (editorMode === "mcqs") {
        const parsed = parseMcqsFromText(geminiNotes);
        const written = parseWrittenQuestionsFromText(geminiNotes);
        if (parsed.length + written.length >= 1) {
          const cat = editCategory || `Year ${selectedYear}: General`;
          const title = editTitle || extractTitleFromNotes(geminiNotes) || `MCQ: ${cat.split(":").pop()?.trim() || "General"}`;
          await saveMcqSet({
            title, questions: [...parsed, ...written] as any, published: true, category: cat,
            original_notes: geminiNotes, access_password: "",
            created_at: new Date().toISOString(),
          } as any);
          toast({ title: `Parsed ${parsed.length} MCQs${written.length ? ` + ${written.length} written questions` : ""} directly!` });
          setIsAddMode(false);
          await loadContent();
          setGeminiLoading(false);
          return;
        }
      }
      const contentType = editorMode === "mcqs" ? "mcqs" : editorMode === "stories" ? "article" : "article";
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { notes: geminiNotes, type: contentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (editorMode === "mcqs" && Array.isArray(data)) {
        const cat = editCategory || `Year ${selectedYear}: General`;
        const title = editTitle || extractTitleFromNotes(geminiNotes) || `MCQ: ${cat.split(":").pop()?.trim() || "General"}`;
        const written = parseWrittenQuestionsFromText(geminiNotes);
        await saveMcqSet({
          title,
          questions: [...data.map((q: any) => ({ type: "mcq", ...q })), ...written] as any, published: true, category: cat,
          original_notes: geminiNotes, access_password: "",
          created_at: new Date().toISOString(),
        } as any);
        toast({ title: `Created ${data.length} MCQs${written.length ? ` + ${written.length} written questions` : ""}!` });
        setIsAddMode(false);
        await loadContent();
      } else {
        const finalTitle = data.title || extractTitleFromNotes(geminiNotes) || "Untitled";
        setEditTitle(finalTitle);
        setEditMetaTitle(finalTitle);
        setEditSlug(slugifyText(finalTitle));
        setEditMetaDesc(stripRichText(data.content || "", 160));
        if (editor) editor.commands.setContent(mdToHtml(data.content || ""));
        toast({ title: "Generated!" });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleAiMeta = async () => {
    if (!editor) return;
    setAiMetaLoading(true);
    try {
      const content = htmlToMd(editor.getHTML());
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          notes: `Title: ${editTitle}\nCategory: ${editCategory}\nContent:\n${content.slice(0, 4000)}`,
          type: "generate-seo-meta",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.meta_title) setEditMetaTitle(data.meta_title);
      if (data?.meta_description) setEditMetaDesc(data.meta_description);
      if (data?.slug) setEditSlug(data.slug);

      // Free image lookup via Wikipedia REST API (no key required).
      // Only fills if no og image is currently set, so we never overwrite user choice.
      if (!editOgImage) {
        try {
          const candidates = [
            data?.meta_title,
            editTitle,
          ].filter(Boolean) as string[];
          for (const term of candidates) {
            const clean = term.replace(/[^A-Za-z0-9 \-]/g, "").trim().slice(0, 80);
            if (!clean) continue;
            const r = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`,
              { headers: { Accept: "application/json" } }
            );
            if (!r.ok) continue;
            const j: any = await r.json();
            const img = j?.originalimage?.source || j?.thumbnail?.source;
            if (img) { setEditOgImage(img); break; }
          }
        } catch { /* image lookup is best-effort */ }
      }

      toast({ title: "AI meta generated!" });
    } catch (err: any) {
      toast({ title: "AI meta failed", description: err.message, variant: "destructive" });
    } finally {
      setAiMetaLoading(false);
    }
  };

  const handleAiFormat = async () => {
    if (!editor) return;
    setGeminiLoading(true);
    try {
      const content = htmlToMd(editor.getHTML());
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { notes: content, type: "direct-article", title: editTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.content) editor.commands.setContent(mdToHtml(data.content));
      if (data?.title && !editTitle) setEditTitle(data.title);
      toast({ title: "Content formatted by AI!" });
    } catch (err: any) {
      toast({ title: "AI format failed", description: err.message, variant: "destructive" });
    } finally {
      setGeminiLoading(false);
    }
  };

  // Load story into editor
  useEffect(() => {
    if (editorMode !== "stories" || !currentStorySummary || !editor || isAddMode) return;
    // Existing stories may be saved as HTML (new format) or markdown (legacy).
    // Detect by presence of any HTML tag and load accordingly so the editor
    // never double-escapes content or loses formatting.
    const raw = currentStorySummary.content || "";
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);
    editor.commands.setContent(looksLikeHtml ? raw : mdToHtml(raw));
    setEditTitle(currentStorySummary.title || "");
    setEditCategory(currentStorySummary.category || "");
    setEditPublished(currentStorySummary.published);
  }, [currentStorySummary?.id, editor, editorMode, isAddMode]);

  const previewUrl = fullArticle ? `${SITE_URL}${buildBlogPath(fullArticle)}` : "";
  const iconSize = "h-4 w-4";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editor | OmpathStudy Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-2 py-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1 text-xs px-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Admin
            </Button>

            <div className="flex items-center gap-1">
              {!isAddMode && currentItems.length > 0 && (
                <>
                  <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="h-7 w-7">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground min-w-[50px] text-center">
                    {currentIndex + 1}/{currentItems.length}
                  </span>
                  <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex >= currentItems.length - 1} className="h-7 w-7">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium">
                  <WifiOff className="h-3 w-3" /> Offline
                </span>
              )}
              {syncing && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
                </span>
              )}
              {isAddMode && <Button variant="ghost" size="sm" onClick={() => setIsAddMode(false)} className="text-xs">Cancel</Button>}
              {!isOnline && (editorMode === "articles" || editorMode === "mcqs") && (
                <Button size="sm" onClick={handleSaveOffline} className="gap-1 text-xs h-7 px-2">
                  <WifiOff className="h-3 w-3" /> Save Offline
                </Button>
              )}
              {isOnline && (editorMode === "articles" || editorMode === "stories") && (
                <Button size="sm" onClick={editorMode === "stories" ? handleSaveStory : handleSave} disabled={saving} className="gap-1 text-xs h-7 px-2">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </Button>
              )}
              {fullArticle && !isAddMode && editorMode === "articles" && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2">
                    <Eye className="h-3 w-3" /> View
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-2 py-3 space-y-3">
          {/* Mode selector */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 overflow-x-auto">
            {(["articles", "mcqs", "stories"] as const).map((m) => (
              <button key={m} onClick={() => { setEditorMode(m); setCurrentIndex(0); setIsAddMode(false); }}
                className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap capitalize",
                  editorMode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {m === "mcqs" ? "MCQs" : m}
              </button>
            ))}
          </div>

          {/* Year & Filter */}
          {editorMode !== "stories" && (
            <div className="space-y-2">
              <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 overflow-x-auto">
                {YEARS.map((yr) => (
                  <button key={yr} onClick={() => { setSelectedYear(yr); setSelectedUnit(""); setCurrentIndex(0); setIsAddMode(false); }}
                    className={cn("flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                      selectedYear === yr ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {yr === 0 ? "Uncat" : `Y${yr}`}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={selectedUnit} onChange={(e) => { setSelectedUnit(e.target.value); setCurrentIndex(0); }}
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <option value="">All units ({editorMode === "articles" ? filteredArticles.length : filteredMcqs.length})</option>
                  {yearUnits.map((u) => <option key={u} value={u}>{getCategoryDisplayName(u)}</option>)}
                </select>
                <div className="relative flex-1 min-w-[120px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                    placeholder="Search..." className="pl-7 h-8 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => startAdd(editorMode === "mcqs" ? "gemini" : "direct")} className="gap-1 text-xs h-7 px-2">
                  <Plus className="h-3 w-3" /> Add {editorMode === "mcqs" ? "MCQ Set" : "Article"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => startAdd("gemini")} className="gap-1 text-xs h-7 px-2">
                  <Sparkles className="h-3 w-3" /> Generate with AI
                </Button>
                {editorMode === "mcqs" && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    setMcqFixingId("all");
                    try {
                      const { data, error } = await supabase.functions.invoke("mcq-quality-fix", { body: {} });
                      if (error) throw new Error(error.message);
                      toast({ title: `Fixed ${data?.sets_fixed || 0} sets, removed ${data?.questions_removed || 0} bad questions` });
                      await loadContent();
                    } catch (err: any) {
                      toast({ title: "Fix failed", description: err.message, variant: "destructive" });
                    } finally { setMcqFixingId(null); }
                  }} disabled={!!mcqFixingId} className="gap-1 text-xs h-7 px-2">
                    {mcqFixingId === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Fix All MCQs
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Stories search */}
          {editorMode === "stories" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                    placeholder="Search stories..." className="pl-7 h-8 text-xs" />
                </div>
                <Button variant="outline" size="sm" onClick={() => startAdd("direct")} className="gap-1 text-xs h-8 px-2">
                  <Plus className="h-3 w-3" /> Add Story
                </Button>
              </div>
            </div>
          )}

          {/* Item pills */}
          {!isAddMode && currentItems.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-2 px-2" style={{ scrollbarWidth: "thin" }}>
              {currentItems.slice(0, 50).map((a: any, i: number) => (
                <button key={a.id} onClick={() => setCurrentIndex(i)}
                  className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] transition-colors border max-w-[150px] truncate",
                    i === currentIndex ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted")}
                  title={a.title}>{a.title}</button>
              ))}
              {currentItems.length > 50 && <span className="text-[10px] text-muted-foreground self-center shrink-0">+{currentItems.length - 50} more</span>}
            </div>
          )}

          {/* AI Generate input for add mode */}
          {isAddMode && addMethod === "gemini" && (
            <div className="space-y-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                placeholder={editorMode === "mcqs" ? "MCQ set title (optional)" : "Title (optional)"}
                className="text-sm h-8" />
              {/* Category selector */}
              <div className="flex gap-1.5">
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <option value="">Auto-detect category</option>
                  {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Button variant="outline" size="sm" onClick={() => setShowAddCategory(!showAddCategory)} className="h-8 px-2">
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showAddCategory && (
                <div className="flex gap-1.5">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={selectedYear >= 1 && selectedYear <= 6 ? `New unit name (will save as "Year ${selectedYear}: ...")` : "e.g. Year 3: Hematopathology"} className="text-xs h-7 flex-1" />
                  <Button size="sm" onClick={handleAddCategory} className="h-7 text-xs">Add</Button>
                </div>
              )}
              <Textarea value={geminiNotes} onChange={(e) => setGeminiNotes(e.target.value)}
                placeholder={editorMode === "mcqs" ? "Paste notes or raw MCQs here..." : "Paste your raw notes here..."} className="min-h-[120px] text-sm" />
              <Button onClick={handleGeminiGenerate} disabled={geminiLoading} size="sm" className="gap-1 w-full">
                {geminiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate {editorMode === "mcqs" ? "MCQs" : "Article"} with AI
              </Button>
            </div>
          )}

          {/* No items */}
          {!isAddMode && currentItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {editorMode === "stories" ? "No stories found." : `No ${editorMode} for Year ${selectedYear}${selectedUnit ? ` — ${getCategoryDisplayName(selectedUnit)}` : ""}.`}
              </p>
              <div className="mt-2 flex gap-2 justify-center flex-wrap">
                <Button size="sm" onClick={() => startAdd("direct")}>Add Direct</Button>
                <Button size="sm" variant="outline" onClick={() => startAdd("gemini")}>Generate with AI</Button>
              </div>
            </div>
          )}

          {/* MCQ Editor Mode */}
          {editorMode === "mcqs" && currentMcqSummary && !isAddMode && (
            <div className="space-y-3">
              {/* Editable header */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="MCQ set title"
                  className="text-sm h-8"
                />
                <div className="flex gap-1.5">
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">Select category</option>
                    {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Slug</label>
                    <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder={slugifyText(editTitle)} className="text-xs h-7" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Access password (optional)</label>
                    <Input value={editMcqPassword} onChange={(e) => setEditMcqPassword(e.target.value)} placeholder="Leave empty for public" className="text-xs h-7" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="rounded" />
                    <span className="font-medium">Published</span>
                  </label>
                  <Button size="sm" onClick={handleSaveMcq} disabled={savingMcq} className="gap-1 text-xs h-7">
                    {savingMcq ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-sm font-bold text-foreground truncate">{currentMcqSummary.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{currentMcqSummary.category} · {(currentMcqSummary.questions as any[]).length} Qs</p>
                  </div>
                  <div className="flex gap-1 flex-wrap shrink-0">
                    <Button size="sm" variant="outline" onClick={() => {
                      setMcqFixingId(currentMcqSummary.id);
                      supabase.functions.invoke("mcq-quality-fix", { body: { set_id: currentMcqSummary.id } })
                        .then(({ data, error }) => {
                          if (error) throw new Error(error.message);
                          toast({ title: `Fixed ${data?.issues?.length || 0} issues` });
                          loadContent();
                        })
                        .catch((err: any) => toast({ title: "Fix failed", description: err.message, variant: "destructive" }))
                        .finally(() => setMcqFixingId(null));
                    }} disabled={mcqFixingId === currentMcqSummary.id} className="gap-1 text-[10px] h-7 px-2">
                      {mcqFixingId === currentMcqSummary.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Fix
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMcqAiUpdate(currentMcqSummary.id)}
                      disabled={mcqAiUpdating === currentMcqSummary.id} className="gap-1 text-[10px] h-7 px-2">
                      {mcqAiUpdating === currentMcqSummary.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Update
                    </Button>
                  </div>
                </div>
                <div className="max-h-[55vh] overflow-y-auto space-y-2">
                  {editMcqQuestions.map((q: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-2 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground pt-1.5">{i + 1}.</span>
                        <Textarea value={q.question || ""}
                          onChange={(e) => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, question: e.target.value } : p))}
                          className="text-xs min-h-[40px] flex-1" placeholder="Question text" />
                        <Button size="sm" variant="ghost" onClick={() => setEditMcqQuestions(prev => prev.filter((_, idx) => idx !== i))}
                          className="h-6 w-6 p-0 text-destructive shrink-0">×</Button>
                      </div>
                      <div className="space-y-0.5 pl-4">
                        {(q.options || []).map((opt: string, j: number) => (
                          <div key={j} className="flex items-center gap-1.5">
                            <input type="radio" name={`correct-${i}`} checked={j === q.correct_answer}
                              onChange={() => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, correct_answer: j } : p))}
                              className="shrink-0" />
                            <span className="text-[10px] font-bold w-3 text-muted-foreground">{String.fromCharCode(65 + j)}</span>
                            <Input value={opt}
                              onChange={(e) => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, options: p.options.map((o: string, k: number) => k === j ? e.target.value : o) } : p))}
                              className="text-[11px] h-6 flex-1" />
                            <Button size="sm" variant="ghost" onClick={() => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, options: p.options.filter((_: any, k: number) => k !== j), correct_answer: p.correct_answer >= j && p.correct_answer > 0 ? p.correct_answer - 1 : p.correct_answer } : p))}
                              className="h-5 w-5 p-0 text-muted-foreground shrink-0">×</Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={() => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, options: [...(p.options || []), ""] } : p))}
                          className="h-5 text-[10px] px-2 mt-1">+ Option</Button>
                      </div>
                      <Textarea value={q.explanation || ""}
                        onChange={(e) => setEditMcqQuestions(prev => prev.map((p, idx) => idx === i ? { ...p, explanation: e.target.value } : p))}
                        className="text-[10px] min-h-[28px] italic" placeholder="Explanation (optional)" />
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setEditMcqQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "" }])}
                    className="w-full h-7 text-xs">+ Add Question</Button>
                </div>
              </div>
            </div>
          )}

          {/* Story Editor Mode */}
          {editorMode === "stories" && (currentStorySummary || isAddMode) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm h-8" placeholder="Story title" />
                <div className="flex gap-2">
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    <option value="">Category</option>
                    <option value="Medical">Medical</option>
                    <option value="Personal">Personal</option>
                    <option value="Creative">Creative</option>
                    <option value="Reflection">Reflection</option>
                    <option value="Inspiration">Inspiration</option>
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="rounded" />
                    <span>Published</span>
                  </label>
                </div>
              </div>
              {editor && (
                <div className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullets"><List className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => { const url = prompt("Image URL:"); if (url) editor.chain().focus().setImage({ src: url }).run(); }} title="Image"><ImagePlus className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className={iconSize} /></ToolbarBtn>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button variant="ghost" size="sm" onClick={handleAiFormat} disabled={geminiLoading} className="gap-1 text-[10px] h-6 px-2">
                      {geminiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Format
                    </Button>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveStory} disabled={saving} className="gap-1 text-xs h-7">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} {isAddMode ? "Create Story" : "Save Story"}
                </Button>
              </div>
            </div>
          )}

          {/* Loading content */}
          {loadingContent && !isAddMode && editorMode === "articles" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Article Editor / Direct Add */}
          {editorMode === "articles" && ((fullArticle && !loadingContent) || isAddMode) && (
            <div className="space-y-2">
              {/* Title & Category */}
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm h-8" placeholder="Article title" />
              
              <div className="flex gap-1.5">
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <option value="">Select category</option>
                  {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="Uncategorized">Uncategorized</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setShowAddCategory(!showAddCategory)} className="h-8 px-2 shrink-0">
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {showAddCategory && (
                <div className="flex gap-1.5">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={selectedYear >= 1 && selectedYear <= 6 ? `New unit name (will save as "Year ${selectedYear}: ...")` : "e.g. Year 3: Hematopathology"} className="text-xs h-7 flex-1" />
                  <Button size="sm" onClick={handleAddCategory} className="h-7 text-xs">Add</Button>
                </div>
              )}

              {/* Google Preview + AI Button */}
              <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Google Preview</p>
                  <Button variant="outline" size="sm" onClick={handleAiMeta} disabled={aiMetaLoading} className="gap-1 text-[10px] h-6 px-2">
                    {aiMetaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI Meta
                  </Button>
                </div>
                <p className="text-sm font-medium text-primary leading-tight truncate">{editMetaTitle || editTitle || "Page Title"}</p>
                <p className="text-[11px] text-accent-foreground/70 truncate">{SITE_URL}/blog/{editSlug || slugifyText(editTitle) || "..."}</p>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{editMetaDesc || "Add a meta description..."}</p>
              </div>

              {/* Meta fields */}
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                    Meta Title <span className="text-muted-foreground/60">{(editMetaTitle || editTitle).length}/60</span>
                  </label>
                  <Input value={editMetaTitle} onChange={(e) => setEditMetaTitle(e.target.value)} placeholder={editTitle} className="text-xs h-7" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                    Meta Desc <span className="text-muted-foreground/60">{editMetaDesc.length}/160</span>
                  </label>
                  <Textarea value={editMetaDesc} onChange={(e) => setEditMetaDesc(e.target.value)} className="text-xs min-h-[40px]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Slug</label>
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder={slugifyText(editTitle)} className="text-xs h-7" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Thumbnail / OG Image URL</label>
                  <Input value={editOgImage} onChange={(e) => setEditOgImage(e.target.value)} placeholder="https://..." className="text-xs h-7" />
                </div>
              </div>

              {/* Thumbnail preview + publish time */}
              <div className="rounded-lg border border-border bg-muted/30 p-2 flex items-center gap-3">
                {(editOgImage || (fullArticle && extractFirstImageFromContent(fullArticle.content || ""))) ? (
                  <img
                    src={editOgImage || extractFirstImageFromContent(fullArticle?.content || "") || ""}
                    alt="Thumbnail"
                    className="h-14 w-20 rounded-md object-cover border border-border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="h-14 w-20 rounded-md border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                    No thumbnail
                  </div>
                )}
                <div className="flex-1 text-[10px] text-muted-foreground space-y-0.5">
                  {fullArticle?.created_at && (
                    <p>Created: <span className="text-foreground font-medium">{new Date(fullArticle.created_at).toLocaleString()}</span></p>
                  )}
                  {fullArticle?.updated_at && (
                    <p>Updated: <span className="text-foreground font-medium">{new Date(fullArticle.updated_at).toLocaleString()}</span></p>
                  )}
                  <p>Status: <span className={editPublished ? "text-primary font-semibold" : "text-amber-500 font-semibold"}>{editPublished ? "Published" : "Draft"}</span></p>
                </div>
              </div>

              {/* Publish toggle */}
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="rounded" />
                <span className="font-medium">Published</span>
              </label>

              {/* WYSIWYG Toolbar + Editor */}
              {editor && (
                <div className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className={iconSize} /></ToolbarBtn>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullets"><List className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered"><ListOrdered className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote className={iconSize} /></ToolbarBtn>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <ToolbarBtn onClick={() => { const url = prompt("Image URL:"); if (url) editor.chain().focus().setImage({ src: url }).run(); }} title="Image"><ImagePlus className={iconSize} /></ToolbarBtn>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className={iconSize} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className={iconSize} /></ToolbarBtn>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button variant="ghost" size="sm" onClick={handleAiFormat} disabled={geminiLoading} className="gap-1 text-[10px] h-6 px-2">
                      {geminiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Format
                    </Button>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              )}

              {/* Bottom save */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0 || isAddMode} className="gap-1 text-xs h-7">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs h-7">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </Button>
                <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= filteredArticles.length - 1 || isAddMode} className="gap-1 text-xs h-7">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Bottom nav for MCQs and Stories */}
          {(editorMode === "mcqs" || editorMode === "stories") && currentItems.length > 0 && !isAddMode && (
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0} className="gap-1 text-xs h-7">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <span className="text-[11px] text-muted-foreground">{currentIndex + 1}/{currentItems.length}</span>
              <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= currentItems.length - 1} className="gap-1 text-xs h-7">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
