import { Router } from "express";
import { profileController } from "../controllers/profileController";
import { roomController } from "../controllers/roomController";
import { channelController } from "../controllers/channelController";
import { messageController } from "../controllers/messageController";
import { channelToolController } from "../controllers/channelToolController";
import { exportController } from "../controllers/exportController";
import { rateLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createProfileSchema, updateProfileSchema, setStatusSchema, friendRequestSchema, friendActionSchema } from "../validators/profileSchemas";
import { createServerSchema, updateServerSchema, joinByInviteSchema as serverJoinInviteSchema, kickSchema as serverKickSchema, addCategorySchema as serverAddCatSchema } from "../validators/serverSchemas";
import { createChannelSchema, updateChannelSchema, linkLessonSchema, unlinkLessonSchema } from "../validators/channelSchemas";
import { sendMessageSchema, editMessageSchema, reactMessageSchema, pinMessageSchema, sendLobbyMessageSchema } from "../validators/messageSchemas";
import {
  toolQuizGenerateSchema, toolQuizAnswerSchema, toolFlashcardAddSchema, toolFlashcardGenerateSchema,
  toolFlashcardExtractSchema, toolFlashcardReviewSchema, toolDeepDiveChatSchema, toolMindMapGenerateSchema,
  toolSprintStartSchema, toolSprintStatusSchema, toolNoteAddSchema, toolNoteEditSchema, toolLockSchema,
} from "../validators/channelToolSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

// --- Profiles ---
router.post("/profiles", requireAuth, validate(createProfileSchema), profileController.create);
router.get("/profiles/:id", requireAuth, profileController.get);
router.patch("/profiles/:id", requireAuth, validate(updateProfileSchema), profileController.update);
router.patch("/profiles/:id/status", requireAuth, validate(setStatusSchema), profileController.setStatus);
router.post("/profiles/:id/friend-request", requireAuth, validate(friendRequestSchema), profileController.sendFriendRequest);
router.post("/profiles/:id/friend-accept", requireAuth, validate(friendActionSchema), profileController.acceptFriendRequest);
router.post("/profiles/:id/friend-reject", requireAuth, validate(friendActionSchema), profileController.rejectFriendRequest);
router.delete("/profiles/:id/friends/:friendId", requireAuth, validate(emptyBodySchema), profileController.removeFriend);
router.get("/profiles/:id/friends", requireAuth, profileController.getFriends);

// --- Servers ---
router.post("/servers", requireAuth, validate(createServerSchema), roomController.create);
router.get("/servers/discover", requireAuth, roomController.discover);
router.get("/servers/templates", requireAuth, roomController.getTemplates);
router.get("/servers/invite/:code", requireAuth, roomController.getByInviteCode);
router.get("/servers/user/:userId", requireAuth, roomController.getUserServers);
router.post("/servers/join-invite", requireAuth, validate(serverJoinInviteSchema), roomController.joinByInvite);

router.get("/servers/:id", requireAuth, roomController.get);
router.patch("/servers/:id", requireAuth, validate(updateServerSchema), roomController.update);
router.post("/servers/:id/join", requireAuth, validate(emptyBodySchema), roomController.join);
router.post("/servers/:id/leave", requireAuth, validate(emptyBodySchema), roomController.leave);
router.post("/servers/:id/kick", requireAuth, validate(serverKickSchema), roomController.kick);
router.delete("/servers/:id", requireAuth, validate(emptyBodySchema), roomController.delete);
router.post("/servers/:id/categories", requireAuth, validate(serverAddCatSchema), roomController.addCategory);
router.post("/servers/:id/regenerate-invite", requireAuth, validate(emptyBodySchema), roomController.regenerateInvite);
router.get("/servers/:id/members", requireAuth, roomController.getMembers);

// --- Channels ---
router.post("/servers/:serverId/channels", requireAuth, validate(createChannelSchema), channelController.create);
router.get("/servers/:serverId/channels", requireAuth, channelController.getByServer);
router.get("/servers/:serverId/channels/:channelId", requireAuth, channelController.get);
router.patch("/servers/:serverId/channels/:channelId", requireAuth, validate(updateChannelSchema), channelController.update);
router.delete("/servers/:serverId/channels/:channelId", requireAuth, validate(emptyBodySchema), channelController.delete);

// --- Lobby ---
router.get("/lobby/messages", requireAuth, messageController.getLobbyMessages);
router.post("/lobby/messages", requireAuth, rateLimiter("lobby", 20, 60000), validate(sendLobbyMessageSchema), messageController.sendLobbyMessage);

