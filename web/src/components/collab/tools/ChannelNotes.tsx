import { useChannelNotes } from "./notes/useChannelNotes";
import NoteFormModal from "./notes/NoteFormModal";
import NotesToolbar from "./notes/NotesToolbar";
import NoteCard from "./notes/NoteCard";
import NotesEmptyState from "./notes/NotesEmptyState";
import NotesNoResults from "./notes/NotesNoResults";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  userId: string;
  nickname: string;
}

export default function ChannelNotes({ channelId, topic, serverName, userId, nickname }: Props) {
  const hook = useChannelNotes({ channelId, userId, nickname });

  if (hook.notes.length === 0 && !hook.showForm) {
    return (
      <div className="sh-tool">
        <div className="sh-tool__header">
          <div className="sh-tool__header-left">
            <span>{"N"}</span>
            <h3 className="sh-main-content__channel-name">{topic}</h3>
          </div>
        </div>
        <div className="sh-tool__body">
          <NotesEmptyState onAddNote={() => hook.setShowForm(true)} />
        </div>

        <NoteFormModal
          showForm={hook.showForm}
          formTitle={hook.formTitle}
          formContent={hook.formContent}
          formCategory={hook.formCategory}
          submitting={hook.submitting}
          onClose={() => hook.setShowForm(false)}
          onSubmit={hook.handleAddNote}
          onTitleChange={hook.setFormTitle}
          onContentChange={hook.setFormContent}
          onCategoryChange={hook.setFormCategory}
        />
      </div>
    );
  }

  return (
    <div className="sh-tool">
      <div className="sh-tool__header">
        <div className="sh-tool__header-left">
          <span>{"N"}</span>
          <h3 className="sh-main-content__channel-name">{topic}</h3>
          <span className="sh-notes__count">{hook.notes.length} not</span>
        </div>
        <div className="sh-tool__header-right" />
      </div>

      <div className="sh-tool__body">
        <NotesToolbar
          search={hook.search}
          filter={hook.filter}
          onSearchChange={hook.setSearch}
          onFilterChange={hook.setFilter}
        />

        {hook.filteredNotes.length === 0 ? (
          <NotesNoResults />
        ) : (
          <div className="sh-notes__grid">
            {hook.filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                userId={hook.userId}
                isEditing={hook.editingId === note.id}
                editTitle={hook.editTitle}
                editContent={hook.editContent}
                onEditTitleChange={hook.setEditTitle}
                onEditContentChange={hook.setEditContent}
                onPin={hook.handlePin}
                onStartEdit={hook.startEdit}
                onCancelEdit={hook.cancelEdit}
                onSaveEdit={hook.handleSaveEdit}
                onDelete={hook.handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <button
        className="sh-notes__fab"
        onClick={() => hook.setShowForm(true)}
        title="Not Ekle"
        type="button"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <NoteFormModal
        showForm={hook.showForm}
        formTitle={hook.formTitle}
        formContent={hook.formContent}
        formCategory={hook.formCategory}
        submitting={hook.submitting}
        onClose={() => hook.setShowForm(false)}
        onSubmit={hook.handleAddNote}
        onTitleChange={hook.setFormTitle}
        onContentChange={hook.setFormContent}
        onCategoryChange={hook.setFormCategory}
      />
    </div>
  );
}
