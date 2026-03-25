import { motion } from "framer-motion";
import type { NodeDetail, LearnedNodes } from "../../hooks/useMindMap";
import NodeDetailActions from "./NodeDetailActions";
import NodeDetailContent from "./NodeDetailContent";

interface Props {
  selectedNode: string;
  nodeDetail: NodeDetail | null;
  nodeLoading: boolean;
  activeAction: 'explain' | 'example' | 'quiz' | null;
  selectedQuizAnswer: string | null;
  setSelectedQuizAnswer: (answer: string | null) => void;
  showQuizResult: boolean;
  setShowQuizResult: (show: boolean) => void;
  learnedNodes: LearnedNodes;
  fetchNodeDetail: (action: 'explain' | 'example' | 'quiz', nodeName?: string) => void;
  fetchAllNodeDetails: (nodeName?: string) => void;
  toggleLearned: (nodeName: string) => void;
  closeDetailPanel: () => void;
}

export default function NodeDetailPanel({
  selectedNode,
  nodeDetail,
  nodeLoading,
  activeAction,
  selectedQuizAnswer,
  setSelectedQuizAnswer,
  showQuizResult,
  setShowQuizResult,
  learnedNodes,
  fetchNodeDetail,
  fetchAllNodeDetails,
  toggleLearned,
  closeDetailPanel,
}: Props) {
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        maxWidth: '90vw',
        background: 'var(--card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg)'
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--accent-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: 'white'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{selectedNode}</h3>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Click buttons below for AI assistance</p>
        </div>
        <button
          onClick={closeDetailPanel}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            opacity: 0.6,
            padding: 4
          }}
        >
          {"\✕"}
        </button>
      </div>

      <NodeDetailActions
        selectedNode={selectedNode}
        nodeLoading={nodeLoading}
        activeAction={activeAction}
        fetchNodeDetail={fetchNodeDetail}
        fetchAllNodeDetails={fetchAllNodeDetails}
      />

      <NodeDetailContent
        nodeDetail={nodeDetail}
        nodeLoading={nodeLoading}
        selectedQuizAnswer={selectedQuizAnswer}
        setSelectedQuizAnswer={setSelectedQuizAnswer}
        showQuizResult={showQuizResult}
        setShowQuizResult={setShowQuizResult}
      />

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <label style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600
        }}>
          <input
            type="checkbox"
            checked={learnedNodes[selectedNode] || false}
            onChange={() => toggleLearned(selectedNode)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <span style={{ color: learnedNodes[selectedNode] ? '#22c55e' : 'var(--text)' }}>
            {learnedNodes[selectedNode] ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><polyline points="20 6 9 17 4 12"/></svg>Learned!</> : 'Mark as learned'}
          </span>
        </label>
      </div>
    </motion.div>
  );
}
