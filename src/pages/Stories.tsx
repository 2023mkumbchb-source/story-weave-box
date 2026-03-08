import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, BookOpen, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Story {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  created_at: string;
}

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    supabase
      .from("stories")
      .select("*")
      .eq("published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setStories((data || []) as unknown as Story[]);
        setLoading(false);
      });
  }, []);

  const filtered = stories.filter((s) => {
    if (!search.trim()) return true;
    return s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6 py-10 sm:py-12">
      <div className="mb-7">
        <h1 className="mb-1 font-serif text-3xl sm:text-4xl font-bold text-foreground">Stories</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Medical stories and narratives</p>
      </div>

      <div className="mb-5">
        <div className={`relative flex items-center rounded-xl border transition-all ${
          searchFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
        } bg-background`}>
          <Search className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="Search stories…"
            className="w-full bg-transparent px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none" />
          {search && (
            <button onClick={() => setSearch("")} className="mr-3 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">
            {stories.length === 0 ? "No stories yet" : "No stories match your search"}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story) => (
            <motion.div key={story.id} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
              <Link to={`/stories/${story.id}`}
                className="group block rounded-xl border border-border bg-card p-6 transition-shadow hover:[box-shadow:var(--shadow-card-hover)] h-full"
                style={{ boxShadow: "var(--shadow-card)" }}>
                {story.category && story.category !== "Uncategorized" && (
                  <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                    {story.category}
                  </span>
                )}
                <h3 className="mb-2 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {story.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {story.content.slice(0, 150).replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim()}...
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
