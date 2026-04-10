import { Router } from "express";
import { profileController } from "../controllers/profileController";
import { serverController } from "../controllers/serverController";
import { channelController } from "../controllers/channelController";
import { messageController as msgController } from "../controllers/messageController";
import { channelToolController } from "../controllers/channelToolController";
import { exportController } from "../controllers/exportController";
import { rateLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createProfileSchema, updateProfileSchema, setStatusSchema, friendRequestSchema, friendActionSchema } from "../validators/profileSchemas";
import { createServerSchema, updateServerSchema, joinByInviteSchema as serverJoinInviteSchema, kickSchema as serverKickSchema, addCategorySchema as serverAddCatSchema } from "../validators/serverSchemas";
import { createChannelSchema, updateChannelSchema } from "../validators/channelSchemas";
import { sendMessageSchema, editMessageSchema, reactMessageSchema, pinMessageSchema, sendLobbyMessageSchema } from "../validators/messageSchemas";

const router = Router();

// --- Profiles ---
router.post("/profiles", requireAuth, validate(createProfileSchema), profileController.create);
router.get("/profiles/:id", profileController.get);
router.patch("/profiles/:id", requireAuth, validate(updateProfileSchema), profileController.update);
router.patch("/profiles/:id/status", requireAuth, validate(setStatusSchema), profileController.setStatus);
router.post("/profiles/:id/friend-request", requireAuth, validate(friendRequestSchema), profileController.sendFriendRequest);
router.post("/profiles/:id/friend-accept", requireAuth, validate(friendActionSchema), profileController.acceptFriendRequest);
router.post("/profiles/:id/friend-reject", requireAuth, validate(friendActionSchema), profileController.rejectFriendRequest);
router.delete("/profiles/:id/friends/:friendId", requireAuth, profileController.removeFriend);
router.get("/profiles/:id/friends", requireAuth, profileController.getFriends);

// --- Servers ---
router.post("/servers", requireAuth, validate(createServerSchema), serverController.create);
router.get("/servers/discover", serverController.discover);
router.get("/servers/templates", serverController.getTemplates);
router.get("/servers/invite/:code", serverController.getByInviteCode);
router.get("/servers/user/:userId", requireAuth, serverController.getUserServers);
router.post("/servers/join-invite", requireAuth, validate(serverJoinInviteSchema), serverController.joinByInvite);

router.get("/servers/:id", serverController.get);
router.patch("/servers/:id", requireAuth, validate(updateServerSchema), serverController.update);
router.post("/servers/:id/join", requireAuth, serverController.join);
router.post("/servers/:id/leave", requireAuth, serverController.leave);
router.post("/servers/:id/kick", requireAuth, validate(serverKickSchema), serverController.kick);
router.delete("/servers/:id", requireAuth, serverController.delete);
router.post("/servers/:id/categories", requireAuth, validate(serverAddCatSchema), serverController.addCategory);
router.post("/servers/:id/regenerate-invite", requireAuth, serverController.regenerateInvite);
router.get("/servers/:id/members", serverController.getMembers);

// --- Channels ---
router.post("/servers/:serverId/channels", requireAuth, validate(createChannelSchema), channelController.create);
router.get("/servers/:serverId/channels", channelController.getByServer);
router.get("/servers/:serverId/channels/:channelId", channelController.get);
router.patch("/servers/:serverId/channels/:channelId", requireAuth, validate(updateChannelSchema), channelController.update);
router.delete("/servers/:serverId/channels/:channelId", requireAuth, channelController.delete);

// --- Lobby ---
router.get("/lobby/messages", msgController.getLobbyMessages);
router.post("/lobby/messages", requireAuth, rateLimiter("lobby", 20, 60000), validate(sendLobbyMessageSchema), msgController.sendLobbyMessage);

// --- Messages ---
router.post("/channels/:channelId/messages", requireAuth, rateLimiter("messages", 30, 60000), validate(sendMessageSchema), msgController.send);
router.get("/channels/:channelId/messages", msgController.getMessages);
router.get("/channels/:channelId/threads/:threadId", msgController.getThread);
router.patch("/channels/:channelId/messages/:messageId", requireAuth, validate(editMessageSchema), msgController.edit);
router.delete("/channels/:channelId/messages/:messageId", requireAuth, msgController.delete);
router.post("/channels/:channelId/messages/:messageId/react", requireAuth, validate(reactMessageSchema), msgController.react);
router.post("/channels/:channelId/messages/:messageId/pin", requireAuth, validate(pinMessageSchema), msgController.pin);

// --- Lessons (for material linking) ---
router.get("/lessons", channelToolController.getLessons);

// --- Channel Lesson Linking ---
router.post("/channels/:channelId/link-lesson", requireAuth, channelToolController.linkLesson);
router.delete("/channels/:channelId/link-lesson", requireAuth, channelToolController.unlinkLesson);
router.get("/channels/:channelId/lesson-context", channelToolController.getLessonContext);
router.get("/channels/:channelId/lesson-detail", channelToolController.getLessonDetail);

// --- Channel Tools ---
router.get("/channels/:channelId/tool-data", channelToolController.getToolData);
router.post("/channels/:channelId/tool/quiz/generate", requireAuth, channelToolController.generateQuiz);
router.post("/channels/:channelId/tool/quiz/answer", requireAuth, channelToolController.answerQuiz);
router.post("/channels/:channelId/tool/flashcards/add", requireAuth, channelToolController.addFlashcard);
router.post("/channels/:channelId/tool/flashcards/generate", requireAuth, channelToolController.generateFlashcards);
router.post("/channels/:channelId/tool/flashcards/extract", requireAuth, channelToolController.extractFlashcards);
router.post("/channels/:channelId/tool/flashcards/review", requireAuth, channelToolController.reviewFlashcard);
router.post("/channels/:channelId/tool/deep-dive/chat", requireAuth, channelToolController.deepDiveChat);
router.post("/channels/:channelId/tool/mind-map/generate", requireAuth, channelToolController.generateMindMap);
router.post("/channels/:channelId/tool/sprint/start", requireAuth, channelToolController.startSprint);
router.post("/channels/:channelId/tool/sprint/status", requireAuth, channelToolController.updateSprintStatus);
router.post("/channels/:channelId/tool/notes/add", requireAuth, channelToolController.addNote);
router.patch("/channels/:channelId/tool/notes/:noteId", requireAuth, channelToolController.editNote);
router.delete("/channels/:channelId/tool/notes/:noteId", requireAuth, channelToolController.deleteNote);
router.post("/channels/:channelId/tool/notes/:noteId/pin", requireAuth, channelToolController.pinNote);

// --- Lock ---
router.post("/channels/:channelId/tool/lock", requireAuth, channelToolController.lockTool);
router.post("/channels/:channelId/tool/unlock", requireAuth, channelToolController.unlockTool);

// --- Export ---
router.get("/channels/:channelId/export/quiz", exportController.exportQuiz);
router.get("/channels/:channelId/export/flashcards", exportController.exportFlashcards);
router.get("/channels/:channelId/export/notes", exportController.exportNotes);
router.get("/channels/:channelId/export/mind-map", exportController.exportMindMap);
router.get("/channels/:channelId/export/all", exportController.exportAll);

export default router;
