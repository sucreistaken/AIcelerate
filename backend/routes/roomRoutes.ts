import { Router } from "express";
import { roomController } from "../controllers/roomController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createRoomSchema, createSoloRoomSchema, updateRoomSchema, updateTopicSchema,
  joinByInviteSchema, kickSchema, transferOwnershipSchema, setMaterialSchema, addCategorySchema,
} from "../validators/roomSchemas";

const router = Router();

// --- Rooms ---
router.post("/rooms", requireAuth, validate(createRoomSchema), roomController.create);
router.post("/rooms/solo", requireAuth, validate(createSoloRoomSchema), roomController.createSolo);
router.get("/rooms/discover", roomController.discover);
router.get("/rooms/templates", roomController.getTemplates);
router.get("/rooms/invite/:code", roomController.getByInviteCode);
router.get("/rooms/user/:userId", requireAuth, roomController.getUserRooms);
router.post("/rooms/join-invite", requireAuth, validate(joinByInviteSchema), roomController.joinByInvite);

router.get("/rooms/:id", roomController.get);
router.patch("/rooms/:id", requireAuth, validate(updateRoomSchema), roomController.update);
router.patch("/rooms/:id/topic", requireAuth, validate(updateTopicSchema), roomController.updateTopic);
router.post("/rooms/:id/join", requireAuth, roomController.join);
router.post("/rooms/:id/leave", requireAuth, roomController.leave);
router.post("/rooms/:id/kick", requireAuth, validate(kickSchema), roomController.kick);
router.delete("/rooms/:id", requireAuth, roomController.delete);
router.post("/rooms/:id/archive", requireAuth, roomController.archive);
router.post("/rooms/:id/unarchive", requireAuth, roomController.unarchive);
router.post("/rooms/:id/transfer-ownership", requireAuth, validate(transferOwnershipSchema), roomController.transferOwnership);
router.post("/rooms/:id/material", requireAuth, validate(setMaterialSchema), roomController.setMaterial);
router.post("/rooms/:id/categories", requireAuth, validate(addCategorySchema), roomController.addCategory);
router.post("/rooms/:id/regenerate-invite", requireAuth, roomController.regenerateInvite);
router.get("/rooms/:id/members", roomController.getMembers);

export default router;
