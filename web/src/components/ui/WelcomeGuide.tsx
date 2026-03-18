import React from "react";
import { motion } from "framer-motion";

const steps = [
  {
    num: 1,
    icon: "\uD83D\uDCDA",
    title: "Ders Materyalini Yukle",
    desc: "Sol panelden slayt (PDF) ve/veya ders kaydini (ses dosyasi) yukleyin. Manuel olarak da yapistirabilirsiniz.",
    color: "#6366f1",
  },
  {
    num: 2,
    icon: "\uD83E\uDDE0",
    title: "Plan & Analyze",
    desc: "AI dersinizi analiz edip ogrenme plani, vurgular, quiz sorulari ve eslestirme tablosu olusturur.",
    color: "#00b894",
  },
  {
    num: 3,
    icon: "\uD83D\uDE80",
    title: "Modulleri Kesfet",
    desc: "Ust sekmelerden Deep Dive, Quiz, Mind Map, Cheat Sheet gibi calisma araclarina eris.",
    color: "#e17055",
  },
];

const features = [
  { icon: "\uD83D\uDCAC", label: "Deep Dive", desc: "AI ile ders hakkinda sohbet et" },
  { icon: "\uD83D\uDDFA\uFE0F", label: "Mind Map", desc: "Kavram haritasi ile gorsel ogren" },
  { icon: "\u2753", label: "Quiz", desc: "Kendini test et, AI degerlendirsin" },
  { icon: "\uD83C\uDCCF", label: "Flashcards", desc: "SM-2 ile tekrarli kartlarla calis" },
  { icon: "\uD83D\uDCCB", label: "Cheat Sheet", desc: "Tek sayfa sinav ozeti" },
  { icon: "\uD83D\uDD17", label: "Connections", desc: "Dersler arasi baglantilari kes\uFE0Ffet" },
];

export default function WelcomeGuide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>&#127891;</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "var(--text)" }}>
          AIcelerate'e Hosgeldiniz
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 420, margin: "0 auto" }}>
          Ders materyallerinizi yukleyin, AI destekli ogrenme araclarindan faydalanin.
          Asagidaki 3 adimi takip ederek baslayin.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            style={{
              display: "flex", gap: 16, alignItems: "flex-start",
              padding: 16, borderRadius: 12,
              background: "var(--input-bg)", border: "1px solid var(--border)",
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: s.color + "18", color: s.color, fontSize: 20, fontWeight: 800,
            }}>
              {s.num}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: "var(--text)" }}>
                {s.icon} {s.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                {s.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature Grid */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          Kullanabileceginiz Araclar
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {features.map((f) => (
            <div
              key={f.label}
              style={{
                padding: "10px 12px", borderRadius: 8,
                background: "var(--input-bg)", border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {f.icon} {f.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{
        textAlign: "center", fontSize: 11, color: "var(--muted)",
        padding: "12px 16px", borderRadius: 8,
        background: "var(--input-bg)", border: "1px solid var(--border)",
      }}>
        <b>Ipucu:</b> Sekmeler arasinda hizla gecmek icin klavyede <kbd style={{
          padding: "1px 5px", borderRadius: 3, background: "var(--border)",
          fontSize: 11, fontWeight: 600, fontFamily: "monospace",
        }}>1</kbd>-<kbd style={{
          padding: "1px 5px", borderRadius: 3, background: "var(--border)",
          fontSize: 11, fontWeight: 600, fontFamily: "monospace",
        }}>9</kbd> tuslarini kullanabilirsiniz.
      </div>
    </motion.div>
  );
}
