import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock idGenerator ────────────────────────────────────────────────────────
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => `${prefix}-mock-${++idCounter}`,
}));

// ── Mock WorkspaceModel ─────────────────────────────────────────────────────
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockCreate = vi.fn();
const mockUpdateOne = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock("../../models/Workspace", () => ({
  WorkspaceModel: {
    findOne: (...args: any[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    create: (...args: any[]) => mockCreate(...args),
    updateOne: (...args: any[]) => mockUpdateOne(...args),
    deleteOne: (...args: any[]) => mockDeleteOne(...args),
  },
}));

import { workspaceService } from "../workspaceService";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeWsDoc(overrides: Record<string, any> = {}) {
  const base = {
    roomId: overrides.roomId ?? "room-1",
    deepDive: overrides.deepDive ?? { messages: [], savedInsights: [] },
    flashcards: overrides.flashcards ?? [],
    mindMapAnnotations: overrides.mindMapAnnotations ?? [],
    notes: overrides.notes ?? [],
    save: vi.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        roomId: this.roomId,
        deepDive: this.deepDive,
        flashcards: this.flashcards,
        mindMapAnnotations: this.mindMapAnnotations,
        notes: this.notes,
      };
    },
  };
  return { ...base, ...overrides, save: overrides.save ?? base.save, toObject: base.toObject };
}

function makeMessage(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "msg-1",
    role: "user" as const,
    text: "Hello",
    authorId: "user-1",
    authorNickname: "Alice",
    authorAvatar: "",
    timestamp: new Date().toISOString(),
    reactions: [] as any[],
    savedAsInsight: false,
    ...overrides,
  };
}

