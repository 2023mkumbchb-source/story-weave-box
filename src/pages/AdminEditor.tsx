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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  saveArticle, saveMcqSet, UNIT_CATEGORIES, YEAR_CATEGORIES,
  getCategoryDisplayName, buildBlogPath,
  getArticleCategories, getMcqSets, type McqSet,
  type Article, type ArticleCategory,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { slugifyText, SITE_URL, extractFirstImageFromContent, stripRichText } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

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

const YEARS = [1, 2, 3, 4, 5, 6];

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

  // MCQ editing state
  const [allMcqSets, setAllMcqSets] = useState<McqSet[]>([]);
  const [mcqFixingId, setMcqFixingId] = useState<string | null>(null);

  // Story editing state
  const [allStories, setAllStories] = useState<any[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editOgImage, setEditOgImage] = useState("");
  const [editPublished, setEditPublished] = useState(false);

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
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setAllArticles((data || []) as Article[]);
      } else if (editorMode === "mcqs") {
        const { data, error } = await supabase
          .from("mcq_sets")
          .select("id, title, category, created_at, updated_at, published, slug, questions")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setAllMcqSets((data || []) as McqSet[]);
      } else if (editorMode === "stories") {
        const { data, error } = await supabase
          .from("stories")
          .select("id, title, category, created_at, published, slug, content")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
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
    let list = allArticles.filter((a) => (a.category || "").startsWith(`Year ${selectedYear}:`));
    if (selectedUnit) list = list.filter((a) => a.category === selectedUnit);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
  }, [allArticles, selectedYear, selectedUnit, searchQuery]);

  const currentArticleSummary = filteredArticles[currentIndex] || null;

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

  // All category options
  const allCategoryOptions = useMemo(() => {
    const standard = UNIT_CATEGORIES;
    const custom = customCategories.map(c => c.name);
    return [...new Set([...standard, ...custom])];
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
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[250px] px-3 py-2 focus:outline-none text-foreground",
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

  // Load article into editor when full content loaded
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
        await loadArticles();
      } else if (fullArticle) {
        payload.id = fullArticle.id;
        await saveArticle(payload);
        toast({ title: "Saved!" });
        // Update summary list without full reload
        setAllArticles(prev => prev.map(a => a.id === fullArticle.id ? { ...a, title: editTitle, category: editCategory, meta_title: editMetaTitle, meta_description: editMetaDesc, slug: editSlug, og_image_url: editOgImage, published: editPublished } : a));
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => { if (currentIndex < filteredArticles.length - 1) setCurrentIndex(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const startAdd = (method: "direct" | "gemini") => {
    setIsAddMode(true);
    setAddMethod(method);
    setEditTitle(""); setEditMetaTitle(""); setEditMetaDesc(""); setEditSlug("");
    setEditCategory(selectedUnit || `Year ${selectedYear}: General`);
    setEditOgImage(""); setEditPublished(false); setGeminiNotes("");
    if (editor) editor.commands.setContent("<p></p>");
  };

  const handleGeminiGenerate = async () => {
    if (!geminiNotes.trim()) return;
    setGeminiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { notes: geminiNotes, type: "article" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditTitle(data.title || "Untitled");
      setEditMetaTitle(data.title || "");
      setEditSlug(slugifyText(data.title || ""));
      setEditMetaDesc(stripRichText(data.content || "", 160));
      if (editor) editor.commands.setContent(mdToHtml(data.content || ""));
      toast({ title: "Generated!" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeminiLoading(false);
    }
  };

  // AI: Generate meta title, meta description, and slug using Gemini
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
      toast({ title: "AI meta generated!" });
    } catch (err: any) {
      toast({ title: "AI meta failed", description: err.message, variant: "destructive" });
    } finally {
      setAiMetaLoading(false);
    }
  };

  // AI: Improve content formatting
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

  const previewUrl = fullArticle ? `${SITE_URL}${buildBlogPath(fullArticle)}` : "";
  const iconSize = "h-4 w-4";

  // Auto-update log display
  const [updateLog, setUpdateLog] = useState<any>(null);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "auto_update_log").maybeSingle()
      .then(({ data }) => { if (data?.value) try { setUpdateLog(JSON.parse(data.value)); } catch {} });
  }, []);

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
        <title>Article Editor | OmpathStudy Admin</title>
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
              {!isAddMode && filteredArticles.length > 0 && (
                <>
                  <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="h-7 w-7">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground min-w-[50px] text-center">
                    {currentIndex + 1}/{filteredArticles.length}
                  </span>
                  <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex >= filteredArticles.length - 1} className="h-7 w-7">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isAddMode && <Button variant="ghost" size="sm" onClick={() => setIsAddMode(false)} className="text-xs">Cancel</Button>}
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs h-7 px-2">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </Button>
              {fullArticle && !isAddMode && (
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
          {/* Year & Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 overflow-x-auto">
              {YEARS.map((yr) => (
                <button key={yr} onClick={() => { setSelectedYear(yr); setSelectedUnit(""); setCurrentIndex(0); setIsAddMode(false); }}
                  className={cn("rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap",
                    selectedYear === yr ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  Y{yr}
                </button>
              ))}
            </div>
            <select value={selectedUnit} onChange={(e) => { setSelectedUnit(e.target.value); setCurrentIndex(0); }}
              className="rounded-md border border-input bg-background px-1.5 py-1 text-[11px] max-w-[140px]">
              <option value="">All units</option>
              {yearUnits.map((u) => <option key={u} value={u}>{getCategoryDisplayName(u)}</option>)}
            </select>
            <div className="relative flex-1 min-w-[100px] max-w-[200px]">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                placeholder="Search..." className="pl-6 h-7 text-[11px]" />
            </div>
            <div className="flex gap-1 ml-auto">
              <Button variant="outline" size="sm" onClick={() => startAdd("direct")} className="gap-1 text-[11px] h-7 px-2">
                <Plus className="h-3 w-3" /> Direct
              </Button>
              <Button variant="outline" size="sm" onClick={() => startAdd("gemini")} className="gap-1 text-[11px] h-7 px-2">
                <Sparkles className="h-3 w-3" /> AI
              </Button>
            </div>
          </div>

          {/* Article pills - horizontal scroll */}
          {!isAddMode && filteredArticles.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-2 px-2" style={{ scrollbarWidth: "thin" }}>
              {filteredArticles.slice(0, 50).map((a, i) => (
                <button key={a.id} onClick={() => setCurrentIndex(i)}
                  className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] transition-colors border max-w-[150px] truncate",
                    i === currentIndex ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted")}
                  title={a.title}>{a.title}</button>
              ))}
              {filteredArticles.length > 50 && <span className="text-[10px] text-muted-foreground self-center">+{filteredArticles.length - 50} more</span>}
            </div>
          )}

          {/* Gemini input for add mode */}
          {isAddMode && addMethod === "gemini" && (
            <div className="space-y-2">
              <Textarea value={geminiNotes} onChange={(e) => setGeminiNotes(e.target.value)}
                placeholder="Paste your raw notes here..." className="min-h-[100px] text-sm" />
              <Button onClick={handleGeminiGenerate} disabled={geminiLoading} size="sm" className="gap-1">
                {geminiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate with AI
              </Button>
            </div>
          )}

          {/* No articles */}
          {!isAddMode && filteredArticles.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">No articles for Year {selectedYear}{selectedUnit ? ` — ${getCategoryDisplayName(selectedUnit)}` : ""}.</p>
              <div className="mt-2 flex gap-2 justify-center">
                <Button size="sm" onClick={() => startAdd("direct")}>Add Direct</Button>
                <Button size="sm" variant="outline" onClick={() => startAdd("gemini")}>Add via AI</Button>
              </div>
            </div>
          )}

          {/* Loading content */}
          {loadingContent && !isAddMode && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Editor */}
          {((fullArticle && !loadingContent) || isAddMode) && (
            <div className="space-y-2">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm h-8" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8">
                    <option value="">Select category</option>
                    {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">URL Slug</label>
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder={slugifyText(editTitle)} className="text-xs h-7" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">OG Image URL</label>
                  <Input value={editOgImage} onChange={(e) => setEditOgImage(e.target.value)} placeholder="https://..." className="text-xs h-7" />
                </div>
              </div>

              {/* Publish + OG Image */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="rounded" />
                  <span className="font-medium">Published</span>
                </label>
                {editOgImage && (
                  <div className="rounded border border-border overflow-hidden w-20 h-12">
                    <img src={editOgImage} alt="OG" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

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

              {/* Bottom nav */}
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

          {/* Auto-update log */}
          {updateLog && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Auto-Update Log</p>
              <p className="text-xs text-muted-foreground">Last run: {new Date(updateLog.timestamp).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Batch: {updateLog.batch_size} articles, {updateLog.results?.filter((r: any) => r.status === "updated").length || 0} updated</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
