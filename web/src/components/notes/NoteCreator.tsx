import { motion } from "framer-motion";
import TagInput from "../ui/TagInput";
import { NOTE_MAX_CHARS } from "../../hooks/useNotesPane";

interface Props {
    newTitle: string;
    setNewTitle: (v: string) => void;
    newContent: string;
    setNewContent: (v: string) => void;
    newTags: string[];
    setNewTags: (v: string[]) => void;
    allTags: string[];
    setShowCreator: (v: boolean) => void;
    handleCreateNote: () => void;
}

export default function NoteCreator({
    newTitle, setNewTitle,
    newContent, setNewContent,
    newTags, setNewTags,
    allTags,
    setShowCreator,
    handleCreateNote,
}: Props) {
    return (
        <motion.div
            className="nt-creator"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
        >
            <div className="nt-creator-inner">
                <input
                    autoFocus
                    className="nt-input"
                    placeholder="Note title (optional)"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                />
                <textarea
                    className="nt-textarea"
                    placeholder="Write your note here..."
                    value={newContent}
                    onChange={e => { if (e.target.value.length <= NOTE_MAX_CHARS) setNewContent(e.target.value); }}
                    rows={4}
                    maxLength={NOTE_MAX_CHARS}
                />
                <div style={{ textAlign: "right", fontSize: 11, color: newContent.length > NOTE_MAX_CHARS * 0.9 ? "#e17055" : "var(--muted)" }}>
                    {newContent.length}/{NOTE_MAX_CHARS}
                </div>
                <div className="nt-creator-tags">
                    <span className="nt-label">Tags</span>
                    <TagInput
                        tags={newTags}
                        allTags={allTags}
                        onAdd={t => setNewTags([...newTags, t])}
                        onRemove={t => setNewTags(newTags.filter(x => x !== t))}
                        placeholder="Add tags..."
                    />
                </div>
                <div className="nt-creator-actions">
                    <button className="nt-btn nt-btn--secondary" onClick={() => setShowCreator(false)}>Cancel</button>
                    <button className="nt-btn nt-btn--primary" onClick={handleCreateNote} disabled={!newContent.trim()}>Save Note</button>
                </div>
            </div>
        </motion.div>
    );
}
