import React, { useRef, useState, useEffect, useCallback } from "react";
import { ModeId } from "../types";

interface TabDef {
  id: ModeId;
  label: string;
  desc: string;
}

interface TabGroup {
  label: string;
  tabs: TabDef[];
}

const GROUPS: TabGroup[] = [
  {
    label: "Course",
    tabs: [
      { id: "course-dashboard", label: "Dashboard", desc: "Kurs genel bakis, ilerleme ve AI sohbet" },
    ],
  },
  {
    label: "Analysis",
    tabs: [
      { id: "plan", label: "Plan", desc: "AI tarafindan olusturulan ogrenme plani ve moduller" },
      { id: "alignment", label: "Alignment", desc: "Slayt ve transkript eslesmesi - konularin ne kadar ortustugunu goster" },
      { id: "deviation", label: "Deviation", desc: "Hocanin slayttan ne kadar saptigini analiz et" },
    ],
  },
  {
    label: "Study",
    tabs: [
      { id: "lecturer-note", label: "Notes", desc: "Hocanin vurguladigi onemli noktalar ve sinav uyarilari" },
      { id: "deep-dive", label: "Deep Dive", desc: "Ders icerigine dayali AI sohbet - soru sor, aciklama al" },
      { id: "lo-study", label: "LO Study", desc: "Ogrenme ciktilarina gore moduler calisma" },
      { id: "mindmap", label: "Mind Map", desc: "Dersin kavram haritasi - tikla, kesfet, ogren" },
    ],
  },
  {
    label: "Practice",
    tabs: [
      { id: "quiz", label: "Quiz", desc: "AI uretimi sorularla kendini test et ve degerlendir" },
      { id: "flashcards", label: "Flashcards", desc: "SM-2 tekrarli ogrenme kartlari - her gun gozden gecir" },
    ],
  },
  {
    label: "Resources",
    tabs: [
      { id: "cheat-sheet", label: "Cheat Sheet", desc: "Tek sayfalik sinav odakli ultra ozet" },
      { id: "notes", label: "My Notes", desc: "Kayitli notlarin - AI yanitlarindan veya elle olustur" },
      { id: "connections", label: "Connections", desc: "Dersler arasi ortak kavramlari kesfet" },
    ],
  },
  {
    label: "Manage",
    tabs: [
      { id: "history", label: "Lessons", desc: "Tum derslerini goruntule, ara ve yonet" },
      { id: "study-hub", label: "Study Hub", desc: "Isbirlikci calisma odalari - arkadaslarinla birlikte ogren" },
    ],
  },
];

export default function ModeRibbon({
  mode,
  setMode,
}: {
  mode: ModeId;
  setMode: (m: ModeId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 4;
    setCanScrollLeft(el.scrollLeft > threshold);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - threshold);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  };

  // Scroll active tab into view on mode change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeTab = el.querySelector<HTMLElement>(".tab--active");
    if (activeTab) {
      const elRect = el.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      if (tabRect.left < elRect.left + 32 || tabRect.right > elRect.right - 32) {
        activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [mode]);

  return (
    <div className="mode-ribbon" role="tablist" aria-label="Content panels">
      <div className="mode-ribbon__scroll-wrap">
        {/* Scroll shadows */}
        <div className={`mode-ribbon__shadow-left${canScrollLeft ? " mode-ribbon__shadow-left--visible" : ""}`} />
        <div className={`mode-ribbon__shadow-right${canScrollRight ? " mode-ribbon__shadow-right--visible" : ""}`} />

        {/* Scroll arrows */}
        <button
          className={`mode-ribbon__arrow mode-ribbon__arrow--left${canScrollLeft ? " mode-ribbon__arrow--visible" : ""}`}
          onClick={() => scroll("left")}
          aria-label="Scroll tabs left"
          tabIndex={-1}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3l-5 5 5 5"/></svg>
        </button>
        <button
          className={`mode-ribbon__arrow mode-ribbon__arrow--right${canScrollRight ? " mode-ribbon__arrow--visible" : ""}`}
          onClick={() => scroll("right")}
          aria-label="Scroll tabs right"
          tabIndex={-1}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5"/></svg>
        </button>

        {/* Tabs */}
        <div className="tabs" ref={scrollRef}>
          {GROUPS.map((group, gi) => (
            <React.Fragment key={group.label}>
              {gi > 0 && <div className="tab-divider" aria-hidden="true" />}
              <div className="tab-group">
                <span className="tab-group__label">{group.label}</span>
                <div className="tab-group__tabs">
                  {group.tabs.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={mode === t.id}
                      onClick={() => setMode(t.id)}
                      className={`tab ${mode === t.id ? "tab--active" : ""}`}
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
