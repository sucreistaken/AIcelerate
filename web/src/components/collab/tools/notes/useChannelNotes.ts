import { useState, useMemo, useCallback } from "react";
import { logger } from "../../../../utils/logger";
import { useChannelToolStore } from "../../../../stores/channelToolStore";
import { channelToolApi } from "../../../../services/channelToolApi";
import { getCollabSocket } from "../../../../services/socket";
import type { ChannelNoteItem } from "../../../../types";
import { EMPTY_NOTES, type NoteCategory } from "./constants";

interface UseChannelNotesParams {
  channelId: string;
  userId: string;
  nickname: string;
}

export type FilterCategory = "all" | NoteCategory;

export function useChannelNotes({ channelId, userId, nickname }: UseChannelNotesParams) {
  const notes = useChannelToolStore((s) => s.dataByChannel[channelId]?.notes?.items ?? EMPTY_NOTES);
  const addNoteToStore = useChannelToolStore((s) => s.addNoteToStore);
  const updateNoteInStore = useChannelToolStore((s) => s.updateNoteInStore);
  const removeNoteFromStore = useChannelToolStore((s) => s.removeNoteFromStore);

  const [filter, setFilter] = useState<FilterCategory>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState<NoteCategory>("concept");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const filteredNotes = useMemo(
    () =>
      notes
        .filter((note) => {
          if (filter !== "all" && note.category !== filter) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              note.title.toLowerCase().includes(q) ||
              note.content.toLowerCase().includes(q)
            );
          }
          return true;
        })
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [notes, filter, search]
  );

  const handleAddNote = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formTitle.trim() || !formContent.trim() || submitting) return;

      setSubmitting(true);
      try {
        const { note } = await channelToolApi.addNote(
          channelId,
          formTitle.trim(),
          formContent.trim(),
          formCategory,
          userId,
          nickname
        );
        addNoteToStore(channelId, note);
        getCollabSocket().emit("tool:notes:add", { channelId, note });

        setFormTitle("");
        setFormContent("");
        setFormCategory("concept");
        setShowForm(false);
      } catch (err) {
        logger.error("Failed to add note:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [channelId, formTitle, formContent, formCategory, userId, nickname, submitting, addNoteToStore]
  );

  const handlePin = useCallback(
    async (note: ChannelNoteItem) => {
      try {
        const { note: updated } = await channelToolApi.pinNote(channelId, note.id);
        updateNoteInStore(channelId, updated);
        getCollabSocket().emit("tool:notes:pin", { channelId, note: updated });
      } catch (err) {
        logger.error("Failed to pin note:", err);
      }
    },
    [channelId, updateNoteInStore]
  );

  const handleDelete = useCallback(
    async (noteId: string) => {
      try {
        await channelToolApi.deleteNote(channelId, noteId);
        removeNoteFromStore(channelId, noteId);
        getCollabSocket().emit("tool:notes:delete", { channelId, noteId });
      } catch (err) {
        logger.error("Failed to delete note:", err);
      }
    },
    [channelId, removeNoteFromStore]
  );

  const startEdit = useCallback((note: ChannelNoteItem) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }, []);

  const handleSaveEdit = useCallback(
    async (noteId: string) => {
      if (!editTitle.trim() || !editContent.trim()) return;

      try {
        const { note: updated } = await channelToolApi.editNote(channelId, noteId, {
          title: editTitle.trim(),
          content: editContent.trim(),
        });
        updateNoteInStore(channelId, updated);
        getCollabSocket().emit("tool:notes:edit", { channelId, note: updated });
        cancelEdit();
      } catch (err) {
        logger.error("Failed to edit note:", err);
      }
    },
    [channelId, editTitle, editContent, updateNoteInStore, cancelEdit]
  );

  return {
    notes,
    filteredNotes,
    filter,
    setFilter,
    search,
    setSearch,
    showForm,
    setShowForm,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    formCategory,
    setFormCategory,
    submitting,
    editingId,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    handleAddNote,
    handlePin,
    handleDelete,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    userId,
  };
}

export type UseChannelNotesReturn = ReturnType<typeof useChannelNotes>;