// --- Messages ---
router.post("/channels/:channelId/messages", requireAuth, rateLimiter("messages", 30, 60000), validate(sendMessageSchema), messageController.send);
router.get("/channels/:channelId/messages", requireAuth, messageController.getMessages);
router.get("/channels/:channelId/threads/:threadId", requireAuth, messageController.getThread);
router.patch("/channels/:channelId/messages/:messageId", requireAuth, validate(editMessageSchema), messageController.edit);
router.delete("/channels/:channelId/messages/:messageId", requireAuth, validate(emptyBodySchema), messageController.delete);
router.post("/channels/:channelId/messages/:messageId/react", requireAuth, validate(reactMessageSchema), messageController.react);
router.post("/channels/:channelId/messages/:messageId/pin", requireAuth, validate(pinMessageSchema), messageController.pin);

// --- Lessons (for material linking) ---
router.get("/lessons", requireAuth, channelToolController.getLessons);

// --- Channel Lesson Linking ---
router.post("/channels/:channelId/link-lesson", requireAuth, validate(linkLessonSchema), channelToolController.linkLesson);
router.delete("/channels/:channelId/link-lesson", requireAuth, validate(unlinkLessonSchema), channelToolController.unlinkLesson);
router.get("/channels/:channelId/lesson-context", requireAuth, channelToolController.getLessonContext);
router.get("/channels/:channelId/lesson-detail", requireAuth, channelToolController.getLessonDetail);

// --- Channel Tools ---
const toolAiLimit = rateLimiter("tool-ai", 10, 60_000);      // AI generation: 10/min
const toolWriteLimit = rateLimiter("tool-write", 30, 60_000); // Non-AI writes: 30/min

router.get("/channels/:channelId/tool-data", requireAuth, channelToolController.getToolData);
router.post("/channels/:channelId/tool/quiz/generate", requireAuth, toolAiLimit, validate(toolQuizGenerateSchema), channelToolController.generateQuiz);
router.post("/channels/:channelId/tool/quiz/answer", requireAuth, toolWriteLimit, validate(toolQuizAnswerSchema), channelToolController.answerQuiz);
router.post("/channels/:channelId/tool/flashcards/add", requireAuth, toolWriteLimit, validate(toolFlashcardAddSchema), channelToolController.addFlashcard);
router.post("/channels/:channelId/tool/flashcards/generate", requireAuth, toolAiLimit, validate(toolFlashcardGenerateSchema), channelToolController.generateFlashcards);
router.post("/channels/:channelId/tool/flashcards/extract", requireAuth, toolAiLimit, validate(toolFlashcardExtractSchema), channelToolController.extractFlashcards);
router.post("/channels/:channelId/tool/flashcards/review", requireAuth, toolWriteLimit, validate(toolFlashcardReviewSchema), channelToolController.reviewFlashcard);
router.post("/channels/:channelId/tool/deep-dive/chat", requireAuth, toolAiLimit, validate(toolDeepDiveChatSchema), channelToolController.deepDiveChat);
router.post("/channels/:channelId/tool/mind-map/generate", requireAuth, toolAiLimit, validate(toolMindMapGenerateSchema), channelToolController.generateMindMap);
router.post("/channels/:channelId/tool/sprint/start", requireAuth, toolWriteLimit, validate(toolSprintStartSchema), channelToolController.startSprint);
router.post("/channels/:channelId/tool/sprint/status", requireAuth, toolWriteLimit, validate(toolSprintStatusSchema), channelToolController.updateSprintStatus);
router.post("/channels/:channelId/tool/notes/add", requireAuth, toolWriteLimit, validate(toolNoteAddSchema), channelToolController.addNote);
router.patch("/channels/:channelId/tool/notes/:noteId", requireAuth, toolWriteLimit, validate(toolNoteEditSchema), channelToolController.editNote);
router.delete("/channels/:channelId/tool/notes/:noteId", requireAuth, toolWriteLimit, validate(emptyBodySchema), channelToolController.deleteNote);
router.post("/channels/:channelId/tool/notes/:noteId/pin", requireAuth, toolWriteLimit, validate(emptyBodySchema), channelToolController.pinNote);

// --- Lock ---
router.post("/channels/:channelId/tool/lock", requireAuth, toolWriteLimit, validate(toolLockSchema), channelToolController.lockTool);
router.post("/channels/:channelId/tool/unlock", requireAuth, toolWriteLimit, validate(toolLockSchema), channelToolController.unlockTool);

// --- Export ---
router.get("/channels/:channelId/export/quiz", requireAuth, exportController.exportQuiz);
router.get("/channels/:channelId/export/flashcards", requireAuth, exportController.exportFlashcards);
router.get("/channels/:channelId/export/notes", requireAuth, exportController.exportNotes);
router.get("/channels/:channelId/export/mind-map", requireAuth, exportController.exportMindMap);
router.get("/channels/:channelId/export/all", requireAuth, exportController.exportAll);

export default router;
