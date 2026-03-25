import React from "react";
import { motion } from "framer-motion";
import type { LearnedNodes } from "../hooks/useMindMap";

interface MindMapSearchProps {
    code: string;
    allNodes: string[];
    nodeSearch: string;
    setNodeSearch: (value: string) => void;
    learnedNodes: LearnedNodes;
    handleNodeSearchClick: (nodeName: string) => void;
}

export function MindMapSearch({
    code,
    allNodes,
    nodeSearch,
    setNodeSearch,
    learnedNodes,
    handleNodeSearchClick,
}: MindMapSearchProps) {
    if (!code || allNodes.length === 0) return null;

    return (
        <div style={{ marginBottom: 8, position: 'relative' }}>
            <input
                type="text"
                placeholder="Node ara..."
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--input-bg)',
                    color: 'var(--text)', fontSize: 13,
                }}
            />
            {nodeSearch.trim() && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 8, maxHeight: 160, overflow: 'auto', marginTop: 2,
                }}>
                    {allNodes.filter(n => n.toLowerCase().includes(nodeSearch.toLowerCase())).map(n => (
                        <div
                            key={n}
                            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => handleNodeSearchClick(n)}
                        >
                            {learnedNodes[n] ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><polyline points="20 6 9 17 4 12"/></svg></> : ''}{n}
                        </div>
                    ))}
                    {allNodes.filter(n => n.toLowerCase().includes(nodeSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: 12 }}>Sonuç bulunamadı</div>
                    )}
                </div>
            )}
        </div>
    );
}

interface MindMapProgressBarProps {
    code: string;
    allNodes: string[];
    learnedNodes: LearnedNodes;
    progressPercent: number;
    isFullscreen: boolean;
    selectedNode: string | null;
}

export default function MindMapProgress({
    code,
    allNodes,
    learnedNodes,
    progressPercent,
    isFullscreen,
    selectedNode,
}: MindMapProgressBarProps) {
    return (
        <>
            {code && allNodes.length > 0 && (
                <div style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: 'var(--card)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Progress
                    </span>
                    <div style={{
                        flex: 1,
                        height: 8,
                        background: 'var(--border)',
                        borderRadius: 4,
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5 }}
                            style={{
                                height: '100%',
                                background: progressPercent === 100 ? '#22c55e' : 'var(--accent-2)',
                                borderRadius: 4
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: progressPercent === 100 ? '#22c55e' : 'var(--accent-2)' }}>
                        {progressPercent}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        ({Object.values(learnedNodes).filter(Boolean).length}/{allNodes.length} nodes)
                    </span>
                </div>
            )}

            {code && !isFullscreen && !selectedNode && (
                <div style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: 'var(--muted)',
                    textAlign: 'center'
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4, display: 'inline' }}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> Tip: Click on any node to see details and AI explanations
                </div>
            )}
        </>
    );
}
