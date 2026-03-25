import React from "react";
import { motion } from "framer-motion";
import type { ChannelNoteItem } from "../../../../types";
import { CATEGORY_MAP } from "./constants";

interface Props {
  note: ChannelNoteItem;
  userId: string;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  onEditTitleChange: (val: string) => void;
  onEditContentChange: (val: string) => void;
  onPin: (note: ChannelNoteItem) => void;
  onStartEdit: (note: ChannelNoteItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

function NoteCard({
  note,
  userId,
  isEditing,
  editTitle,
  editContent,
  onEditTitleChange,
  onEditContentChange,
  onPin,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: Props) {
  const catInfo = CATEGORY_MAP[note.category];
  const isOwner = note.authorId === userId;

  return (
    <motion.div
      className={`sh-notes__card sh-notes__card--${note.category}${note.pinned ? " sh-notes__card--pinned" : ""}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {note.pinned && (
        <div className="sh-notes__pin-ribbon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5L7.5 4.5L10.5 5L8.25 7.25L8.75 10.5L6 9L3.25 10.5L3.75 7.25L1.5 5L4.5 4.5L6 1.5Z" fill="currentColor" />
          </svg>
          Sabitlendi
        </div>
      )}

      <div className={`sh-notes__badge sh-notes__badge--${note.category}`}>
        <span className="sh-notes__badge-icon">{catInfo.icon}</span>
        <span className="sh-notes__badge-label">{catInfo.label}</span>
      </div>

      {isEditing ? (
        <input
          className="sh-notes__edit-input"
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          autoFocus
        />
      ) : (
        <h4 className="sh-notes__card-title">{note.title}</h4>
      )}

      {isEditing ? (
        <textarea
          className="sh-notes__edit-textarea"
          value={editContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          rows={4}
        />
      ) : (
        <p className="sh-notes__card-content">{note.content}</p>
      )}

      <div className="sh-notes__card-footer">
        <div className="sh-notes__card-meta">
          <span className="sh-notes__card-author">{note.authorNickname}</span>
          <span className="sh-notes__card-dot">{"  "}</span>
          <span className="sh-notes__card-date">
            {new Date(note.createdAt).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {note.editedAt && <span className="sh-notes__card-edited">(d{"\ü"}zenlendi)</span>}
        </div>

        <div className="sh-notes__card-actions">
          {isEditing ? (
            <>
              <button
                className="sh-notes__action-btn sh-notes__action-btn--ghost"
                onClick={onCancelEdit}
                type="button"
              >
                {"\İ"}ptal
              </button>
              <button
                className="sh-notes__action-btn sh-notes__action-btn--save"
                onClick={() => onSaveEdit(note.id)}
                type="button"
              >
                Kaydet
              </button>
            </>
          ) : (
            <>
              <button
                className={`sh-notes__action-icon${note.pinned ? " sh-notes__action-icon--active" : ""}`}
                onClick={() => onPin(note)}
                title={note.pinned ? "Sabitlemeyi kald\ır" : "Sabitle"}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7.5 1.5L9.5 4L12.5 4.5L10 7L10.5 10.5L7.5 9L4.5 10.5L5 7L2.5 4.5L5.5 4L7.5 1.5Z"
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                    fill={note.pinned ? "currentColor" : "none"} />
                </svg>
              </button>
              {isOwner && (
                <>
                  <button
                    className="sh-notes__action-icon"
                    onClick={() => onStartEdit(note)}
                    title="D\üzenle"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 2.5l2 2L4.5 11.5H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="sh-notes__action-icon sh-notes__action-icon--danger"
                    onClick={() => onDelete(note.id)}
                    title="Sil"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M4 4l.5 7.5a1 1 0 001 .5h3a1 1 0 001-.5L10 4"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default React.memo(NoteCard);
