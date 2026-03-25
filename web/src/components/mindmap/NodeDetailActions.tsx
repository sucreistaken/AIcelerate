interface Props {
  selectedNode: string;
  nodeLoading: boolean;
  activeAction: 'explain' | 'example' | 'quiz' | null;
  fetchNodeDetail: (action: 'explain' | 'example' | 'quiz', nodeName?: string) => void;
  fetchAllNodeDetails: (nodeName?: string) => void;
}

function actionButtonStyle(isActive: boolean, nodeLoading: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: isActive ? '2px solid var(--accent-2)' : '1px solid var(--border)',
    background: isActive ? 'var(--accent-2)' : 'var(--bg)',
    color: isActive ? 'white' : 'var(--text)',
    cursor: nodeLoading ? 'wait' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  };
}

export default function NodeDetailActions({
  selectedNode,
  nodeLoading,
  activeAction,
  fetchNodeDetail,
  fetchAllNodeDetails,
}: Props) {
  return (
    <div style={{
      padding: '12px 16px',
      display: 'flex',
      gap: 8,
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap'
    }}>
      <button
        onClick={() => fetchNodeDetail('explain', selectedNode || undefined)}
        disabled={nodeLoading}
        style={actionButtonStyle(activeAction === 'explain', nodeLoading)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Explain
      </button>
      <button
        onClick={() => fetchNodeDetail('example', selectedNode || undefined)}
        disabled={nodeLoading}
        style={actionButtonStyle(activeAction === 'example', nodeLoading)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> Example
      </button>
      <button
        onClick={() => fetchNodeDetail('quiz', selectedNode || undefined)}
        disabled={nodeLoading}
        style={actionButtonStyle(activeAction === 'quiz', nodeLoading)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Quiz Me
      </button>
      <button
        onClick={() => fetchAllNodeDetails(selectedNode || undefined)}
        disabled={nodeLoading}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--accent-2)',
          background: 'transparent',
          color: 'var(--accent-2)',
          cursor: nodeLoading ? 'wait' : 'pointer',
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: nodeLoading ? 0.5 : 1
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Load All (Explain + Example + Quiz)
      </button>
    </div>
  );
}
