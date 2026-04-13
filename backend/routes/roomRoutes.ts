import { Router } from "express";
import { roomController } from "../controllers/roomController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createRoomSchema, createSoloRoomSchema, updateRoomSchema, updateTopicSchema,
  joinByInviteSchema, kickSchema, transferOwnershipSchema, setMaterialSchema, addCategorySchema,
} from "../validators/roomSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

// --- Rooms ---
router.post("/rooms", requireAuth, validate(createRoomSchema), roomController.create);
router.post("/rooms/solo", requireAuth, validate(createSoloRoomSchema), roomController.createSolo);
router.get("/rooms/discover", requireAuth, roomController.discover);
router.get("/rooms/templates", requireAuth, roomController.getTemplates);
router.get("/rooms/invite/:code", requireAuth, roomController.getByInviteCode);
router.get("/rooms/user/:userId", requireAuth, roomController.getUserRooms);
router.post("/rooms/join-invite", requireAuth, validate(joinByInviteSchema), roomController.joinByInvite);

router.get("/rooms/:id", requireAuth, roomController.get);
router.patch("/rooms/:id", requireAuth, validate(updateRoomSchema), roomController.update);
router.patch("/rooms/:id/topic", requireAuth, validate(updateTopicSchema), roomController.updateTopic);
router.post("/rooms/:id/join", requireAuth, validate(emptyBodySchema), roomController.join);
router.post("/rooms/:id/leave", requireAuth, validate(emptyBodySchema), roomController.leave);
router.post("/rooms/:id/kick", requireAuth, validate(kickSchema), roomController.kick);
router.delete("/rooms/:id", requireAuth, validate(emptyBodySchema), roomController.delete);
router.post("/rooms/:id/archive", requireAuth, validate(emptyBodySchema), roomController.archive);
router.post("/rooms/:id/unarchive", requireAuth, validate(emptyBodySchema), roomController.unarchive);
router.post("/rooms/:id/transfer-ownership", requireAuth, validate(transferOwnershipSchema), roomController.transferOwnership);
router.post("/rooms/:id/material", requireAuth, validate(setMaterialSchema), roomController.setMaterial);
router.post("/rooms/:id/categories", requireAuth, validate(addCategorySchema), roomController.addCategory);
router.post("/rooms/:id/regenerate-invite", requireAuth, validate(emptyBodySchema), roomController.regenerateInvite);
router.get("/rooms/:id/members", requireAuth, roomController.getMembers);

export default router;
