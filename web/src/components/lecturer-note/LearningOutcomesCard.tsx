import React from "react";

type Props = {
  learningOutcomes: string[];
};

const LearningOutcomesCard: React.FC<Props> = ({ learningOutcomes }) => (
  <section className="card ln-lo-card mt-4">
    <div className="label">Learning Outcomes (LO)</div>
    {learningOutcomes && learningOutcomes.length > 0 ? (
      <ol className="ol small mt-1">
        {learningOutcomes.map((lo, i) => (
          <li key={i}>
            <strong>{`LO${i + 1}: `}</strong>
            {lo}
          </li>
        ))}
      </ol>
    ) : (
      <p className="small muted mt-1">
        No official learning outcomes have been attached yet. Once you fetch
        them from the syllabus, they will be listed here.
      </p>
    )}
  </section>
);

export default LearningOutcomesCard;
