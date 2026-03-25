import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useNotesStore, Note } from "../stores/notesStore";
import { exportToPdf } from "../utils/pdfExport";
import { useGamificationStore } from "../stores/gamificationStore";
import { logger } from "../utils/logger";

const NOTE_MAX_CHARS = 10000;

export { NOTE_MAX_CHARS };

export function useNotesPane() {
    const {
        notes, removeNote, clearAllNotes, addNote, updateNote, togglePin,
        addTag, removeTag, searchQuery, setSearchQuery, selectedTags,
        setSelectedTags, getAllTags, getFilteredNotes,
    } = useNotesStore();
    const [pdfLoading, setPdfLoading] = useState(false);
    const notesContentRef = useRef<HTMLDivElement>(null);
    const [showCreator, setShowCreator] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newTags, setNewTags] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [searchInput, setSearchInput] = useState(searchQuery);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [deletedNote, setDeletedNote] = useState<Note | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput), 200);
        return () => clearTimeout(timer);
    }, [searchInput, setSearchQuery]);

    const allTags = getAllTags();
    const filteredNotes = getFilteredNotes();

    const handleExportPdf = async () => {
        if (!notesContentRef.current) return;
        setPdfLoading(true);
        try { await exportToPdf(notesContentRef.current, "Notes"); }
        catch (err) { logger.error("PDF export error:", err); }
        finally { setPdfLoading(false); }
    };

    const handleCreateNote = () => {
        if (!newContent.trim()) return;
        addNote(newContent.trim(), 'manual', undefined, newTitle.trim() || undefined, newTags);
        useGamificationStore.getState().addXp('note-create');
        setNewTitle(""); setNewContent(""); setNewTags([]); setShowCreator(false);
    };

    const startEdit = useCallback((note: Note) => {
        setEditingId(note.id); setEditTitle(note.title || ""); setEditContent(note.content);
    }, []);

    const saveEdit = useCallback(() => {
        if (!editingId || !editContent.trim()) return;
        updateNote(editingId, { content: editContent.trim(), title: editTitle.trim() || undefined });
        setEditingId(null);
    }, [editingId, editContent, editTitle, updateNote]);

    const cancelEdit = useCallback(() => setEditingId(null), []);

    const toggleTagFilter = (tag: string) => {
        setSelectedTags(selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]);
    };

    const copyNote = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error("Panoya kopyalanamadı. Tarayıcı izni gerekebilir.");
        }
    };

    const handleDeleteNote = useCallback((noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        setDeletedNote(note);
        removeNote(noteId);

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        toast((t) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>Not silindi.</span>
                <button
                    style={{ background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (note) addNote(note.content, note.source, note.lessonId, note.title, note.tags);
                        setDeletedNote(null);
                    }}
                >
                    Geri Al
                </button>
            </div>
        ), { duration: 5000 });

        deleteTimerRef.current = setTimeout(() => setDeletedNote(null), 5100);
    }, [notes, removeNote, addNote]);

    const formatDate = (ts: number) => new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    return {
        notes, addNote, addTag, removeTag, togglePin,
        notesContentRef,
        pdfLoading, handleExportPdf,
        showCreator, setShowCreator,
        newTitle, setNewTitle,
        newContent, setNewContent,
        newTags, setNewTags,
        handleCreateNote,
        editingId, editTitle, setEditTitle,
        editContent, setEditContent,
        startEdit, saveEdit, cancelEdit,
        searchInput, setSearchInput,
        copiedId, copyNote,
        showClearConfirm, setShowClearConfirm,
        clearAllNotes,
        allTags, filteredNotes,
        selectedTags, setSelectedTags,
        toggleTagFilter,
        handleDeleteNote,
        formatDate,
    };
}
