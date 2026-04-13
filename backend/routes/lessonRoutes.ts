import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { lessonController } from "../controllers/lessonControllers";
import { upsertLessonSchema, progressSchema } from "../validators/lessonSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

router.get("/lessons", requireAuth, lessonController.list);
router.get("/lessons/:id", requireAuth, lessonController.getById);
router.post("/lessons", requireAuth, validate(upsertLessonSchema), lessonController.create);
router.patch("/lessons/:id/progress", requireAuth, validate(progressSchema), lessonController.updateProgress);
router.delete("/lessons/:id", requireAuth, validate(emptyBodySchema), lessonController.remove);
router.get("/memory", requireAuth, lessonController.getMemory);
router.get("/lessons/:id/modules", requireAuth, lessonController.getModules);

export default router;
