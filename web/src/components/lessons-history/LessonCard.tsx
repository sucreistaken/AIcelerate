import React from "react";

interface Props {
  lesson: any;
  isActive: boolean;
  isSelected: boolean;
  t: Record<string, string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
  formatDate: (d?: string, locale?: string) => string;
}

function LessonCard({
  lesson: l, isActive, isSelected, t,
  onSelect, onToggleCheck, onDeleteClick, formatDate,
}: Props) {
  const hasTranscript = !!l.transcript;
  const quizCount = l.plan?.seed_quiz?.length || 0;
  return (
    <div
      className={`lesson-card ${isActive ? "lesson-card--active" : ""}`}
    >
      <div className="flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleCheck(l.id)}
            onClick={e => e.stopPropagation()}
            style={{ cursor: 'pointer', accentColor: 'var(--accent-2)' }}
          />
          <div
            className="font-bold text-lg truncate pr-2 cursor-pointer flex-1"
            title={l.title}
            onClick={() => onSelect(l.id)}
          >
            {l.title}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && <div className="active-dot" title={t.currentlyOpen}></div>}
          <button
            className="btn-icon-danger"
            title={t.deleteLesson}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(l.id, l.title);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.2s',
              fontSize: 16,
              padding: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div className="text-xs op-60 mt-1 flex-between" onClick={() => onSelect(l.id)}>
        <span>{formatDate(l.date)}</span>
      </div>
      <div className="mt-3 flex gap-2" style={{ flexWrap: 'wrap' }} onClick={() => onSelect(l.id)}>
        {l.highlights?.length > 0 && (
          <span className="text-xs lh-badge-concept">
            {l.highlights.length} {t.concepts}
          </span>
        )}
        {hasTranscript && (
          <span className="text-xs" style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(0,184,148,0.15)', color: '#00b894', fontWeight: 600 }}>
            Transcript
          </span>
        )}
        {quizCount > 0 && (
          <span className="text-xs" style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(253,203,110,0.2)', color: '#e17055', fontWeight: 600 }}>
            {quizCount} Quiz
          </span>
        )}
        <span className="text-xs lh-badge-action">
          {isActive ? t.open : t.explore}
        </span>
      </div>
    </div>
  );
}

export default React.memo(LessonCard);
