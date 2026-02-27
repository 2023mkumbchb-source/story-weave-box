import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Layers, Settings, Trash2, Pencil, ListChecks, Save, Key, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getArticles, saveArticle, deleteArticle,
  getFlashcardSets, saveFlashcardSet, deleteFlashcardSet,
  getMcqSets, saveMcqSet, deleteMcqSet,
  getSetting, saveSetting,
  UNIT_CATEGORIES, getCategoryDisplayName,
  type Article, type FlashcardSet, type McqSet,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Tab = "create" | "articles" | "flashcards" | "mcqs" | "settings";
type DirectType = "article" | "mcqs" | "flashcards";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("learninghub_auth") !== "true") {
      navigate("/login");
    }
    // Load Gemini key once on mount
    getSetting("gemini_api_key").then((key) => {
      console.log("Loaded Gemini key:", key ? "YES" : "NO");
      setGeminiKey(key || "");
    });
  }, [navigate]);

  const [tab, setTab] = useState<Tab>("create");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [cardCount, setCardCount] = useState(20);
  const [mcqCount, setMcqCount] = useState(15);

  // Batch generation checkboxes
  const [genArticle, setGenArticle] = useState(true);
  const [genFlashcards, setGenFlashcards] = useState(true);
  const [genMcqs, setGenMcqs] = useState(true);

  // Direct publish mode
  const [directType, setDirectType] = useState<DirectType>("article");
  const [directTitle, setDirectTitle] = useState("");
  const [directContent, setDirectContent] = useState("");
  const [directCategory, setDirectCategory] = useState("");
  const [directPreviewArticle, setDirectPreviewArticle] = useState<{ title: string; content: string } | null>(null);
  const [directPreviewCards, setDirectPreviewCards] = useState<{ question: string; answer: string }[] | null>(null);
  const [directPreviewMcqs, setDirectPreviewMcqs] = useState<{ question: string; options: string[]; correct_answer: number; explanation?: string }[] | null>(null);

  // Preview state for batch
  const [batchArticle, setBatchArticle] = useState<{ title: string; content: string } | null>(null);
  const [batchCards, setBatchCards] = useState<{ question: string; answer: string }[] | null>(null);
  const [batchMcqs, setBatchMcqs] = useState<{ question: string; options: string[]; correct_answer: number; explanation?: string }[] | null>(null);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchTitle, setBatchTitle] = useState("");

  // Individual preview state
  const [previewArticle, setPreviewArticle] = useState<{ title: string; content: string } | null>(null);
  const [previewCards, setPreviewCards] = useState<{ question: string; answer: string }[] | null>(null);
  const [previewMcqs, setPreviewMcqs] = useState<{ question: string; options: string[]; correct_answer: number; explanation?: string }[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewContent, setPreviewContent] = useState("");

  // ===== Inline functions with geminiKey support =====
  const generateArticle = async (notesInput: string): Promise<{ title: string; content: string }> => {
    console.log("generateArticle called, geminiKey present:", !!geminiKey);
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { notes: notesInput, type: 'article', geminiKey },
    });
    if (error) throw new Error(error.message || "Failed to generate article");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const generateFlashcards = async (notesInput: string, count: number = 20): Promise<{ question: string; answer: string }[]> => {
    console.log("generateFlashcards called, geminiKey present:", !!geminiKey);
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { notes: notesInput, type: 'flashcards', count, geminiKey },
    });
    if (error) throw new Error(error.message || "Failed to generate flashcards");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const generateMcqs = async (notesInput: string, count: number = 15): Promise<{ question: string; options: string[]; correct_answer: number; explanation?: string }[]> => {
    console.log("generateMcqs called, geminiKey present:", !!geminiKey);
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { notes: notesInput, type: 'mcqs', count, geminiKey },
    });
    if (error) throw new Error(error.message || "Failed to generate MCQs");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const autoCategorizе = async (notesInput: string): Promise<string> => {
    console.log("autoCategorizе called, geminiKey present:", !!geminiKey);
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { notes: notesInput, type: 'categorize', geminiKey },
    });
    if (error) return "Uncategorized";
    return data?.category || "Uncategorized";
  };

  const parseDirectMcqs = (raw: string) => {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((q) => q?.question && Array.isArray(q?.options) && q.options.length >= 4)
          .map((q) => ({
            question: String(q.question).trim(),
            options: q.options.slice(0, 4).map((o: string) => String(o).trim()),
            correct_answer: Number.isInteger(q.correct_answer) ? Math.min(Math.max(q.correct_answer, 0), 3) : 0,
            explanation: q.explanation ? String(q.explanation).trim() : undefined,
          }));
      }
    } catch {}

    const blocks = trimmed.split(/\n\s*\n(?=(?:Q\d+|\d+\.|Question))/i).filter(Boolean);
    const parsed = blocks
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 5) return null;

        const question = lines[0].replace(/^(Q\d+[:.)-]?|\d+[.)-]?|Question\s*\d*[:.)-]?)\s*/i, "").trim();
        const options = lines
          .filter((l) => /^[A-D][\).:-]\s+/i.test(l))
          .map((l) => l.replace(/^[A-D][\).:-]\s+/i, "").trim())
          .slice(0, 4);

        if (!question || options.length < 4) return null;

        const answerLine = lines.find((l) => /^Answer\s*[:\-]/i.test(l));
        const explanationLine = lines.find((l) => /^Explanation\s*[:\-]/i.test(l));
        let correct_answer = 0;

        if (answerLine) {
          const val = answerLine.replace(/^Answer\s*[:\-]\s*/i, "").trim().toUpperCase();
          if (/^[A-D]$/.test(val)) correct_answer = val.charCodeAt(0) - 65;
          if (/^[1-4]$/.test(val)) correct_answer = Number(val) - 1;
        }

        return {
          question,
          options,
          correct_answer,
          explanation: explanationLine ? explanationLine.replace(/^Explanation\s*[:\-]\s*/i, "").trim() : undefined,
        };
      })
      .filter(Boolean) as { question: string; options: string[]; correct_answer: number; explanation?: string }[];

    return parsed;
  };

  const parseDirectFlashcards = (raw: string) => {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((c) => c?.question && c?.answer)
          .map((c) => ({ question: String(c.question).trim(), answer: String(c.answer).trim() }));
      }
    } catch {}

    const pairs = trimmed
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const qMatch = block.match(/Q(?:uestion)?\s*[:\-]\s*([\s\S]*?)\nA(?:nswer)?\s*[:\-]\s*([\s\S]*)/i);
        if (qMatch) {
          return { question: qMatch[1].trim(), answer: qMatch[2].trim() };
        }
        const linePair = block.split(/\n|\t|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
        if (linePair.length >= 2) {
          return { question: linePair[0], answer: linePair.slice(1).join(" ") };
        }
        return null;
      })
      .filter(Boolean) as { question: string; answer: string }[];

    return pairs;
  };

  const parseDirectArticle = (raw: string) => {
    const clean = raw.trim();
    const lines = clean.split("\n").map((l) => l.trim());
    const firstNonEmpty = lines.find((l) => l.length > 0) || "Article";
    const inferredTitle = firstNonEmpty.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
    const title = directTitle.trim() || inferredTitle;

    if (/^##\s+/m.test(clean)) {
      return { title, content: clean };
    }

    const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const summary = paragraphs.slice(0, 2).join(" ") || "Study summary.";
    const detailed = paragraphs.slice(2).join("\n\n") || paragraphs.join("\n\n");
    const content = `## Summary\n${summary}\n\n## Detailed Notes\n${detailed}`;

    return { title, content };
  };

  const handleFormatDirect = async () => {
    if (!directContent.trim()) {
      toast({ title: "Paste content first", variant: "destructive" });
      return;
    }

    try {
      if (directType === "article") {
        setDirectPreviewArticle(parseDirectArticle(directContent));
        setDirectPreviewCards(null);
        setDirectPreviewMcqs(null);
      } else if (directType === "mcqs") {
        const parsed = parseDirectMcqs(directContent);
        if (!parsed.length) throw new Error("Could not parse MCQs. Paste JSON or Q/A option format.");
        setDirectPreviewMcqs(parsed);
        setDirectPreviewArticle(null);
        setDirectPreviewCards(null);
      } else {
        const parsed = parseDirectFlashcards(directContent);
        if (!parsed.length) throw new Error("Could not parse flashcards. Paste JSON or Q/A format.");
        setDirectPreviewCards(parsed);
        setDirectPreviewArticle(null);
        setDirectPreviewMcqs(null);
      }

      toast({ title: "Formatted and ready to publish" });
    } catch (err: any) {
      toast({ title: "Format error", description: err.message, variant: "destructive" });
    }
  };

  const handleDirectSave = async (publish: boolean) => {
    try {
      let cat = directCategory;
      if (!cat) {
        cat = await autoCategorizе(directContent);
        setDirectCategory(cat);
      }
      const finalCategory = cat || "Uncategorized";

      if (directPreviewArticle) {
        await saveArticle({
          title: directPreviewArticle.title,
          content: directPreviewArticle.content,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      } else if (directPreviewMcqs) {
        await saveMcqSet({
          title: directTitle.trim() || `MCQ: ${directContent.slice(0, 50)}...`,
          questions: directPreviewMcqs,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      } else if (directPreviewCards) {
        await saveFlashcardSet({
          title: directTitle.trim() || `Flashcards: ${directContent.slice(0, 50)}...`,
          cards: directPreviewCards,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      } else {
        toast({ title: "No direct preview yet", description: "Click Format & Preview first.", variant: "destructive" });
        return;
      }

      toast({ title: publish ? "Published!" : "Draft saved!" });
      setDirectContent("");
      setDirectTitle("");
      setDirectPreviewArticle(null);
      setDirectPreviewCards(null);
      setDirectPreviewMcqs(null);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerate = async (type: "article" | "flashcards" | "mcqs") => {
    if (!notes.trim()) {
      toast({ title: "Please enter some notes", variant: "destructive" });
      return;
    }
    setLoading(true);
    setLoadingType(type);
    try {
      if (type === "article") {
        const result = await generateArticle(notes);
        setPreviewArticle(result);
        setPreviewTitle(result.title);
        setPreviewContent(result.content);
        setPreviewCards(null);
        setPreviewMcqs(null);
      } else if (type === "mcqs") {
        const questions = await generateMcqs(notes, mcqCount);
        setPreviewMcqs(questions);
        setPreviewTitle(`MCQ: ${notes.slice(0, 50)}...`);
        setPreviewArticle(null);
        setPreviewCards(null);
      } else {
        const cards = await generateFlashcards(notes, cardCount);
        setPreviewCards(cards);
        setPreviewTitle(`Flashcards: ${notes.slice(0, 50)}...`);
        setPreviewArticle(null);
        setPreviewMcqs(null);
      }
      if (!category) {
        const autoCategory = await autoCategorizе(notes);
        setCategory(autoCategory);
      }
      toast({ title: "Content generated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!notes.trim()) {
      toast({ title: "Please enter some notes", variant: "destructive" });
      return;
    }
    const types: string[] = [];
    if (genArticle) types.push("article");
    if (genFlashcards) types.push("flashcards");
    if (genMcqs) types.push("mcqs");
    if (types.length === 0) {
      toast({ title: "Select at least one content type", variant: "destructive" });
      return;
    }

    setLoading(true);
    setLoadingType("all");
    try {
      let cat = category;
      if (!cat) {
        cat = await autoCategorizе(notes);
        setCategory(cat);
      }
      setBatchCategory(cat);

      const promises: Promise<any>[] = [];
      if (genArticle) promises.push(generateArticle(notes));
      else promises.push(Promise.resolve(null));
      if (genFlashcards) promises.push(generateFlashcards(notes, cardCount));
      else promises.push(Promise.resolve(null));
      if (genMcqs) promises.push(generateMcqs(notes, mcqCount));
      else promises.push(Promise.resolve(null));

      const [articleResult, flashcardResult, mcqResult] = await Promise.all(promises);
      
      setBatchArticle(articleResult);
      setBatchCards(flashcardResult);
      setBatchMcqs(mcqResult);
      setBatchTitle(articleResult?.title || notes.slice(0, 60));

      toast({ title: "Content generated! Review and publish below." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleRegenerateBatch = async (type: "article" | "flashcards" | "mcqs") => {
    setLoading(true);
    setLoadingType(type);
    try {
      if (type === "article") {
        const result = await generateArticle(notes);
        setBatchArticle(result);
        setBatchTitle(result.title);
      } else if (type === "flashcards") {
        setBatchCards(await generateFlashcards(notes, cardCount));
      } else {
        setBatchMcqs(await generateMcqs(notes, mcqCount));
      }
      toast({ title: `${type} regenerated!` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handlePublishAll = async () => {
    setLoading(true);
    try {
      const cat = batchCategory || category || "Uncategorized";
      const saves: Promise<any>[] = [];
      if (batchArticle) {
        saves.push(saveArticle({
          title: batchArticle.title,
          content: batchArticle.content,
          created_at: new Date().toISOString(),
          published: true,
          original_notes: notes,
          category: cat,
        }));
      }
      if (batchCards) {
        saves.push(saveFlashcardSet({
          title: `Flashcards: ${batchTitle}`,
          cards: batchCards,
          created_at: new Date().toISOString(),
          published: true,
          original_notes: notes,
          category: cat,
        }));
      }
      if (batchMcqs) {
        saves.push(saveMcqSet({
          title: `MCQ: ${batchTitle}`,
          questions: batchMcqs,
          created_at: new Date().toISOString(),
          published: true,
          original_notes: notes,
          category: cat,
        }));
      }
      await Promise.all(saves);
      toast({ title: "All content published!" });
      setBatchArticle(null);
      setBatchCards(null);
      setBatchMcqs(null);
      setNotes("");
      setCategory("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    try {
      const cat = category || "Uncategorized";
      if (previewArticle) {
        await saveArticle({
          title: previewTitle,
          content: previewContent,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: notes,
          category: cat,
        });
      } else if (previewCards) {
        await saveFlashcardSet({
          title: previewTitle,
          cards: previewCards,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: notes,
          category: cat,
        });
      } else if (previewMcqs) {
        await saveMcqSet({
          title: previewTitle,
          questions: previewMcqs,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: notes,
          category: cat,
        });
      }
      toast({ title: publish ? "Published!" : "Draft saved!" });
      setPreviewArticle(null);
      setPreviewCards(null);
      setPreviewMcqs(null);
      setNotes("");
      setCategory("");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const hasBatchPreview = batchArticle || batchCards || batchMcqs;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "create", label: "Create", icon: FileText },
    { id: "articles", label: "Articles", icon: FileText },
    { id: "flashcards", label: "Flashcards", icon: Layers },
    { id: "mcqs", label: "MCQs", icon: ListChecks },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-foreground">Dashboard</h1>

      <div className="mb-8 flex gap-1 rounded-xl border border-border bg-secondary/50 p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div>
          <Textarea
            placeholder="Paste your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-4 min-h-[200px] resize-y"
          />

          {/* Category selector */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Unit/Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Auto-detect (AI categorization)</option>
              {UNIT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Count selectors */}
          <div className="mb-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">Flashcards:</label>
              <div className="flex gap-1">
                {[10, 20, 30, 40, 50].map((n) => (
                  <button key={n} onClick={() => setCardCount(n)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      cardCount === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">MCQs:</label>
              <div className="flex gap-1">
                {[10, 15, 20, 30].map((n) => (
                  <button key={n} onClick={() => setMcqCount(n)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      mcqCount === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate All - batch */}
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Generate All at Once</h3>
            </div>
            <div className="mb-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={genArticle} onChange={(e) => setGenArticle(e.target.checked)} className="accent-primary" />
                Article
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={genFlashcards} onChange={(e) => setGenFlashcards(e.target.checked)} className="accent-primary" />
                {cardCount} Flashcards
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={genMcqs} onChange={(e) => setGenMcqs(e.target.checked)} className="accent-primary" />
                {mcqCount} MCQs
              </label>
            </div>
            <Button onClick={handleGenerateAll} disabled={loading} className="gap-2">
              {loading && loadingType === "all" && <Loader2 className="h-4 w-4 animate-spin" />}
              <Zap className="h-4 w-4" />
              {loading && loadingType === "all" ? "Generating..." : "Generate All (Preview First)"}
            </Button>
          </div>

          {/* Batch Preview */}
          {hasBatchPreview && (
            <div className="mb-8 space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">Review Generated Content</h3>
                <div className="text-xs rounded-full bg-primary/20 px-3 py-1 text-primary font-medium">{batchCategory}</div>
              </div>

              {batchArticle && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">📄 Article</h4>
                    <Button size="sm" variant="ghost" onClick={() => handleRegenerateBatch("article")} disabled={loading} className="gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-foreground">{batchArticle.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{batchArticle.content.slice(0, 150)}...</p>
                </div>
              )}

              {batchCards && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">🃏 Flashcards ({batchCards.length})</h4>
                    <Button size="sm" variant="ghost" onClick={() => handleRegenerateBatch("flashcards")} disabled={loading} className="gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchCards.slice(0, 3).map((c, i) => (
                      <p key={i} className="text-xs text-muted-foreground">Q: {c.question}</p>
                    ))}
                    {batchCards.length > 3 && <p className="text-xs text-muted-foreground">...and {batchCards.length - 3} more</p>}
                  </div>
                </div>
              )}

              {batchMcqs && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">✅ MCQs ({batchMcqs.length})</h4>
                    <Button size="sm" variant="ghost" onClick={() => handleRegenerateBatch("mcqs")} disabled={loading} className="gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchMcqs.slice(0, 3).map((q, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{i + 1}. {q.question}</p>
                    ))}
                    {batchMcqs.length > 3 && <p className="text-xs text-muted-foreground">...and {batchMcqs.length - 3} more</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handlePublishAll} disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Publish All
                </Button>
                <Button variant="outline" onClick={() => { setBatchArticle(null); setBatchCards(null); setBatchMcqs(null); }}>
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Individual generation buttons */}
          <div className="mb-8 flex flex-wrap gap-3">
            <Button onClick={() => handleGenerate("article")} disabled={loading} className="gap-2" variant="outline">
              {loading && loadingType === "article" && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading && loadingType === "article" ? "Generating..." : "Generate Article"}
            </Button>
            <Button onClick={() => handleGenerate("flashcards")} disabled={loading} variant="outline" className="gap-2">
              {loading && loadingType === "flashcards" && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading && loadingType === "flashcards" ? `Generating...` : `Generate ${cardCount} Flashcards`}
            </Button>
            <Button onClick={() => handleGenerate("mcqs")} disabled={loading} variant="outline" className="gap-2">
              {loading && loadingType === "mcqs" && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading && loadingType === "mcqs" ? `Generating...` : `Generate ${mcqCount} MCQs`}
            </Button>
          </div>

          {/* Individual Previews */}
          {previewArticle && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">Article Preview</h3>
                <Button size="sm" variant="ghost" onClick={() => handleGenerate("article")} disabled={loading} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
              <Input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} className="mb-3 font-bold" placeholder="Title" />
              <Textarea value={previewContent} onChange={(e) => setPreviewContent(e.target.value)} className="mb-4 min-h-[200px]" />
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleSave(false)} variant="outline">Save Draft</Button>
                <Button onClick={() => handleSave(true)}>Publish</Button>
              </div>
            </div>
          )}

          {previewCards && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">Flashcard Preview ({previewCards.length})</h3>
                <Button size="sm" variant="ghost" onClick={() => handleGenerate("flashcards")} disabled={loading} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
              <Input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} className="mb-4" placeholder="Set title" />
              <div className="mb-4 grid gap-2 max-h-96 overflow-y-auto">
                {previewCards.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-sm font-medium text-foreground">Q: {c.question}</p>
                    <p className="text-sm text-muted-foreground">A: {c.answer}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleSave(false)} variant="outline">Save Draft</Button>
                <Button onClick={() => handleSave(true)}>Publish</Button>
              </div>
            </div>
          )}

          {previewMcqs && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">MCQ Preview ({previewMcqs.length})</h3>
                <Button size="sm" variant="ghost" onClick={() => handleGenerate("mcqs")} disabled={loading} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
              <Input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} className="mb-4" placeholder="Quiz title" />
              <div className="mb-4 grid gap-3 max-h-96 overflow-y-auto">
                {previewMcqs.map((q, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-sm font-medium text-foreground mb-1">{i + 1}. {q.question}</p>
                    {q.options.map((opt, j) => (
                      <p key={j} className={`text-sm ml-4 ${j === q.correct_answer ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {String.fromCharCode(65 + j)}) {opt} {j === q.correct_answer ? "✓" : ""}
                      </p>
                    ))}
                    {q.explanation && <p className="mt-1 ml-4 text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleSave(false)} variant="outline">Save Draft</Button>
                <Button onClick={() => handleSave(true)}>Publish</Button>
              </div>
            </div>
          )}

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h3 className="mb-2 font-display text-lg font-bold text-foreground">📋 Direct Publish Mode</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Paste pre-written article/MCQ/flashcard content and I’ll do minimal formatting for clean publishing.
            </p>

            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Content Type</label>
                <select
                  value={directType}
                  onChange={(e) => setDirectType(e.target.value as DirectType)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="article">📄 Article</option>
                  <option value="mcqs">✅ MCQs</option>
                  <option value="flashcards">🃏 Flashcards</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Unit/Category</label>
                <select
                  value={directCategory}
                  onChange={(e) => setDirectCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Auto-detect</option>
                  {UNIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Title (optional)</label>
                <Input value={directTitle} onChange={(e) => setDirectTitle(e.target.value)} placeholder="Custom title" />
              </div>
            </div>

            <Textarea
              value={directContent}
              onChange={(e) => setDirectContent(e.target.value)}
              placeholder={directType === "article" ? "Paste article markdown/plain text" : directType === "mcqs" ? "Paste MCQs JSON or Q1 + A) B) C) D) format" : "Paste flashcards JSON or Q:/A: format"}
              className="mb-4 min-h-[180px]"
            />

            <div className="mb-4 flex flex-wrap gap-3">
              <Button onClick={handleFormatDirect} variant="outline">Format & Preview</Button>
              <Button onClick={() => handleDirectSave(false)} variant="outline">Save Draft</Button>
              <Button onClick={() => handleDirectSave(true)}>Direct Publish</Button>
            </div>

            {directPreviewArticle && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="font-medium text-foreground">{directPreviewArticle.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{directPreviewArticle.content.slice(0, 500)}...</p>
              </div>
            )}

            {directPreviewMcqs && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="mb-2 font-medium text-foreground">Parsed MCQs: {directPreviewMcqs.length}</p>
                {directPreviewMcqs.slice(0, 2).map((q, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{i + 1}. {q.question}</p>
                ))}
              </div>
            )}

            {directPreviewCards && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="mb-2 font-medium text-foreground">Parsed Flashcards: {directPreviewCards.length}</p>
                {directPreviewCards.slice(0, 2).map((c, i) => (
                  <p key={i} className="text-sm text-muted-foreground">Q: {c.question}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "articles" && <ArticlesList />}
      {tab === "flashcards" && <FlashcardsList />}
      {tab === "mcqs" && <McqsList />}
      {tab === "settings" && <SettingsPanel setGeminiKey={setGeminiKey} />}
    </div>
  );
}

// --- Articles List with Edit ---
function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const { toast } = useToast();

  const refresh = () => { getArticles().then(setArticles).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string) => { await deleteArticle(id); refresh(); toast({ title: "Deleted" }); };
  const togglePublish = async (a: Article) => { await saveArticle({ ...a, published: !a.published }); refresh(); toast({ title: a.published ? "Unpublished" : "Published!" }); };
  const handleSaveEdit = async () => {
    if (!editing) return;
    await saveArticle(editing);
    setEditing(null);
    refresh();
    toast({ title: "Article updated!" });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (articles.length === 0) return <p className="text-muted-foreground">No articles yet.</p>;

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-foreground">Edit Article</h3>
        <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mb-3 font-bold" placeholder="Title" />
        <select
          value={editing.category}
          onChange={(e) => setEditing({ ...editing, category: e.target.value })}
          className="w-full mb-3 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="Uncategorized">Uncategorized</option>
          {UNIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="mb-4 min-h-[300px]" />
        <div className="flex gap-3">
          <Button onClick={handleSaveEdit} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
          <Button onClick={() => setEditing(null)} variant="outline">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-foreground truncate">{a.title}</h4>
            <p className="text-xs text-muted-foreground">
              {a.category !== "Uncategorized" && <span className="text-primary">{getCategoryDisplayName(a.category)} · </span>}
              {new Date(a.created_at).toLocaleDateString()} · {a.published ? "Published" : "Draft"}
            </p>
          </div>
          <div className="flex gap-2 ml-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(a)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => togglePublish(a)}>{a.published ? "Unpublish" : "Publish"}</Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Flashcards List with Edit ---
function FlashcardsList() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FlashcardSet | null>(null);
  const { toast } = useToast();

  const refresh = () => { getFlashcardSets().then(setSets).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string) => { await deleteFlashcardSet(id); refresh(); toast({ title: "Deleted" }); };
  const togglePublish = async (s: FlashcardSet) => { await saveFlashcardSet({ ...s, published: !s.published }); refresh(); toast({ title: s.published ? "Unpublished" : "Published!" }); };
  const handleSaveEdit = async () => {
    if (!editing) return;
    await saveFlashcardSet(editing);
    setEditing(null);
    refresh();
    toast({ title: "Updated!" });
  };

  const updateCard = (i: number, field: "question" | "answer", value: string) => {
    if (!editing) return;
    const cards = [...editing.cards];
    cards[i] = { ...cards[i], [field]: value };
    setEditing({ ...editing, cards });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (sets.length === 0) return <p className="text-muted-foreground">No flashcard sets yet.</p>;

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-foreground">Edit Flashcard Set</h3>
        <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mb-4 font-bold" placeholder="Title" />
        <div className="mb-4 max-h-96 overflow-y-auto space-y-2">
          {editing.cards.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <Input value={c.question} onChange={(e) => updateCard(i, "question", e.target.value)} placeholder="Question" className="text-sm" />
              <Input value={c.answer} onChange={(e) => updateCard(i, "answer", e.target.value)} placeholder="Answer" className="text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSaveEdit} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
          <Button onClick={() => setEditing(null)} variant="outline">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sets.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-foreground truncate">{s.title}</h4>
            <p className="text-xs text-muted-foreground">
              {s.category !== "Uncategorized" && <span className="text-primary">{getCategoryDisplayName(s.category)} · </span>}
              {s.cards.length} cards · {new Date(s.created_at).toLocaleDateString()} · {s.published ? "Published" : "Draft"}
            </p>
          </div>
          <div className="flex gap-2 ml-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => togglePublish(s)}>{s.published ? "Unpublish" : "Publish"}</Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- MCQs List with Edit ---
function McqsList() {
  const [sets, setSets] = useState<McqSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<McqSet | null>(null);
  const { toast } = useToast();

  const refresh = () => { getMcqSets().then(setSets).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string) => { await deleteMcqSet(id); refresh(); toast({ title: "Deleted" }); };
  const togglePublish = async (s: McqSet) => { await saveMcqSet({ ...s, published: !s.published }); refresh(); toast({ title: s.published ? "Unpublished" : "Published!" }); };
  const handleSaveEdit = async () => {
    if (!editing) return;
    await saveMcqSet(editing);
    setEditing(null);
    refresh();
    toast({ title: "Updated!" });
  };

  const updateQuestion = (i: number, field: string, value: any) => {
    if (!editing) return;
    const questions = [...editing.questions];
    questions[i] = { ...questions[i], [field]: value };
    setEditing({ ...editing, questions });
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    if (!editing) return;
    const questions = [...editing.questions];
    const options = [...questions[qi].options];
    options[oi] = value;
    questions[qi] = { ...questions[qi], options };
    setEditing({ ...editing, questions });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (sets.length === 0) return <p className="text-muted-foreground">No MCQ sets yet.</p>;

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-foreground">Edit MCQ Set</h3>
        <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mb-4 font-bold" placeholder="Title" />
        <div className="mb-4 max-h-[500px] overflow-y-auto space-y-3">
          {editing.questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <Input value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} placeholder="Question" className="text-sm font-medium" />
              {q.options.map((opt, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correct_answer === j}
                    onChange={() => updateQuestion(i, "correct_answer", j)}
                    className="accent-primary"
                  />
                  <Input value={opt} onChange={(e) => updateOption(i, j, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + j)}`} className="text-sm" />
                </div>
              ))}
              <Input
                value={q.explanation || ""}
                onChange={(e) => updateQuestion(i, "explanation", e.target.value)}
                placeholder="Explanation (shown after correct answer)"
                className="text-sm text-muted-foreground"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSaveEdit} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
          <Button onClick={() => setEditing(null)} variant="outline">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sets.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-foreground truncate">{s.title}</h4>
            <p className="text-xs text-muted-foreground">
              {s.category !== "Uncategorized" && <span className="text-primary">{getCategoryDisplayName(s.category)} · </span>}
              {s.questions.length} questions · {new Date(s.created_at).toLocaleDateString()} · {s.published ? "Published" : "Draft"}
            </p>
          </div>
          <div className="flex gap-2 ml-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => togglePublish(s)}>{s.published ? "Unpublish" : "Publish"}</Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Settings Panel ---
function SettingsPanel({ setGeminiKey }: { setGeminiKey: (key: string) => void }) {
  const [localGeminiKey, setLocalGeminiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getSetting("gemini_api_key").then((v) => {
      setLocalGeminiKey(v || "");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized = localGeminiKey.trim();
      await saveSetting("gemini_api_key", normalized);
      setGeminiKey(normalized);
      setLocalGeminiKey(normalized);
      toast({ title: "Gemini API key saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 font-display text-lg font-bold text-foreground">Google Gemini API</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your Gemini API key to power all AI content generation. Get a key from{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
        </p>

        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Enter your Gemini API key"
            value={localGeminiKey}
            onChange={(e) => setLocalGeminiKey(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Key className="h-3 w-3" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        {localGeminiKey && (
          <p className="mt-2 text-xs text-green-600">✓ API key configured</p>
        )}
      </div>
    </div>
  );
}
