import React from "react";
import { motion } from "framer-motion";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { ModeId } from "../../types";

interface LessonSummary {
  id: string;
  title: string;
  date?: string;
  highlights?: string[];
  plan?: { modules?: any[] };
}

function timeAgoShort(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
}

const studyTools: Array<{ id: ModeId; icon: string; label: string; desc: string; color: string }> = [
  { id: "deep-dive", icon: "\uD83D\uDCAC", label: "Deep Dive", desc: "AI ile sohbet et", color: "var(--accent-2)" },
  { id: "quiz", icon: "\uD83C\uDFAF", label: "Quiz", desc: "Kendini test et", color: "var(--hard)" },
  { id: "flashcards", icon: "\uD83C\uDCCF", label: "Flashcards", desc: "Kartlarla tekrar", color: "var(--medium)" },
  { id: "mindmap", icon: "\uD83E\uDDE0", label: "Mind Map", desc: "Kavram haritasi", color: "var(--success)" },
  { id: "cheat-sheet", icon: "\uD83D\uDCCB", label: "Cheat Sheet", desc: "Sinav ozeti", color: "#8b5cf6" },
  { id: "connections", icon: "\uD83D\uDD17", label: "Connections", desc: "Dersler arasi bag", color: "#06b6d4" },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function WelcomeGuide() {
  const lessons = useLessonStore((s) => s.lessons) as LessonSummary[];
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const setMode = useUiStore((s) => s.setMode);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);

  const recentLessons = [...lessons]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 4);

  const totalLessons = lessons.length;
  const totalConcepts = lessons.reduce((sum, l) => sum + (l.highlights?.length || 0), 0);

  const handleContinue = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setMode("plan");
  };

  const handleNewLesson = () => {
    if (leftPanelCollapsed) toggleLeftPanel();
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}
    >
      {/* Hero */}
      <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "var(--radius-lg)", margin: "0 auto var(--space-4)",
          background: "linear-gradient(135deg, var(--accent-2), #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
        }}>
          &#127891;
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "var(--fs-3xl)", fontWeight: "var(--fw-bold)",
          margin: "0 0 var(--space-2)", letterSpacing: "-0.03em", lineHeight: "var(--lh-tight)",
          color: "var(--text)",
        }}>
          {totalLessons > 0 ? "Tekrar hosgeldin!" : "AIcelerate'e hosgeldin"}
        </h1>
        <p style={{
          fontSize: "var(--fs-md)", color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto",
          lineHeight: "var(--lh-relaxed)",
        }}>
          {totalLessons > 0
            ? `${totalLessons} ders, ${totalConcepts} kavram. Kaldığın yerden devam et.`
            : "Ders materyalini yukle, AI analiz etsin. Quiz, flashcard, mind map ve daha fazlasi."
          }
        </p>
      </motion.div>

      {/* Stats Row (only if has lessons) */}
      {totalLessons > 0 && (
        <motion.div variants={fadeUp} style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)",
          marginBottom: "var(--space-8)",
        }}>
          {[
            { value: totalLessons, label: "Ders", color: "var(--accent-2)" },
            { value: totalConcepts, label: "Kavram", color: "var(--success)" },
            { value: lessons.filter(l => l.plan?.modules?.length).length, label: "Planli", color: "#8b5cf6" },
          ].map((stat) => (
            <div key={stat.label} style={{
              textAlign: "center", padding: "var(--space-5) var(--space-3)",
              borderRadius: "var(--radius-md)", background: "var(--card)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: "var(--fs-2xl)", fontWeight: "var(--fw-bold)", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Recent Lessons */}
      {recentLessons.length > 0 && (
        <motion.div variants={fadeUp} style={{ marginBottom: "var(--space-8)" }}>
          <div style={{
            fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)", color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)",
          }}>
            Son Dersler
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {recentLessons.map((l) => (
              <motion.button
                key={l.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleContinue(l.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-4)",
                  padding: "var(--space-4) var(--space-5)",
                  borderRadius: "var(--radius-md)", background: "var(--card)",
                  border: "1px solid var(--border)", cursor: "pointer",
                  textAlign: "left", width: "100%", transition: "all 0.15s",
                  fontFamily: "var(--font-body)",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)",
                  background: "var(--accent-2)", opacity: 0.12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, position: "relative",
                }}>
                  <span style={{ position: "absolute", fontSize: 18, opacity: 1 }}>&#128218;</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "var(--fs-base)", fontWeight: "var(--fw-medium)", color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {l.title}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 1 }}>
                    {l.highlights?.length || 0} kavram
                    {l.date && ` \u00B7 ${timeAgoShort(l.date)} once`}
                  </div>
                </div>
                <span style={{ fontSize: "var(--fs-sm)", color: "var(--accent-2)", fontWeight: "var(--fw-semibold)" }}>
                  Devam et &rarr;
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* New Lesson CTA */}
      <motion.div variants={fadeUp} style={{ marginBottom: "var(--space-8)" }}>
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewLesson}
          style={{
            width: "100%", padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)", border: "2px dashed var(--border)",
            background: "transparent", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)",
            transition: "all 0.2s", fontFamily: "var(--font-body)",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: "var(--radius-md)",
            background: "var(--accent-2)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "#fff",
          }}>
            +
          </div>
          <div style={{ fontSize: "var(--fs-md)", fontWeight: "var(--fw-semibold)", color: "var(--text)" }}>
            Yeni Ders Yukle
          </div>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            PDF slayt veya ses dosyasi yukle, AI analiz etsin
          </div>
        </motion.button>
      </motion.div>

      {/* Study Tools Grid */}
      <motion.div variants={fadeUp}>
        <div style={{
          fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)", color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)",
        }}>
          Calisma Araclari
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
          {studyTools.map((tool) => (
            <motion.button
              key={tool.id}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode(tool.id)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-4)", borderRadius: "var(--radius-md)",
                background: "var(--card)", border: "1px solid var(--border)",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "all 0.15s", fontFamily: "var(--font-body)",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{tool.icon}</span>
              <div>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text)" }}>
                  {tool.label}
                </div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 1 }}>
                  {tool.desc}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