describe("workspaceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
  });

  // ── getWorkspace ──────────────────────────────────────────────────────

  describe("getWorkspace()", () => {
    it("returns existing workspace", async () => {
      const ws = makeWsDoc({ flashcards: [{ id: "fc-1", front: "Q", back: "A" }] });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.getWorkspace("room-1");

      expect(mockFindOne).toHaveBeenCalledWith({ roomId: "room-1" });
      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].id).toBe("fc-1");
    });

    it("creates new workspace if not found", async () => {
      mockFindOne.mockResolvedValue(null);
      const newWs = makeWsDoc();
      mockCreate.mockResolvedValue(newWs);

      const result = await workspaceService.getWorkspace("room-new");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "room-new",
          deepDive: { messages: [], savedInsights: [] },
          flashcards: [],
          notes: [],
        })
      );
      expect(result.deepDive.messages).toEqual([]);
    });
  });

  // ── addDeepDiveMessage ────────────────────────────────────────────────

  describe("addDeepDiveMessage()", () => {
    it("adds message with $push and caps at 500", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeWsDoc());

      const msg = makeMessage({ id: "msg-new" });
      await workspaceService.addDeepDiveMessage("room-1", msg);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { roomId: "room-1" },
        {
          $push: {
            "deepDive.messages": { $each: [msg], $slice: -500 },
          },
        },
        { upsert: true }
      );
    });
  });

  // ── addDeepDiveReaction ───────────────────────────────────────────────

  describe("addDeepDiveReaction()", () => {
    it("adds reaction when user has not reacted", async () => {
      const msg = makeMessage({ id: "msg-1", reactions: [] });
      const ws = makeWsDoc({ deepDive: { messages: [msg], savedInsights: [] } });
      mockFindOne.mockResolvedValue(ws);

      const reactions = await workspaceService.addDeepDiveReaction("room-1", "msg-1", "user-1");

      expect(reactions).toHaveLength(1);
      expect(reactions[0]).toEqual({ userId: "user-1", type: "helpful" });
      expect(ws.save).toHaveBeenCalled();
    });

    it("removes reaction when user already reacted (toggle off)", async () => {
      const msg = makeMessage({
        id: "msg-1",
        reactions: [{ userId: "user-1", type: "helpful" }],
      });
      const ws = makeWsDoc({ deepDive: { messages: [msg], savedInsights: [] } });
      mockFindOne.mockResolvedValue(ws);

      const reactions = await workspaceService.addDeepDiveReaction("room-1", "msg-1", "user-1");

      expect(reactions).toHaveLength(0);
      expect(ws.save).toHaveBeenCalled();
    });

    it("returns empty array if workspace not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const reactions = await workspaceService.addDeepDiveReaction("room-x", "msg-1", "user-1");

      expect(reactions).toEqual([]);
    });

    it("returns empty array if message not found", async () => {
      const ws = makeWsDoc({ deepDive: { messages: [], savedInsights: [] } });
      mockFindOne.mockResolvedValue(ws);

      const reactions = await workspaceService.addDeepDiveReaction("room-1", "nonexistent", "user-1");

      expect(reactions).toEqual([]);
    });
  });

  // ── saveInsight ───────────────────────────────────────────────────────

  describe("saveInsight()", () => {
    it("saves insight and marks message", async () => {
      const msg = makeMessage({ id: "msg-1", text: "Great insight" });
      const ws = makeWsDoc({
        deepDive: { messages: [msg], savedInsights: [] },
      });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.saveInsight(
        "room-1",
        "msg-1",
        "user-2",
        "Bob",
        ["tag1", "tag2"]
      );

      expect(result).not.toBeNull();
      expect(result!.text).toBe("Great insight");
      expect(result!.savedBy).toBe("user-2");
      expect(result!.savedByNickname).toBe("Bob");
      expect(result!.tags).toEqual(["tag1", "tag2"]);
      expect(result!.sourceMessageId).toBe("msg-1");
      expect(result!.id).toMatch(/^insight-/);
      expect(msg.savedAsInsight).toBe(true);
      expect(ws.save).toHaveBeenCalled();
    });

    it("returns null if workspace not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await workspaceService.saveInsight("room-x", "msg-1", "u", "U", []);

      expect(result).toBeNull();
    });

    it("returns null if message not found", async () => {
      const ws = makeWsDoc({ deepDive: { messages: [], savedInsights: [] } });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.saveInsight("room-1", "missing", "u", "U", []);

      expect(result).toBeNull();
    });
  });

  // ── addFlashcard ──────────────────────────────────────────────────────

  describe("addFlashcard()", () => {
    it("creates flashcard with generated ID and timestamp", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeWsDoc());

      const result = await workspaceService.addFlashcard("room-1", {
        front: "Q1",
        back: "A1",
        topicName: "Math",
        createdBy: "user-1",
        createdByNickname: "Alice",
        source: "manual",
      });

      expect(result.id).toMatch(/^fc-/);
      expect(result.front).toBe("Q1");
      expect(result.back).toBe("A1");
      expect(result.votes).toEqual([]);
      expect(result.createdAt).toBeDefined();
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { roomId: "room-1" },
        { $push: { flashcards: expect.objectContaining({ front: "Q1" }) } },
        { upsert: true }
      );
    });
  });

  // ── updateFlashcard ───────────────────────────────────────────────────

  describe("updateFlashcard()", () => {
    it("updates fields and sets editedBy", async () => {
      const card = {
        id: "fc-1",
        front: "Updated Q",
        back: "A1",
        topicName: "Math",
        editedBy: "user-2",
        editedByNickname: "Bob",
      };
      const ws = makeWsDoc({ flashcards: [card] });
      mockFindOneAndUpdate.mockResolvedValue(ws);

      const result = await workspaceService.updateFlashcard(
        "room-1",
        "fc-1",
        { front: "Updated Q" },
        "user-2",
        "Bob"
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { roomId: "room-1", "flashcards.id": "fc-1" },
        {
          $set: expect.objectContaining({
            "flashcards.$.editedBy": "user-2",
            "flashcards.$.editedByNickname": "Bob",
            "flashcards.$.front": "Updated Q",
          }),
        },
        { returnDocument: 'after' }
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("fc-1");
    });

    it("returns null when card not found", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const result = await workspaceService.updateFlashcard(
        "room-1",
        "nonexistent",
        { front: "X" },
        "user-1",
        "Alice"
      );

      expect(result).toBeNull();
    });
  });

  // ── deleteFlashcard ───────────────────────────────────────────────────

  describe("deleteFlashcard()", () => {
    it("removes flashcard and returns true", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await workspaceService.deleteFlashcard("room-1", "fc-1");

      expect(result).toBe(true);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { roomId: "room-1" },
        { $pull: { flashcards: { id: "fc-1" } } }
      );
    });

    it("returns false when flashcard not found", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });

      const result = await workspaceService.deleteFlashcard("room-1", "nonexistent");

      expect(result).toBe(false);
    });
  });

  // ── voteFlashcard ─────────────────────────────────────────────────────

  describe("voteFlashcard()", () => {
    it("adds new vote when user has not voted", async () => {
      const card = { id: "fc-1", votes: [] as any[] };
      const ws = makeWsDoc({ flashcards: [card] });
      mockFindOne.mockResolvedValue(ws);

      const votes = await workspaceService.voteFlashcard("room-1", "fc-1", "user-1", "up");

      expect(votes).toHaveLength(1);
      expect(votes[0]).toEqual({ userId: "user-1", vote: "up" });
      expect(ws.save).toHaveBeenCalled();
    });

    it("removes vote when same vote is cast again (toggle off)", async () => {
      const card = { id: "fc-1", votes: [{ userId: "user-1", vote: "up" }] };
      const ws = makeWsDoc({ flashcards: [card] });
      mockFindOne.mockResolvedValue(ws);

      const votes = await workspaceService.voteFlashcard("room-1", "fc-1", "user-1", "up");

      expect(votes).toHaveLength(0);
      expect(ws.save).toHaveBeenCalled();
    });

    it("changes vote when different vote is cast", async () => {
      const card = { id: "fc-1", votes: [{ userId: "user-1", vote: "up" }] };
      const ws = makeWsDoc({ flashcards: [card] });
      mockFindOne.mockResolvedValue(ws);

      const votes = await workspaceService.voteFlashcard("room-1", "fc-1", "user-1", "down");

      expect(votes).toHaveLength(1);
      expect(votes[0]).toEqual({ userId: "user-1", vote: "down" });
      expect(ws.save).toHaveBeenCalled();
    });

    it("returns empty array if workspace not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const votes = await workspaceService.voteFlashcard("room-x", "fc-1", "user-1", "up");

      expect(votes).toEqual([]);
    });

    it("returns empty array if card not found", async () => {
      const ws = makeWsDoc({ flashcards: [] });
      mockFindOne.mockResolvedValue(ws);

      const votes = await workspaceService.voteFlashcard("room-1", "nonexistent", "user-1", "up");

      expect(votes).toEqual([]);
    });
  });

  // ── addNote ───────────────────────────────────────────────────────────

  describe("addNote()", () => {
    it("creates note with generated ID, timestamp, and pinned=false", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeWsDoc());

      const result = await workspaceService.addNote("room-1", {
        title: "My Note",
        content: "Some content",
        category: "concept",
        authorId: "user-1",
        authorNickname: "Alice",
        authorAvatar: "",
      });

      expect(result.id).toMatch(/^note-/);
      expect(result.title).toBe("My Note");
      expect(result.content).toBe("Some content");
      expect(result.pinned).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { roomId: "room-1" },
        { $push: { notes: expect.objectContaining({ title: "My Note" }) } },
        { upsert: true }
      );
    });
  });

  // ── updateNote ────────────────────────────────────────────────────────

  describe("updateNote()", () => {
    it("updates note fields and sets editedBy", async () => {
      const note = {
        id: "note-1",
        title: "Updated Title",
        content: "Old",
        editedBy: "user-2",
        editedByNickname: "Bob",
      };
      const ws = makeWsDoc({ notes: [note] });
      mockFindOneAndUpdate.mockResolvedValue(ws);

      const result = await workspaceService.updateNote(
        "room-1",
        "note-1",
        { title: "Updated Title" },
        "user-2",
        "Bob"
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { roomId: "room-1", "notes.id": "note-1" },
        {
          $set: expect.objectContaining({
            "notes.$.editedBy": "user-2",
            "notes.$.editedByNickname": "Bob",
            "notes.$.title": "Updated Title",
          }),
        },
        { returnDocument: 'after' }
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("note-1");
    });

    it("returns null when note not found", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const result = await workspaceService.updateNote(
        "room-1",
        "nonexistent",
        { title: "X" },
        "user-1",
        "Alice"
      );

      expect(result).toBeNull();
    });
  });

  // ── deleteNote ────────────────────────────────────────────────────────

  describe("deleteNote()", () => {
    it("removes note and returns true", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await workspaceService.deleteNote("room-1", "note-1");

      expect(result).toBe(true);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { roomId: "room-1" },
        { $pull: { notes: { id: "note-1" } } }
      );
    });

    it("returns false when note not found", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });

      const result = await workspaceService.deleteNote("room-1", "nonexistent");

      expect(result).toBe(false);
    });
  });

  // ── toggleNotePin ─────────────────────────────────────────────────────

  describe("toggleNotePin()", () => {
    it("toggles pin from false to true", async () => {
      const note = { id: "note-1", pinned: false };
      const ws = makeWsDoc({ notes: [note] });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.toggleNotePin("room-1", "note-1");

      expect(result).toBe(true);
      expect(note.pinned).toBe(true);
      expect(ws.save).toHaveBeenCalled();
    });

    it("toggles pin from true to false", async () => {
      const note = { id: "note-1", pinned: true };
      const ws = makeWsDoc({ notes: [note] });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.toggleNotePin("room-1", "note-1");

      expect(result).toBe(false);
      expect(note.pinned).toBe(false);
      expect(ws.save).toHaveBeenCalled();
    });

    it("returns null if workspace not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await workspaceService.toggleNotePin("room-x", "note-1");

      expect(result).toBeNull();
    });

    it("returns null if note not found", async () => {
      const ws = makeWsDoc({ notes: [] });
      mockFindOne.mockResolvedValue(ws);

      const result = await workspaceService.toggleNotePin("room-1", "nonexistent");

      expect(result).toBeNull();
    });
  });
});
