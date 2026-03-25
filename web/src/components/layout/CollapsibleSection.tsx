// src/components/layout/CollapsibleSection.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleSectionProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="form-section">
      <button
        type="button"
        className="collapsible-section__trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="form-section__title" style={{ marginBottom: 0 }}>
          {title}
        </span>
        {!open && summary && (
          <span className="collapsible-section__summary">{summary}</span>
        )}
        <svg
          className={`collapsible-section__chevron${open ? " collapsible-section__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="collapsible-section__content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CollapsibleSection;
