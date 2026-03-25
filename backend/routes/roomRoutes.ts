import { Router } from "express";
import { roomController } from "../controllers/roomController";

const router = Router();

// --- Rooms ---
router.post("/rooms", roomController.create);
router.post("/rooms/solo", roomController.createSolo);
router.get("/rooms/discover", roomController.discover);
router.get("/rooms/templates", roomController.getTemplates);
router.get("/rooms/invite/:code", roomController.getByInviteCode);
router.get("/rooms/user/:userId", roomController.getUserRooms);
router.post("/rooms/join-invite", roomController.joinByInvite);

router.get("/rooms/:id", roomController.get);
router.patch("/rooms/:id", roomController.update);
router.patch("/rooms/:id/topic", roomController.updateTopic);
router.post("/rooms/:id/join", roomController.join);
router.post("/rooms/:id/leave", roomController.leave);
router.post("/rooms/:id/kick", roomController.kick);
router.delete("/rooms/:id", roomController.delete);
router.post("/rooms/:id/archive", roomController.archive);
router.post("/rooms/:id/unarchive", roomController.unarchive);
router.post("/rooms/:id/transfer-ownership", roomController.transferOwnership);
router.post("/rooms/:id/material", roomController.setMaterial);
router.post("/rooms/:id/categories", roomController.addCategory);
router.post("/rooms/:id/regenerate-invite", roomController.regenerateInvite);
router.get("/rooms/:id/members", roomController.getMembers);

export default router;
