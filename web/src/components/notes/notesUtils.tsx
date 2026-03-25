import React from "react";
import type { Note } from "../../stores/notesStore";

export const sourceIcons: Record<string, React.ReactNode> = {
    'deep-dive': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7.5L12 22l-3-5.5C7 14.5 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
    'cheat-sheet': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    'manual': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    'default': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

export const getSourceInfo = (source: Note['source']) => {
    switch (source) {
        case 'deep-dive': return { icon: sourceIcons['deep-dive'], label: 'Deep Dive', cls: 'nt-source--deepdive' };
        case 'cheat-sheet': return { icon: sourceIcons['cheat-sheet'], label: 'Cheat Sheet', cls: 'nt-source--cheat' };
        case 'manual': return { icon: sourceIcons['manual'], label: 'Manual', cls: 'nt-source--manual' };
        default: return { icon: sourceIcons['default'], label: 'Note', cls: '' };
    }
};

export const formatLine = (text: string, kp: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*(.+?)\*\*|`(.+?)`)/g;
    let last = 0, m, pi = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        if (m[2]) parts.push(<strong key={`${kp}-b${pi++}`}>{m[2]}</strong>);
        else if (m[3]) parts.push(<code key={`${kp}-c${pi++}`} className="nt-inline-code">{m[3]}</code>);
        last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length ? parts : [text];
};

export const formatContent = (content: string): React.ReactNode[] => {
    return content.split('\n').map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- '))
            return <div key={i} className="nt-list-item">{'• '}{formatLine(line.slice(2), `n${i}`)}</div>;
        if (!line.trim()) return <div key={i} className="nt-spacer">{'\ '}</div>;
        return <div key={i} className="nt-text-line">{formatLine(line, `n${i}`)}</div>;
    });
};
