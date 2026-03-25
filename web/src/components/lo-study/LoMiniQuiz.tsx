type QuizItem = {
  question: string;
  answer: string;
  why: string;
};

type Props = {
  items: QuizItem[];
  quizRevealed: Record<number, boolean>;
  onToggleAnswer: (index: number) => void;
};

export default function LoMiniQuiz({ items, quizRevealed, onToggleAnswer }: Props) {
  return (
    <>
      {items.map((q, i) => (
        <div
          key={i}
          style={{
            padding: 14,
            marginBottom: 10,
            borderRadius: 12,
            background: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--accent-2)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <p style={{ fontWeight: 600, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {q.question}
            </p>
          </div>

          <button
            onClick={() => onToggleAnswer(i)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              marginBottom: quizRevealed[i] ? 12 : 0,
            }}
          >
            {quizRevealed[i] ? "Hide Answer" : "Show Answer"}
          </button>

          {quizRevealed[i] && (
            <div
              className="lo-quiz-answer"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--success-soft)",
                marginTop: 8,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "#22c55e" }}>{"\✓"} Answer: </span>
                <span style={{ fontSize: 13 }}>{q.answer}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--accent-2)" }}>Why: </span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>{q.why}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
