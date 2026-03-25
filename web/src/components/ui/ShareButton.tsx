import React, { useState, useRef, useEffect } from "react";
import { useShareStore } from "../../stores/shareStore";
import { useLessonStore } from "../../stores/lessonStore";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { createShare, loading } = useShareStore();
  const currentLessonId = useLessonStore((s) => s.currentLessonId);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleShareLink = async () => {
    if (!currentLessonId) return;
    const shareId = await createShare(currentLessonId);
    if (shareId) {
      const url = `${window.location.origin}?share=${shareId}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt("Share link:", url);
      }
    }
    setShowMenu(false);
  };

  if (!currentLessonId) return null;

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        className="share-btn"
        onClick={handleShareLink}
        disabled={loading}
        aria-label="Share lesson"
      >
        <span className="share-btn__icon" aria-hidden="true">
          {copied ? "✓" : "⇗"}
        </span>
        {loading ? "Creating..." : copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
