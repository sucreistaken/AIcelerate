import React from "react";

type Props = {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
};

export default function LoCollapsibleSection({ id, title, icon, isOpen, onToggle, children }: Props) {
  return (
    <div className="card mb-3">
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icon && <span>{icon}</span>}
        <span className="fw-700 flex-1">{title}</span>
        <span style={{ opacity: 0.5 }}>{isOpen ? "\▼" : "\▶"}</span>
      </button>
      {isOpen && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}
