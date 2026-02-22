import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  ListChecks,
  Loader2,
  Stethoscope,
  ArrowRight,
  Lightbulb,
  FlaskConical,
  Sparkles,
  Phone,
  MessageCircle,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAllCategories, getCategoryDisplayName } from "@/lib/store";

const unitIcons = [Stethoscope, GraduationCap, BookOpen, FlaskConical, Lightbulb, ListChecks];

const TABS = [
  { key: "articles"   as const, label: "Articles",   Icon: BookOpen,   to: "/blog" },
  { key: "flashcards" as const, label: "Flashcards", Icon: Lightbulb,  to: "/flashcards" },
  { key: "quizzes"    as const, label: "Quizzes",    Icon: ListChecks, to: "/mcqs" },
];

export default function Index() {
  const [categories, setCategories] = useState<
    { name: string; articles: number; flashcards: number; mcqs: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "flashcards" | "quizzes">("articles");

  useEffect(() => {
    getAllCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(175deg, #0e1f38 0%, #111827 60%, #0c1a2e 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── HERO ── */}
      <section style={{ padding: "32px 22px 8px" }}>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(37,99,235,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 999, padding: "5px 14px",
            marginBottom: 18,
          }}
        >
          <Stethoscope style={{ width: 13, height: 13, color: "#60a5fa" }} />
          <span style={{ color: "#93c5fd", fontSize: 12, fontWeight: 600 }}>Medical Study Platform</span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <h1 style={{
            color: "#ffffff", fontSize: 34, fontWeight: 900,
            lineHeight: 1.1, margin: "0 0 4px",
            letterSpacing: "-1px",
          }}>
            MedLife
          </h1>
          <h1 style={{
            fontSize: 34, fontWeight: 900,
            lineHeight: 1.1, margin: "0 0 14px",
            letterSpacing: "-1px",
            background: "linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Echo's
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ color: "#64748b", fontSize: 14, lineHeight: 1.65, margin: "0 0 28px" }}
        >
          Transform your medical notes into comprehensive articles, flashcards, and MCQ quizzes. Study smarter for your exams.
        </motion.p>

        {/* ── CIRCLE TABS ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ display: "flex", gap: 0, marginBottom: 36 }}
        >
          {TABS.map(({ key, label, Icon, to }) => {
            const active = activeTab === key;
            return (
              <Link
                key={key}
                to={to}
                onClick={() => setActiveTab(key)}
                style={{
                  textDecoration: "none", flex: 1,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                }}
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  style={{
                    width: 76, height: 76, borderRadius: "50%",
                    border: active ? "2.5px solid #3b82f6" : "2px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(145deg, #1d4ed8, #2563eb)"
                      : "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: active
                      ? "0 0 0 6px rgba(37,99,235,0.15), 0 6px 20px rgba(37,99,235,0.35)"
                      : "none",
                    transition: "all 0.25s ease",
                  }}
                >
                  <Icon style={{ width: 26, height: 26, color: active ? "#fff" : "#475569" }} />
                </motion.div>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: active ? "#60a5fa" : "#475569",
                  transition: "color 0.2s",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </motion.div>
      </section>

      {/* ── BROWSE BY UNIT ── */}
      <section style={{ padding: "0 22px" }}>
        <p style={{
          color: "#3b82f6", fontSize: 11, fontWeight: 800,
          letterSpacing: 2.5, textTransform: "uppercase", margin: "0 0 14px",
        }}>
          Browse by Unit
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 style={{ width: 28, height: 28, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
          </div>
        ) : categories.length === 0 ? (
          <p style={{ color: "#475569", textAlign: "center", padding: "48px 0", fontSize: 14 }}>
            No content yet. Create some from the dashboard!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map((cat, i) => {
              const displayName = getCategoryDisplayName(cat.name);
              const Icon = unitIcons[i % unitIcons.length];
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <Link
                    to={`/blog?category=${encodeURIComponent(cat.name)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <motion.div
                      whileTap={{ scale: 0.975 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px", borderRadius: 18,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        width: 50, height: 50, borderRadius: 13, flexShrink: 0,
                        background: "linear-gradient(135deg, #1e3a6e, #2563eb)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 3px 12px rgba(37,99,235,0.3)",
                      }}>
                        <Icon style={{ width: 22, height: 22, color: "#93c5fd" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.4 }}>
                          {displayName}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {cat.articles > 0 && (
                          <p style={{ color: "#60a5fa", fontSize: 12, margin: "0 0 1px", fontWeight: 600 }}>
                            {cat.articles} article{cat.articles !== 1 ? "s" : ""}
                          </p>
                        )}
                        {cat.flashcards > 0 && (
                          <p style={{ color: "#60a5fa", fontSize: 12, margin: "0 0 1px", fontWeight: 600 }}>
                            {cat.flashcards} set{cat.flashcards !== 1 ? "s" : ""}
                          </p>
                        )}
                        {cat.mcqs > 0 && (
                          <p style={{ color: "#60a5fa", fontSize: 12, margin: 0, fontWeight: 600 }}>
                            {cat.mcqs} quiz{cat.mcqs !== 1 ? "zes" : ""}
                          </p>
                        )}
                        {cat.articles === 0 && cat.flashcards === 0 && cat.mcqs === 0 && (
                          <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>Empty</p>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "28px 22px 0", textAlign: "center" }}>
        <p style={{ color: "#475569", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
          Ready to study? Head to the dashboard to generate content from your notes.
        </p>
        <Link to="/admin" style={{ textDecoration: "none" }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 34px", borderRadius: 999,
              background: "linear-gradient(135deg, #2563eb, #0891b2)",
              boxShadow: "0 6px 28px rgba(37,99,235,0.45)",
              color: "#fff", fontWeight: 700, fontSize: 15,
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Go to Dashboard
            <ArrowRight style={{ width: 17, height: 17 }} />
          </motion.button>
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        marginTop: "auto",
        padding: "40px 22px 36px",
        background: "linear-gradient(180deg, transparent 0%, rgba(6,12,28,0.95) 30%)",
        borderTop: "1px solid rgba(59,130,246,0.15)",
      }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            marginBottom: 6,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Stethoscope style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0, letterSpacing: "-0.3px" }}>
                MedLife Echo's
              </p>
              <p style={{ color: "#3b82f6", fontSize: 10, margin: 0, fontWeight: 600, letterSpacing: 1 }}>
                MEDICAL STUDY PLATFORM
              </p>
            </div>
          </div>
          <p style={{ color: "#334155", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Smarter studying for medical students
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)",
          marginBottom: 24,
        }} />

        {/* Creator card */}
        <div style={{
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 18,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            {/* Avatar initials */}
            <div style={{
              width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #1d4ed8, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "#fff",
              boxShadow: "0 3px 12px rgba(37,99,235,0.4)",
            }}>
              AD
            </div>
            <div>
              <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, margin: "0 0 2px" }}>
                Abongo Davis
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Sparkles style={{ width: 12, height: 12, color: "#60a5fa" }} />
                <p style={{ color: "#60a5fa", fontSize: 12, margin: 0, fontWeight: 600 }}>
                  MBChB · Innovative Medical Student
                </p>
              </div>
            </div>
          </div>

          {/* Contact buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="tel:+254115475543"
              style={{
                flex: 1, textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", borderRadius: 12,
                background: "rgba(37,99,235,0.2)",
                border: "1px solid rgba(59,130,246,0.25)",
                color: "#93c5fd", fontSize: 13, fontWeight: 600,
              }}
            >
              <Phone style={{ width: 14, height: 14 }} />
              Call
            </a>
            <a
              href="https://wa.me/254115475543"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", borderRadius: 12,
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#86efac", fontSize: 13, fontWeight: 600,
              }}
            >
              <MessageCircle style={{ width: 14, height: 14 }} />
              WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom note */}
        <p style={{
          textAlign: "center", color: "#1e293b", fontSize: 11,
          margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          Built with <Heart style={{ width: 10, height: 10, color: "#3b82f6", fill: "#3b82f6" }} /> for medical students · {new Date().getFullYear()}
        </p>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
