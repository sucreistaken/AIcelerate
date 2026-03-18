import { Router } from "express";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/auth/register", rateLimiter("auth-register", 5, 60_000), authController.register);
router.post("/auth/login", rateLimiter("auth-login", 10, 60_000), authController.login);
router.get("/auth/me", requireAuth, authController.me);
router.post("/auth/change-password", requireAuth, authController.changePassword);
router.post("/auth/delete-account", requireAuth, authController.deleteAccount);

export default router;
