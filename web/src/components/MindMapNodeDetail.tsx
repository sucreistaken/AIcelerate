import { AnimatePresence, motion } from "framer-motion";
import type { NodeDetail, LearnedNodes } from "../hooks/useMindMap";
import NodeDetailPanel from "./mindmap/NodeDetailPanel";

interface MindMapNodeDetailProps {
    selectedNode: string | null;
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

export default function MindMapNodeDetail({
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
}: MindMapNodeDetailProps) {
    return (
        <>
            <AnimatePresence>
                {selectedNode && (
                    <NodeDetailPanel
                        selectedNode={selectedNode}
                        nodeDetail={nodeDetail}
                        nodeLoading={nodeLoading}
                        activeAction={activeAction}
                        selectedQuizAnswer={selectedQuizAnswer}
                        setSelectedQuizAnswer={setSelectedQuizAnswer}
                        showQuizResult={showQuizResult}
                        setShowQuizResult={setShowQuizResult}
                        learnedNodes={learnedNodes}
                        fetchNodeDetail={fetchNodeDetail}
                        fetchAllNodeDetails={fetchAllNodeDetails}
                        toggleLearned={toggleLearned}
                        closeDetailPanel={closeDetailPanel}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDetailPanel}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            zIndex: 999
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
