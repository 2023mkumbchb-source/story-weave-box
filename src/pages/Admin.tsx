import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Layers, Settings, Trash2, Pencil, ListChecks, Save, Key, Zap, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
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
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    getSetting("gemini_api_key").then((key) => {
      setGeminiKey(key || "");
    });
  }, [navigate, user, authLoading]);

  // Publishing progress state
  const [publishProgress, setPublishProgress] = useState<{ current: number; total: number; label: string } | null>(null);

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
  const [directTargetCount, setDirectTargetCount] = useState(20);
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

  const clampRequestedCount = (n: number) => Math.min(Math.max(Math.floor(n || 0), 5), 100);

  const inferContentTitle = (raw: string, fallback: string) => {
    const first = raw
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    const cleaned = (first || fallback)
      .replace(/^#+\s*/, "")
      .replace(/^(Q\d+[:.)-]?|\d+[.)-]?|Question\s*\d*[:.)-]?)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 90) || fallback;
  };

  const buildSetTitle = (prefix: "MCQ" | "Flashcards", raw: string, selectedCategory?: string) => {
    const cat = selectedCategory && selectedCategory !== "Uncategorized"
      ? getCategoryDisplayName(selectedCategory)
      : inferContentTitle(raw, "Core Concepts");
    return `${prefix}: ${cat}`;
  };

  const parseDirectMcqs = (raw: string) => {
    const trimmed = raw.trim();
    const normalizeQuestion = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    const toMcq = (item: any) => {
      if (!item?.question) return null;
      const question = String(item.question)
        .replace(/^(Q\d+[:.)-]?|\d+[.)-]?|Question\s*\d*[:.)-]?)\s*/i, "")
        .trim();

      const options = Array.isArray(item.options)
        ? item.options.slice(0, 4).map((o: any) => String(o).replace(/^[A-D][\).:\-]?\s*/i, "").trim())
        : [];

      if (!question || options.length < 4) return null;

      let correct_answer = 0;
      if (Number.isInteger(item.correct_answer)) {
        correct_answer = Math.min(Math.max(item.correct_answer, 0), 3);
      } else if (Number.isInteger(item.correctIndex)) {
        correct_answer = Math.min(Math.max(item.correctIndex, 0), 3);
      } else if (typeof item.answer === "string") {
        const answerText = item.answer.trim().toUpperCase();
        if (/^[A-D]$/.test(answerText)) correct_answer = answerText.charCodeAt(0) - 65;
        if (/^[1-4]$/.test(answerText)) correct_answer = Number(answerText) - 1;
      }

      return {
        question,
        options,
        correct_answer,
        explanation: item.explanation ? String(item.explanation).trim() : undefined,
      };
    };

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map(toMcq).filter(Boolean) as { question: string; options: string[]; correct_answer: number; explanation?: string }[];
        const uniq = new Map<string, (typeof cleaned)[number]>();
        cleaned.forEach((q) => {
          const key = normalizeQuestion(q.question);
          if (!uniq.has(key)) uniq.set(key, q);
        });
        return Array.from(uniq.values());
      }
    } catch {}

    const blocks = trimmed
      .split(/\n\s*\n(?=\s*(?:Q?\d+[\).:-]|Question\s*\d*[:.)-]?))/i)
      .map((b) => b.trim())
      .filter(Boolean);

    const parsed = blocks
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        const questionLine = lines.find((l) => !/^[A-D][\).:\-]?\s+/i.test(l) && !/^(Answer|Correct|Explanation|Rationale)\s*[:\-]/i.test(l));
        if (!questionLine) return null;

        const question = questionLine.replace(/^(Q\d+[:.)-]?|\d+[.)-]?|Question\s*\d*[:.)-]?)\s*/i, "").trim();
        const options = lines
          .filter((l) => /^[A-D][\).:\-]?\s+/i.test(l))
          .map((l) => l.replace(/^[A-D][\).:\-]?\s+/i, "").trim())
          .slice(0, 4);

        if (!question || options.length < 4) return null;

        const answerLine = lines.find((l) => /^(Answer|Correct)\s*[:\-]/i.test(l));
        let correct_answer = 0;
        if (answerLine) {
          const answer = answerLine.replace(/^(Answer|Correct)\s*[:\-]\s*/i, "").trim();
          const upper = answer.toUpperCase();
          if (/^[A-D]$/.test(upper)) correct_answer = upper.charCodeAt(0) - 65;
          else if (/^[1-4]$/.test(answer)) correct_answer = Number(answer) - 1;
          else {
            const optIndex = options.findIndex((opt) => opt.toLowerCase() === answer.toLowerCase());
            if (optIndex >= 0) correct_answer = optIndex;
          }
        }

        const explanationStart = lines.findIndex((l) => /^(Explanation|Rationale)\s*[:\-]/i.test(l));
        const explanation = explanationStart >= 0
          ? lines
              .slice(explanationStart)
              .join(" ")
              .replace(/^(Explanation|Rationale)\s*[:\-]\s*/i, "")
              .trim()
          : undefined;

        return { question, options, correct_answer, explanation };
      })
      .filter(Boolean) as { question: string; options: string[]; correct_answer: number; explanation?: string }[];

    const uniq = new Map<string, (typeof parsed)[number]>();
    parsed.forEach((q) => {
      const key = normalizeQuestion(q.question);
      if (!uniq.has(key)) uniq.set(key, q);
    });
    return Array.from(uniq.values());
  };

  const parseDirectFlashcards = (raw: string) => {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const uniq = new Map<string, { question: string; answer: string }>();
        parsed.forEach((c) => {
          if (!c?.question || !c?.answer) return;
          const question = String(c.question).trim();
          const answer = String(c.answer).trim();
          if (!question || !answer) return;
          const key = question.toLowerCase().replace(/\s+/g, " ");
          if (!uniq.has(key)) uniq.set(key, { question, answer });
        });
        return Array.from(uniq.values());
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

    const uniq = new Map<string, { question: string; answer: string }>();
    pairs.forEach((item) => {
      const key = item.question.toLowerCase().replace(/\s+/g, " ");
      if (!uniq.has(key)) uniq.set(key, item);
    });
    return Array.from(uniq.values());
  };

  const parseDirectArticle = (raw: string) => {
    const clean = raw.replace(/```[\s\S]*?```/g, "").trim();
    const inferredTitle = inferContentTitle(clean, "Study Notes");
    const title = directTitle.trim() || inferredTitle;

    let body = clean
      .replace(/^#\s+/gm, "## ")
      .replace(/^\*\*(.+)\*\*$/gm, "$1")
      .trim();

    if (body.toLowerCase().startsWith(inferredTitle.toLowerCase())) {
      body = body.slice(inferredTitle.length).trim();
    }

    const hasSummary = /^##\s+Summary\b/im.test(body);
    const hasKeyPoints = /^##\s+Key Points\b/im.test(body);
    const hasDetailed = /^##\s+Detailed Notes\b/im.test(body);
    const hasPractice = /^##\s+Practice Questions\b/im.test(body);

    if (hasSummary && hasKeyPoints && hasDetailed && hasPractice) {
      return { title, content: body };
    }

    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const summary = paragraphs[0] || "High-yield summary pending from source notes.";
    const keyPoints = paragraphs
      .flatMap((p) => p.split(/(?<=[.!?])\s+/))
      .map((s) => s.trim())
      .filter((s) => s.length > 30)
      .slice(0, 6)
      .map((s) => `- ${s}`);

    const detailed = paragraphs.slice(1).join("\n\n") || summary;
    const practice = [
      `1. What is the core clinical concept behind ${title}? → Identify the mechanism, pattern, and practical implication for patient care.`,
      `2. Which findings best support ${title} in a clinical scenario? → Focus on high-yield signs, labs, and context clues.`,
      `3. What is the most common exam trap in ${title}? → Distinguish similar conditions using key differentiators.`,
      `4. What is the first-line management principle for ${title}? → State the priority intervention and rationale.`,
    ];

    const content = [
      "## Summary",
      summary,
      "",
      "## Key Points",
      ...(keyPoints.length ? keyPoints : ["- Add key points from your source content."]),
      "",
      "## Detailed Notes",
      detailed,
      "",
      "## Practice Questions",
      ...practice,
    ].join("\n");

    return { title, content };
  };

  const handleFormatDirect = async () => {
    if (!directContent.trim()) {
      toast({ title: "Paste content first", variant: "destructive" });
      return;
    }

    setLoading(true);
    setLoadingType("direct");
    try {
      if (directType === "article") {
        // Use Gemini to reformat the article to match site format
        const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { notes: directContent, type: 'direct-article', geminiKey, title: directTitle.trim() },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        setDirectPreviewArticle({ title: data.title, content: data.content });
        setDirectPreviewCards(null);
        setDirectPreviewMcqs(null);
        toast({ title: "Article formatted by Gemini ✓" });
      } else if (directType === "mcqs") {
        // Use Gemini to reformat MCQs
        const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { notes: directContent, type: 'direct-mcqs', geminiKey, count: clampRequestedCount(directTargetCount) },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!Array.isArray(data) || data.length === 0) {
          // Fallback to local parsing
          const parsed = parseDirectMcqs(directContent);
          const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
          if (!limited.length) throw new Error("Could not parse MCQs.");
          setDirectPreviewMcqs(limited);
        } else {
          setDirectPreviewMcqs(data);
        }
        setDirectPreviewArticle(null);
        setDirectPreviewCards(null);
        toast({ title: `Formatted MCQs via Gemini ✓` });
      } else {
        // Use Gemini to reformat flashcards
        const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { notes: directContent, type: 'direct-flashcards', geminiKey, count: clampRequestedCount(directTargetCount) },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!Array.isArray(data) || data.length === 0) {
          const parsed = parseDirectFlashcards(directContent);
          const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
          if (!limited.length) throw new Error("Could not parse flashcards.");
          setDirectPreviewCards(limited);
        } else {
          setDirectPreviewCards(data);
        }
        setDirectPreviewArticle(null);
        setDirectPreviewMcqs(null);
        toast({ title: `Formatted flashcards via Gemini ✓` });
      }
    } catch (err: any) {
      toast({ title: "Gemini format failed, using local parsing", description: err.message, variant: "destructive" });
      // Fallback to local parsing
      try {
        if (directType === "article") {
          setDirectPreviewArticle(parseDirectArticle(directContent));
          setDirectPreviewCards(null);
          setDirectPreviewMcqs(null);
        } else if (directType === "mcqs") {
          const parsed = parseDirectMcqs(directContent);
          const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
          if (!limited.length) throw new Error("Could not parse MCQs.");
          setDirectPreviewMcqs(limited);
          setDirectPreviewArticle(null);
          setDirectPreviewCards(null);
        } else {
          const parsed = parseDirectFlashcards(directContent);
          const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
          if (!limited.length) throw new Error("Could not parse flashcards.");
          setDirectPreviewCards(limited);
          setDirectPreviewArticle(null);
          setDirectPreviewMcqs(null);
        }
      } catch {}
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleDirectPublishRaw = async (publish: boolean) => {
    if (!directContent.trim()) {
      toast({ title: "Paste content first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setLoadingType("direct-raw");
    setPublishProgress({ current: 0, total: 3, label: "Parsing content..." });
    try {
      let cat = directCategory;
      if (!cat) {
        setPublishProgress({ current: 1, total: 3, label: "Auto-detecting category..." });
        cat = await autoCategorizе(directContent);
        setDirectCategory(cat);
      }
      const finalCategory = cat || "Uncategorized";
      setPublishProgress({ current: 2, total: 3, label: "Saving..." });

      if (directType === "article") {
        const parsed = parseDirectArticle(directContent);
        await saveArticle({
          title: directTitle.trim() || parsed.title,
          content: parsed.content,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      } else if (directType === "mcqs") {
        const parsed = parseDirectMcqs(directContent);
        const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
        if (!limited.length) throw new Error("Could not parse MCQs from content.");
        await saveMcqSet({
          title: directTitle.trim() || buildSetTitle("MCQ", directContent, finalCategory),
          questions: limited,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
          access_password: "",
        });
      } else {
        const parsed = parseDirectFlashcards(directContent);
        const limited = parsed.slice(0, clampRequestedCount(directTargetCount));
        if (!limited.length) throw new Error("Could not parse flashcards from content.");
        await saveFlashcardSet({
          title: directTitle.trim() || buildSetTitle("Flashcards", directContent, finalCategory),
          cards: limited,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      }

      setPublishProgress({ current: 3, total: 3, label: "Done!" });
      toast({ title: publish ? "Published directly!" : "Draft saved!" });
      setDirectContent("");
      setDirectTitle("");
      setDirectPreviewArticle(null);
      setDirectPreviewCards(null);
      setDirectPreviewMcqs(null);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingType(null);
      setTimeout(() => setPublishProgress(null), 2000);
    }
  };

  const handleDirectSave = async (publish: boolean) => {
    try {
      setPublishProgress({ current: 0, total: 3, label: "Preparing..." });
      let cat = directCategory;
      if (!cat) {
        setPublishProgress({ current: 1, total: 3, label: "Auto-detecting category..." });
        cat = await autoCategorizе(directContent);
        setDirectCategory(cat);
      }
      const finalCategory = cat || "Uncategorized";
      setPublishProgress({ current: 2, total: 3, label: "Saving to database..." });

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
          title: directTitle.trim() || buildSetTitle("MCQ", directContent, finalCategory),
          questions: directPreviewMcqs,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
          access_password: "",
        });
      } else if (directPreviewCards) {
        await saveFlashcardSet({
          title: directTitle.trim() || buildSetTitle("Flashcards", directContent, finalCategory),
          cards: directPreviewCards,
          created_at: new Date().toISOString(),
          published: publish,
          original_notes: directContent,
          category: finalCategory,
        });
      } else {
        toast({ title: "No preview yet", description: "Format with Gemini first, or use Direct Publish.", variant: "destructive" });
        setPublishProgress(null);
        return;
      }

      setPublishProgress({ current: 3, total: 3, label: "Done!" });
      toast({ title: publish ? "Published!" : "Draft saved!" });
      setDirectContent("");
      setDirectTitle("");
      setDirectPreviewArticle(null);
      setDirectPreviewCards(null);
      setDirectPreviewMcqs(null);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setTimeout(() => setPublishProgress(null), 2000);
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
        setPreviewTitle(buildSetTitle("MCQ", notes, category));
        setPreviewArticle(null);
        setPreviewCards(null);
      } else {
        const cards = await generateFlashcards(notes, cardCount);
        setPreviewCards(cards);
        setPreviewTitle(buildSetTitle("Flashcards", notes, category));
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
      setBatchTitle(articleResult?.title || inferContentTitle(notes, "Study Notes"));

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
          title: buildSetTitle("Flashcards", batchTitle || notes, cat),
          cards: batchCards,
          created_at: new Date().toISOString(),
          published: true,
          original_notes: notes,
          category: cat,
        }));
      }
      if (batchMcqs) {
        saves.push(saveMcqSet({
          title: buildSetTitle("MCQ", batchTitle || notes, cat),
          questions: batchMcqs,
          created_at: new Date().toISOString(),
          published: true,
          original_notes: notes,
          category: cat,
          access_password: "",
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
          access_password: "",
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
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <label className="mb-2 block text-sm font-medium text-foreground">Flashcards (5-100)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={cardCount}
                  onChange={(e) => setCardCount(clampRequestedCount(Number(e.target.value) || 20))}
                  className="w-24"
                />
                <div className="flex flex-wrap gap-1">
                  {[10, 20, 30, 50, 80, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCardCount(n)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        cardCount === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <label className="mb-2 block text-sm font-medium text-foreground">MCQs (5-100)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={mcqCount}
                  onChange={(e) => setMcqCount(clampRequestedCount(Number(e.target.value) || 15))}
                  className="w-24"
                />
                <div className="flex flex-wrap gap-1">
                  {[10, 15, 20, 30, 50, 80, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMcqCount(n)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        mcqCount === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
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

            <div className="mb-4 grid gap-4 md:grid-cols-4">
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

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {directType === "article" ? "Preview" : "Target count"}
                </label>
                {directType === "article" ? (
                  <div className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground">Auto format</div>
                ) : (
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={directTargetCount}
                    onChange={(e) => setDirectTargetCount(clampRequestedCount(Number(e.target.value) || 20))}
                  />
                )}
              </div>
            </div>

            <Textarea
              value={directContent}
              onChange={(e) => setDirectContent(e.target.value)}
              placeholder={directType === "article" ? "Paste article markdown/plain text" : directType === "mcqs" ? "Paste MCQs JSON or Q1 + A) B) C) D) format" : "Paste flashcards JSON or Q:/A: format"}
              className="mb-4 min-h-[180px]"
            />

            <div className="mb-4 flex flex-wrap gap-3">
              <Button onClick={handleFormatDirect} variant="outline" disabled={loading} className="gap-2">
                {loading && loadingType === "direct" && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading && loadingType === "direct" ? "Formatting with Gemini..." : "✨ Format with Gemini"}
              </Button>
              <Button onClick={() => handleDirectSave(false)} variant="outline" disabled={loading}>Save Draft</Button>
              <Button onClick={() => handleDirectSave(true)} disabled={loading}>Direct Publish</Button>
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
  const [passwordSetId, setPasswordSetId] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
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

  const handleSetPassword = async (s: McqSet) => {
    await saveMcqSet({ ...s, access_password: passwordValue.trim() });
    setPasswordSetId(null);
    setPasswordValue("");
    refresh();
    toast({ title: passwordValue.trim() ? "Password set! Quiz answers are now locked." : "Password removed. Answers are visible to all." });
  };

  const handleRemovePassword = async (s: McqSet) => {
    await saveMcqSet({ ...s, access_password: "" });
    refresh();
    toast({ title: "Password removed" });
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
        <div key={s.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">{s.title}</h4>
                {s.access_password && s.access_password !== "" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Key className="h-2.5 w-2.5" /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.category !== "Uncategorized" && <span className="text-primary">{getCategoryDisplayName(s.category)} · </span>}
                {s.questions.length} questions · {new Date(s.created_at).toLocaleDateString()} · {s.published ? "Published" : "Draft"}
              </p>
            </div>
            <div className="flex gap-1 ml-2 flex-wrap justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setPasswordSetId(passwordSetId === s.id ? null : s.id); setPasswordValue(s.access_password || ""); }} title="Set password">
                <Key className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => togglePublish(s)}>{s.published ? "Unpublish" : "Publish"}</Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Password setting inline */}
          {passwordSetId === s.id && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-foreground mb-2">🔒 Set Password (leave empty to remove)</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter password for this quiz"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={() => handleSetPassword(s)} className="gap-1">
                  <Save className="h-3 w-3" /> Save
                </Button>
                {s.access_password && s.access_password !== "" && (
                  <Button size="sm" variant="destructive" onClick={() => handleRemovePassword(s)} className="gap-1">
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Settings Panel ---
function SettingsPanel({ setGeminiKey }: { setGeminiKey: (key: string) => void }) {
  const [localGeminiKey, setLocalGeminiKey] = useState("");
  const [examPassword, setExamPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingExam, setGeneratingExam] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      getSetting("gemini_api_key"),
      getSetting("exam_password"),
    ]).then(([key, pwd]) => {
      setLocalGeminiKey(key || "");
      setExamPassword(pwd || "");
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
    } finally { setSaving(false); }
  };

  const handleSaveExamPassword = async () => {
    setSaving(true);
    try {
      await saveSetting("exam_password", examPassword.trim());
      toast({ title: examPassword.trim() ? "Exam password saved!" : "Exam password removed" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleGenerateExam = async () => {
    setGeneratingExam(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exam');
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: `Exam generated! ${data.mcq_count} MCQs, ${data.saq_count} SAQs, ${data.laq_count} LAQs` });
    } catch (err: any) {
      toast({ title: "Exam generation failed", description: err.message, variant: "destructive" });
    } finally { setGeneratingExam(false); }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 font-display text-lg font-bold text-foreground">Google Gemini API</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your Gemini API key from{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
        </p>
        <div className="flex gap-2">
          <Input type="password" placeholder="Enter your Gemini API key" value={localGeminiKey} onChange={(e) => setLocalGeminiKey(e.target.value)} className="flex-1" />
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Key className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        {localGeminiKey && <p className="mt-2 text-xs text-primary">✓ API key configured</p>}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 font-display text-lg font-bold text-foreground">🔒 Default Exam Password</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Set a default password for auto-generated weekly exams. Leave empty for no password.
        </p>
        <div className="flex gap-2">
          <Input type="text" placeholder="Default exam password" value={examPassword} onChange={(e) => setExamPassword(e.target.value)} className="flex-1" />
          <Button onClick={handleSaveExamPassword} disabled={saving} size="sm" className="gap-2">
            <Save className="h-3 w-3" /> Save
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <h3 className="mb-2 font-display text-lg font-bold text-foreground">📝 Weekly Exam Generator</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Generates a comprehensive exam from all published content: 60 MCQs + SAQs + LAQs. Auto-runs every Friday at midnight.
        </p>
        <Button onClick={handleGenerateExam} disabled={generatingExam} className="gap-2">
          {generatingExam && <Loader2 className="h-4 w-4 animate-spin" />}
          {generatingExam ? "Generating Exam..." : "Generate Exam Now"}
        </Button>
      </div>
    </div>
  );
}
