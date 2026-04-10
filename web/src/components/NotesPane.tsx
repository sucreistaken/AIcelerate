import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "./ui/ConfirmModal";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { NoNotesEmpty } from "./ui/EmptyState";
import { useNotesPane } from "../hooks/useNotesPane";
import NoteCreator from "./notes/NoteCreator";
import NoteCard from "./notes/NoteCard";
import NotesHeader from "./notes/NotesHeader";
import NotesFilters from "./notes/NotesFilters";
import { t } from "../utils/i18n";

export default function NotesPane() {
  const {
    notes, addTag, removeTag, togglePin,
    notesContentRef, pdfLoading, handleExportPdf,
    showCreator, setShowCreator,
    newTitle, setNewTitle, newContent, setNewContent,
    newTags, setNewTags, handleCreateNote,
    editingId, editTitle, setEditTitle,
    editContent, setEditContent,
    startEdit, saveEdit, cancelEdit,
    searchInput, setSearchInput,
    copiedId, copyNote,
    showClearConfirm, setShowClearConfirm, clearAllNotes,
    allTags, filteredNotes, selectedTags, setSelectedTags,
    toggleTagFilter, handleDeleteNote, formatDate,
  } = useNotesPane();

  return (
    <motion.div
      className="nt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <ConfirmModal
        isOpen={showClearConfirm}
        onConfirm={() => { setShowClearConfirm(false); clearAllNotes(); }}
        onCancel={() => setShowClearConfirm(false)}
        title={t("notes.deleteAll")}
        message={t("notes.deleteAllMsg")}
        confirmLabel={t("history.yesDelete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />

      <PaneInfoBanner
        id="notes"
        title={t("notes.title")}
        description={t("notes.desc")}
        tips={[t("notes.tagging"), t("common.search"), t("notes.pdfExport"), t("notes.pinning")]}
      />

      <motion.div
        className="nt__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="nt__hero-left">
          <div className="nt__hero-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <h1 className="nt__hero-title">{t("notes.title")}</h1>
        </div>
      </motion.div>

      <NotesHeader
        notesCount={notes.length}
        showCreator={showCreator}
        setShowCreator={setShowCreator}
        pdfLoading={pdfLoading}
        handleExportPdf={handleExportPdf}
        setShowClearConfirm={setShowClearConfirm}
      />

      <AnimatePresence>
        {showCreator && (
          <NoteCreator
            newTitle={newTitle} setNewTitle={setNewTitle}
            newContent={newContent} setNewContent={setNewContent}
            newTags={newTags} setNewTags={setNewTags}
            allTags={allTags}
            setShowCreator={setShowCreator}
            handleCreateNote={handleCreateNote}
          />
        )}
      </AnimatePresence>

      <NotesFilters
        notesCount={notes.length}
        searchInput={searchInput} setSearchInput={setSearchInput}
        allTags={allTags} selectedTags={selectedTags}
        setSelectedTags={setSelectedTags} toggleTagFilter={toggleTagFilter}
        filteredCount={filteredNotes.length}
      />

      {notes.length === 0 && !showCreator && (
        <NoNotesEmpty onAction={() => setShowCreator(true)} />
      )}

      {notes.length > 0 && filteredNotes.length === 0 && (
        <div className="nt__empty">
          <div className="nt__empty-title">{t("notes.noMatching")}</div>
          <div className="nt__empty-desc">{t("notes.tryDifferent")}</div>
        </div>
      )}

      <div ref={notesContentRef} className="nt__grid">
        <AnimatePresence>
          {filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              editingId={editingId}
              editTitle={editTitle} setEditTitle={setEditTitle}
              editContent={editContent} setEditContent={setEditContent}
              copiedId={copiedId}
              togglePin={togglePin} startEdit={startEdit}
              cancelEdit={cancelEdit} saveEdit={saveEdit}
              copyNote={copyNote} handleDeleteNote={handleDeleteNote}
              removeTag={removeTag} addTag={addTag}
              allTags={allTags} formatDate={formatDate}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
