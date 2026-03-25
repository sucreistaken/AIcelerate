import { LoStudyModule } from "../../types";
import LoCollapsibleSection from "./LoCollapsibleSection";
import LoMiniQuiz from "./LoMiniQuiz";

type Props = {
  module: LoStudyModule;
  isCompleted: boolean;
  expandedSections: Set<string>;
  quizRevealed: Record<number, boolean>;
  onToggleComplete: (loId: string) => void;
  onToggleSection: (id: string) => void;
  onToggleQuizAnswer: (index: number) => void;
};

export default function LoModuleDetail({
  module: m,
  isCompleted,
  expandedSections,
  quizRevealed,
  onToggleComplete,
  onToggleSection,
  onToggleQuizAnswer,
}: Props) {
  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) => (
    <LoCollapsibleSection
      id={id}
      title={title}
      icon={icon}
      isOpen={expandedSections.has(id)}
      onToggle={onToggleSection}
    >
      {children}
    </LoCollapsibleSection>
  );

  return (
    <div className="lc-section" style={{ flex: 1, overflow: "auto", padding: 20, minWidth: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent-2), #5b9cff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
            color: "white",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{m.loId}</div>
          <h2
            style={{
              fontWeight: 800,
              margin: 0,
              fontSize: 18,
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {m.loTitle}
          </h2>
          <p style={{ opacity: 0.7, fontSize: 13, margin: "6px 0 0", lineHeight: 1.5 }}>
            {m.oneLineGist}
          </p>
        </div>
        <button
          onClick={() => onToggleComplete(m.loId)}
          style={{
            flexShrink: 0,
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            transition: "all 0.15s ease",
            background: isCompleted ? "#22c55e" : "var(--border)",
            color: isCompleted ? "white" : "var(--text)",
            whiteSpace: "nowrap",
          }}
        >
          {isCompleted ? "\✓ Done" : "Complete"}
        </button>
      </div>

      <Section id="core" title="Core Ideas" icon="">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {m.coreIdeas.map((idea, i) => (
            <li key={i} style={{ fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
              {idea}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="remember" title="Must Remember" icon="">
        {m.mustRemember.map((item, i) => (
          <div
            key={i}
            className="lo-remember-item"
            style={{
              padding: "10px 12px",
              marginBottom: 8,
              borderRadius: 8,
              borderLeft: "3px solid var(--accent-2)",
              background: "var(--accent-2-soft)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {item}
          </div>
        ))}
      </Section>

      <Section id="intuitive" title="Intuitive Explanation" icon="">
        <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{m.intuitiveExplanation}</p>
      </Section>

      {m.examples?.length > 0 && (
        <Section id="examples" title="Examples" icon="">
          {m.examples.map((ex, i) => (
            <div
              key={i}
              style={{
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 10,
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{ex.label}</div>
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>{ex.description}</div>
            </div>
          ))}
        </Section>
      )}

      {m.typicalQuestions?.length > 0 && (
        <Section id="questions" title="Typical Questions" icon="">
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {m.typicalQuestions.map((q, i) => (
              <li key={i} style={{ fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
                {q}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {m.commonTraps?.length > 0 && (
        <Section id="traps" title="Common Mistakes" icon="">
          {m.commonTraps.map((trap, i) => (
            <div
              key={i}
              className="lo-trap-item"
              style={{
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 8,
                borderLeft: "3px solid #ef4444",
                background: "var(--danger-soft)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {trap}
            </div>
          ))}
        </Section>
      )}

      {m.miniQuiz?.length > 0 && (
        <Section id="quiz" title="Mini Quiz" icon="">
          <LoMiniQuiz
            items={m.miniQuiz}
            quizRevealed={quizRevealed}
            onToggleAnswer={onToggleQuizAnswer}
          />
        </Section>
      )}
    </div>
  );
}
