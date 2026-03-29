import React from "react";
import { motion } from "framer-motion";
import type { LearnedNodes } from "../hooks/useMindMap";
import { t } from "../utils/i18n";

interface MindMapSearchProps {
    code: string;
    allNodes: string[];
    nodeSearch: string;
    setNodeSearch: (value: string) => void;
    learnedNodes: LearnedNodes;
    handleNodeSearchClick: (nodeName: string) => void;
}

const SearchIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export function MindMapSearch({
    code,
    allNodes,
    nodeSearch,
    setNodeSearch,
    learnedNodes,
    handleNodeSearchClick,
}: MindMapSearchProps) {
    if (!code || allNodes.length === 0) return null;

    const filtered = nodeSearch.trim()
        ? allNodes.filter(n => n.toLowerCase().includes(nodeSearch.toLowerCase()))
        : [];

    return (
        <div className="mm-search">
            <span className="mm-search__icon"><SearchIcon /></span>
            <input
                className="mm-search__input"
                type="text"
                placeholder={t("mindmap.searchNodes")}
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
            />
            {nodeSearch.trim() && (
                <div className="mm-search__dropdown">
                    {filtered.length > 0 ? (
                        filtered.map(n => (
                            <div
                                key={n}
                                className="mm-search__item"
                                onClick={() => handleNodeSearchClick(n)}
                            >
                                {learnedNodes[n] && <CheckIcon />}
                                {n}
                            </div>
                        ))
                    ) : (
                        <div className="mm-search__empty">{t("mindmap.noResults")}</div>
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
    if (!code || allNodes.length === 0) return null;

    const learnedCount = Object.values(learnedNodes).filter(Boolean).length;
    const isComplete = progressPercent === 100;

    return (
        <div className="mm-bottombar">
            <div className="mm-progress">
                <span className="mm-progress__label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Progress
                </span>
                <div className="mm-progress__bar">
                    <motion.div
                        className="mm-progress__fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            background: isComplete
                                ? 'var(--success)'
                                : 'var(--accent-2)',
                        }}
                    />
                </div>
                <span
                    className="mm-progress__percent"
                    style={{ color: isComplete ? 'var(--success)' : 'var(--accent-2)' }}
                >
                    {progressPercent}%
                </span>
                <span className="mm-progress__count">
                    ({learnedCount}/{allNodes.length})
                </span>
            </div>

            {!isFullscreen && !selectedNode && (
                <span className="mm-tip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                    {t("mindmap.tipClickNode")}
                </span>
            )}
        </div>
    );
}
