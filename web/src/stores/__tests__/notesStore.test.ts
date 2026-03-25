import { describe, it, expect, beforeEach } from "vitest";
import { useNotesStore } from "../notesStore";

describe("notesStore", () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: [], searchQuery: "", selectedTags: [] });
  });

  it("starts with empty notes", () => {
    expect(useNotesStore.getState().notes).toEqual([]);
  });

  it("addNote creates a note with required fields", () => {
    useNotesStore.getState().addNote("Test note", "manual");

    const notes = useNotesStore.getState().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Test note");
    expect(notes[0].source).toBe("manual");
    expect(notes[0].id).toBeDefined();
    expect(notes[0].createdAt).toBeDefined();
    expect(notes[0].pinned).toBe(false);
    expect(notes[0].tags).toEqual([]);
  });

  it("removeNote deletes by id", () => {
    const store = useNotesStore.getState();
    store.addNote("Note 1", "manual");
    store.addNote("Note 2", "manual");

    const notes = useNotesStore.getState().notes;
    expect(notes).toHaveLength(2);

    // Notes are prepended (newest first), so notes[0] is "Note 2"
    useNotesStore.getState().removeNote(notes[0].id);
    const remaining = useNotesStore.getState().notes;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].content).toBe("Note 1");
  });

  it("togglePin flips pinned state", () => {
    useNotesStore.getState().addNote("Pin me", "manual");
    const id = useNotesStore.getState().notes[0].id;
    expect(useNotesStore.getState().notes[0].pinned).toBe(false);

    useNotesStore.getState().togglePin(id);
    expect(useNotesStore.getState().notes[0].pinned).toBe(true);

    useNotesStore.getState().togglePin(id);
    expect(useNotesStore.getState().notes[0].pinned).toBe(false);
  });

  it("addTag adds to note", () => {
    useNotesStore.getState().addNote("Tagged", "manual");
    const id = useNotesStore.getState().notes[0].id;

    useNotesStore.getState().addTag(id, "important");
    expect(useNotesStore.getState().notes[0].tags).toContain("important");
  });

  it("removeTag removes from note", () => {
    useNotesStore.getState().addNote("Tagged", "manual");
    const id = useNotesStore.getState().notes[0].id;

    useNotesStore.getState().addTag(id, "important");
    useNotesStore.getState().addTag(id, "review");
    useNotesStore.getState().removeTag(id, "important");

    const tags = useNotesStore.getState().notes[0].tags;
    expect(tags).not.toContain("important");
    expect(tags).toContain("review");
  });

  it("setSearchQuery updates search state", () => {
    useNotesStore.getState().setSearchQuery("test");
    expect(useNotesStore.getState().searchQuery).toBe("test");
  });

  it("getAllTags returns unique tags", () => {
    const store = useNotesStore.getState();
    store.addNote("A", "manual");
    store.addNote("B", "manual");
    const notes = useNotesStore.getState().notes;
    useNotesStore.getState().addTag(notes[0].id, "tag1");
    useNotesStore.getState().addTag(notes[0].id, "tag2");
    useNotesStore.getState().addTag(notes[1].id, "tag1");

    const tags = useNotesStore.getState().getAllTags();
    expect(tags).toContain("tag1");
    expect(tags).toContain("tag2");
    expect(tags).toHaveLength(2);
  });
});
