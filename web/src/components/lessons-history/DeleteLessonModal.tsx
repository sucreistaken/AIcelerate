interface Props {
  deleteTarget: { id: string; title: string };
  deleting: boolean;
  t: Record<string, string>;
  onDelete: () => void;
  onCancel: () => void;
}

export default function DeleteLessonModal({ deleteTarget, deleting, t, onDelete, onCancel }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--card)',
          padding: 24,
          borderRadius: 16,
          maxWidth: 400,
          width: '90%',
          boxShadow: 'var(--shadow-1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
        <h3 style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>{t.deleteTitle}</h3>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 24 }}>
          "<strong>{deleteTarget.title}</strong>" — {t.deleteConfirm}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={deleting}
          >
            {t.cancel}
          </button>
          <button
            className="btn"
            style={{ background: 'var(--danger)', color: 'white' }}
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? t.deleting : t.yesDelete}
          </button>
        </div>
      </div>
    </div>
  );
}
