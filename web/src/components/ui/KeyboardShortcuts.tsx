import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUiStore } from "../../stores/uiStore";
import { MODE_KEY_MAP } from "../../hooks/useApp";
import { t } from "../../utils/i18n";

type Platform = "mac" | "windows";

interface Shortcut {
  label: string;
  keys: { mac: string[]; windows: string[] };
  action?: () => void;
}

interface ShortcutGroup {
  titleKey: string;
  items: Shortcut[];
}

const MODE_LABEL_MAP: Record<string, string> = {
  plan: "mode.plan",
  alignment: "mode.alignment",
  "lecturer-note": "mode.lecturerNote",
  quiz: "mode.quiz",
  "deep-dive": "mode.deepDive",
  history: "mode.history",
  "lo-study": "mode.loStudy",
  "cheat-sheet": "mode.cheatSheet",
};

const KeyboardIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="12" rx="2" />
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8" />
  </svg>
);

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "windows";
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? "mac" : "windows";
}

function sameKeys(keys: string[]): { mac: string[]; windows: string[] } {
  return { mac: keys, windows: keys };
}

function useShortcutGroups(): ShortcutGroup[] {
  const setMode = useUiStore((s) => s.setMode);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return useMemo(() => [
    {
      titleKey: "shortcuts.modes",
      items: Object.entries(MODE_KEY_MAP).map(([key, mode]) => ({
        label: MODE_LABEL_MAP[mode] || mode,
        keys: sameKeys([key]),
        action: () => setMode(mode),
      })),
    },
    {
      titleKey: "shortcuts.navigation",
      items: [
        { label: "shortcuts.toggleSidebar", keys: { mac: ["⌥", "B"], windows: ["Alt", "B"] }, action: toggleLeftPanel },
        { label: "shortcuts.showShortcuts", keys: sameKeys(["?"]) },
        { label: "shortcuts.closeModal", keys: sameKeys(["Esc"]) },
      ],
    },
    {
      titleKey: "shortcuts.actions",
      items: [
        { label: "shortcuts.newLesson", keys: { mac: ["⌥", "N"], windows: ["Alt", "N"] }, action: () => setMode("create-lesson" as any) },
        { label: "shortcuts.exportPdf", keys: { mac: ["⌥", "E"], windows: ["Alt", "E"] }, action: () => {
          const el = document.querySelector<HTMLElement>(".lc-plan-pane");
          if (el) import("../../utils/pdfExport").then(({ exportToPdf }) => exportToPdf(el, "lesson-export.pdf"));
        }},
        { label: "shortcuts.toggleTheme", keys: { mac: ["⌥", "T"], windows: ["Alt", "T"] }, action: toggleTheme },
      ],
    },
  ], [setMode, toggleLeftPanel, toggleTheme]);
}

function Kbd({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <span className={`ks-key${accent ? " ks-key--accent" : ""}`}>
      {children}
    </span>
  );
}

const AppleIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const WindowsIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-9.25.05V5.25L20 3zM3 13l6 .09v6.51l-6-1.33V13zm17 .25V22l-9.25-1.29V13.25L20 13.25z"/>
  </svg>
);

export function KeyboardShortcuts({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const groups = useShortcutGroups();

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            t(item.label).toLowerCase().includes(q) ||
            item.keys[platform].join(" ").toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search, platform]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ks-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="ks-modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t("shortcuts.title")}
          >
            <div className="ks-header">
              <h2 className="ks-title">
                {KeyboardIcon}
                {t("shortcuts.title")}
              </h2>
              <div className="ks-header__right">
                <div className="ks-platform-toggle" role="radiogroup" aria-label={t("shortcuts.platformSelect")}>
                  <button
                    className={`ks-platform-btn${platform === "mac" ? " ks-platform-btn--active" : ""}`}
                    onClick={() => setPlatform("mac")}
                    aria-checked={platform === "mac"}
                    role="radio"
                    title="macOS"
                  >
                    {AppleIcon}
                    <span>Mac</span>
                  </button>
                  <button
                    className={`ks-platform-btn${platform === "windows" ? " ks-platform-btn--active" : ""}`}
                    onClick={() => setPlatform("windows")}
                    aria-checked={platform === "windows"}
                    role="radio"
                    title="Windows"
                  >
                    {WindowsIcon}
                    <span>Win</span>
                  </button>
                </div>
                <div className="ks-close-hint">
                  <Kbd>Esc</Kbd>
                  <span>{t("shortcuts.close")}</span>
                </div>
              </div>
            </div>

            <div className="ks-body">
              <div className="ks-search">
                <svg className="ks-search__icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="7" r="5" /><path d="M12 12l3 3" />
                </svg>
                <input
                  className="ks-search__input"
                  type="text"
                  placeholder={t("shortcuts.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {filteredGroups.map((group) => (
                <div className="ks-group" key={group.titleKey}>
                  <div className="ks-group__label">{t(group.titleKey)}</div>
                  {group.items.map((item) => {
                    const keys = item.keys[platform];
                    return (
                      <button
                        key={item.label}
                        className="ks-row"
                        onClick={() => { item.action?.(); onClose(); }}
                        tabIndex={0}
                      >
                        <span className="ks-row__name">{t(item.label)}</span>
                        <span className="ks-row__keys">
                          {keys.map((key, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="ks-plus">+</span>}
                              <Kbd accent={keys.length === 1}>{key}</Kbd>
                            </React.Fragment>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <div className="ks-empty">{t("shortcuts.noResults")}</div>
              )}

              <div className="ks-tip">
                <strong>{t("shortcuts.tipLabel")}</strong>
                {t("shortcuts.tipText")}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardShortcuts;
