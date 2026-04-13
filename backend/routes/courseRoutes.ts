import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import { courseController } from "../controllers/courseController";
import { createCourseSchema, updateCourseSchema, courseChatSchema, studyScheduleSchema } from "../validators/courseSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

router.get("/courses", requireAuth, courseController.list);
router.get("/courses/:id", requireAuth, courseController.getById);
router.post("/courses", requireAuth, validate(createCourseSchema), courseController.create);
router.patch("/courses/:id", requireAuth, validate(updateCourseSchema), courseController.update);
router.delete("/courses/:id", requireAuth, validate(emptyBodySchema), courseController.remove);

router.post("/courses/:id/lessons/:lessonId", requireAuth, validate(emptyBodySchema), courseController.addLesson);
router.delete("/courses/:id/lessons/:lessonId", requireAuth, validate(emptyBodySchema), courseController.removeLesson);
router.get("/courses/:id/lessons", requireAuth, courseController.getLessons);

router.post("/courses/:id/rebuild-index", requireAuth, validate(emptyBodySchema), courseController.rebuildIndex);
router.get("/courses/:id/knowledge-index", requireAuth, courseController.getKnowledgeIndex);
router.post("/courses/:id/chat", requireAuth, rateLimiter("ai:course-chat", 15, 60_000), validate(courseChatSchema), courseController.chat);
router.get("/courses/:id/progress", requireAuth, courseController.getProgress);
router.post("/courses/:id/study-schedule", requireAuth, validate(studyScheduleSchema), courseController.studySchedule);
router.get("/courses/:id/export", requireAuth, courseController.exportData);

export default router;
