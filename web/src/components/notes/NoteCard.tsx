import React from "react";
import { motion } from "framer-motion";
import type { Note } from "../../stores/notesStore";
import { getSourceInfo, formatContent } from "./notesUtils";
import InlineTagAdder from "./InlineTagAdder";

interface Props {
    note: Note;
    editingId: string | null;
    editTitle: string;
    setEditTitle: (v: string) => void;
    editContent: string;
    setEditContent: (v: string) => void;
    copiedId: string | null;
    togglePin: (id: string) => void;
    startEdit: (note: Note) => void;
    cancelEdit: () => void;
    saveEdit: () => void;
    copyNote: (content: string, id: string) => void;
    handleDeleteNote: (id: string) => void;
    removeTag: (noteId: string, tag: string) => void;
    addTag: (noteId: string, tag: string) => void;
    allTags: string[];
    formatDate: (ts: number) => string;
}

function NoteCard({
    note, editingId, editTitle, setEditTitle, editContent, setEditContent,
    copiedId, togglePin, startEdit, cancelEdit, saveEdit, copyNote,
    handleDeleteNote, removeTag, addTag, allTags, formatDate,
}: Props) {
    const src = getSourceInfo(note.source);
    return (
        <motion.div
            className={`nt-card${note.pinned ? ' nt-card--pinned' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            layout
        >
            <div className="nt-card-header">
                <div className="nt-card-meta">
                    <button className={`nt-pin${note.pinned ? ' nt-pin--active' : ''}`} onClick={() => togglePin(note.id)} title={note.pinned ? "Unpin" : "Pin"}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>
                    </button>
                    {note.title && <span className="nt-card-title">{note.title}</span>}
                    <span className={`nt-source ${src.cls}`}>{src.icon} {src.label}</span>
                </div>
                <div className="nt-card-actions">
                    <button className="nt-card-action" onClick={() => editingId === note.id ? cancelEdit() : startEdit(note)} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                        className={`nt-card-action${copiedId === note.id ? ' nt-card-action--success' : ''}`}
                        onClick={() => copyNote(note.content, note.id)}
                        title="Copy"
                    >
                        {copiedId === note.id ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
                    </button>
                    <button className="nt-card-action nt-card-action--delete" onClick={() => handleDeleteNote(note.id)} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            {editingId === note.id ? (
                <div className="nt-edit-form">
                    <input className="nt-input" placeholder="Title (optional)" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <textarea className="nt-textarea" value={editContent} onChange={e => setEditContent(e.target.value)} rows={5} />
                    <div className="nt-edit-actions">
                        <button className="nt-btn nt-btn--secondary" onClick={cancelEdit}>Cancel</button>
                        <button className="nt-btn nt-btn--primary" onClick={saveEdit}>Save</button>
                    </div>
                </div>
            ) : (
                <div className="nt-card-content">{formatContent(note.content)}</div>
            )}

            <div className="nt-card-footer">
                <span className="nt-date">{formatDate(note.createdAt)}</span>
                <div className="nt-tags">
                    {note.tags.map(tag => (
                        <span key={tag} className="nt-tag">
                            #{tag}
                            <button className="nt-tag-remove" onClick={() => removeTag(note.id, tag)}>&times;</button>
                        </span>
                    ))}
                    <InlineTagAdder noteId={note.id} existingTags={note.tags} allTags={allTags} onAdd={addTag} />
                </div>
            </div>
        </motion.div>
    );
}

export default React.memo(NoteCard);
