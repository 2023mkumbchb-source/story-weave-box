import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote,
  Heading2, Heading3, Undo, Redo, Save, ChevronLeft, ChevronRight,
  Plus, Search, Filter, ImagePlus, Eye, Loader2, ArrowLeft, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getArticles, saveArticle, UNIT_CATEGORIES, YEAR_CATEGORIES,
  getCategoryDisplayName, getYearFromCategory, buildBlogPath,
  type Article,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { slugifyText, SITE_URL, extractFirstImageFromContent, stripRichText } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

/* ─── TipTap Image Extension ─── */
const TiptapImage = Image.configure({ inline: false, allowBase64: true });

/* ─── Markdown → HTML converter (basic) ─── */
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

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  // Wrap plain text in paragraphs
  const lines = html.split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|li|blockquote|img|p|div|table|tr|td|th|thead|tbody)/.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("\n");
}

/* ─── HTML → Markdown converter (basic) ─── */
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ─── Toolbar Button ─── */
function ToolbarBtn({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={cn("rounded p-1.5 transition-colors hover:bg-muted", active && "bg-primary/10 text-primary")}>
      {children}
    </button>
  );
}

/* ─── Year selector ─── */
const YEARS = [1, 2, 3, 4, 5, 6];

export default function AdminEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth check
  useEffect(() => {
    if (sessionStorage.getItem("learninghub_auth") !== "true") {
      navigate("/login");
    }
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

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editOgImage, setEditOgImage] = useState("");
  const [editPublished, setEditPublished] = useState(false);

  // Load articles
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getArticles();
      setAllArticles(all);
    } catch (err: any) {
      toast({ title: "Failed to load articles", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    let list = allArticles.filter((a) => {
      const cat = a.category || "";
      return cat.startsWith(`Year ${selectedYear}:`);
    });
    if (selectedUnit) {
      list = list.filter((a) => a.category === selectedUnit);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
  }, [allArticles, selectedYear, selectedUnit, searchQuery]);

  const currentArticle = filteredArticles[currentIndex] || null;

  // Units for selected year
  const yearUnits = useMemo(() => {
    const yearKey = `Year ${selectedYear}`;
    return (YEAR_CATEGORIES[yearKey] || []).map((u) => `${yearKey}: ${u}`);
  }, [selectedYear]);

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TiptapImage,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none text-foreground",
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
              if (src && editor) {
                editor.chain().focus().setImage({ src }).run();
              }
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
    if (!currentArticle || !editor || isAddMode) return;
    const html = mdToHtml(currentArticle.content || "");
    editor.commands.setContent(html);
    setEditTitle(currentArticle.title || "");
    setEditMetaTitle(currentArticle.meta_title || "");
    setEditMetaDesc(currentArticle.meta_description || "");
    setEditSlug(currentArticle.slug || "");
    setEditCategory(currentArticle.category || "");
    setEditOgImage(currentArticle.og_image_url || "");
    setEditPublished(currentArticle.published);
  }, [currentArticle, editor, isAddMode]);

  // Save
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
        original_notes: currentArticle?.original_notes || "",
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
      } else if (currentArticle) {
        payload.id = currentArticle.id;
        await saveArticle(payload);
        toast({ title: "Saved!" });
        await loadArticles();
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Navigate articles
  const goNext = () => {
    if (currentIndex < filteredArticles.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Add new article
  const startAdd = (method: "direct" | "gemini") => {
    setIsAddMode(true);
    setAddMethod(method);
    setEditTitle("");
    setEditMetaTitle("");
    setEditMetaDesc("");
    setEditSlug("");
    setEditCategory(selectedUnit || `Year ${selectedYear}: General`);
    setEditOgImage("");
    setEditPublished(false);
    setGeminiNotes("");
    if (editor) editor.commands.setContent("<p></p>");
  };

  // Gemini generate
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
      const desc = stripRichText(data.content || "", 160);
      setEditMetaDesc(desc);
      if (editor) editor.commands.setContent(mdToHtml(data.content || ""));
      toast({ title: "Generated!" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeminiLoading(false);
    }
  };

  // Preview link
  const previewUrl = currentArticle ? `${SITE_URL}${buildBlogPath(currentArticle)}` : "";

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
        <title>Article Editor | OmpathStudy Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Button>

            <div className="flex items-center gap-1">
              {!isAddMode && filteredArticles.length > 0 && (
                <>
                  <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                    {currentIndex + 1} / {filteredArticles.length}
                  </span>
                  <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex >= filteredArticles.length - 1} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isAddMode && (
                <Button variant="ghost" size="sm" onClick={() => setIsAddMode(false)}>Cancel</Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
              {currentArticle && !isAddMode && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-3 py-4 space-y-4">
          {/* Year & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year pills */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {YEARS.map((yr) => (
                <button
                  key={yr}
                  onClick={() => { setSelectedYear(yr); setSelectedUnit(""); setCurrentIndex(0); setIsAddMode(false); }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                    selectedYear === yr ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Y{yr}
                </button>
              ))}
            </div>

            {/* Unit filter */}
            <select
              value={selectedUnit}
              onChange={(e) => { setSelectedUnit(e.target.value); setCurrentIndex(0); }}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs max-w-[200px]"
            >
              <option value="">All units</option>
              {yearUnits.map((u) => (
                <option key={u} value={u}>{getCategoryDisplayName(u)}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[120px] max-w-[250px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                placeholder="Search..."
                className="pl-7 h-8 text-xs"
              />
            </div>

            {/* Add buttons */}
            <div className="flex gap-1 ml-auto">
              <Button variant="outline" size="sm" onClick={() => startAdd("direct")} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Direct
              </Button>
              <Button variant="outline" size="sm" onClick={() => startAdd("gemini")} className="gap-1 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Gemini
              </Button>
            </div>
          </div>

          {/* Article list quick scroll */}
          {!isAddMode && filteredArticles.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
              {filteredArticles.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors border max-w-[180px] truncate",
                    i === currentIndex
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={a.title}
                >
                  {a.title}
                </button>
              ))}
            </div>
          )}

          {/* Gemini input for add mode */}
          {isAddMode && addMethod === "gemini" && (
            <div className="space-y-2">
              <Textarea
                value={geminiNotes}
                onChange={(e) => setGeminiNotes(e.target.value)}
                placeholder="Paste your raw notes here..."
                className="min-h-[120px] text-sm"
              />
              <Button onClick={handleGeminiGenerate} disabled={geminiLoading} className="gap-1">
                {geminiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate with Gemini
              </Button>
            </div>
          )}

          {/* No articles */}
          {!isAddMode && filteredArticles.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">No articles found for Year {selectedYear}{selectedUnit ? ` — ${getCategoryDisplayName(selectedUnit)}` : ""}.</p>
              <div className="mt-3 flex gap-2 justify-center">
                <Button size="sm" onClick={() => startAdd("direct")}>Add Direct</Button>
                <Button size="sm" variant="outline" onClick={() => startAdd("gemini")}>Add via Gemini</Button>
              </div>
            </div>
          )}

          {/* Editor */}
          {(currentArticle || isAddMode) && (
            <div className="space-y-3">
              {/* Meta fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {UNIT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEO Preview */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Google Preview</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 leading-tight truncate">
                    {editMetaTitle || editTitle || "Page Title"}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500 truncate">
                    {SITE_URL}/blog/{editSlug || slugifyText(editTitle) || "..."}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {editMetaDesc || "Add a meta description..."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta Title</label>
                  <Input value={editMetaTitle} onChange={(e) => setEditMetaTitle(e.target.value)} placeholder={editTitle} className="text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{(editMetaTitle || editTitle).length}/60 chars</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta Description</label>
                  <Textarea value={editMetaDesc} onChange={(e) => setEditMetaDesc(e.target.value)} className="text-sm min-h-[60px]" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{editMetaDesc.length}/160 chars</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">URL Slug</label>
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder={slugifyText(editTitle)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">OG Image URL</label>
                  <Input value={editOgImage} onChange={(e) => setEditOgImage(e.target.value)} placeholder="https://..." className="text-sm" />
                </div>
              </div>

              {/* Publish toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPublished}
                    onChange={(e) => setEditPublished(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium">Published</span>
                </label>
              </div>

              {/* OG Image preview */}
              {editOgImage && (
                <div className="rounded-lg border border-border overflow-hidden max-w-[300px]">
                  <img src={editOgImage} alt="OG preview" className="w-full h-auto" />
                </div>
              )}

              {/* WYSIWYG Toolbar + Editor */}
              {editor && (
                <div className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
                      <Bold className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
                      <Italic className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
                      <UnderlineIcon className={iconSize} />
                    </ToolbarBtn>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
                      <Heading2 className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
                      <Heading3 className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
                      <List className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
                      <ListOrdered className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
                      <Quote className={iconSize} />
                    </ToolbarBtn>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <ToolbarBtn onClick={() => {
                      const url = prompt("Image URL:");
                      if (url) editor.chain().focus().setImage({ src: url }).run();
                    }} title="Insert Image">
                      <ImagePlus className={iconSize} />
                    </ToolbarBtn>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
                      <Undo className={iconSize} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
                      <Redo className={iconSize} />
                    </ToolbarBtn>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              )}

              {/* Bottom save + nav */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0 || isAddMode} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= filteredArticles.length - 1 || isAddMode} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
