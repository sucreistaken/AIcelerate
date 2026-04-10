import { Router } from "express";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, changePasswordSchema, deleteAccountSchema } from "../validators/authSchemas";

const router = Router();

router.post("/auth/register", rateLimiter("auth-register", 5, 60_000), validate(registerSchema), authController.register);
router.post("/auth/login", rateLimiter("auth-login", 10, 60_000), validate(loginSchema), authController.login);
router.post("/auth/refresh", rateLimiter("auth-refresh", 20, 60_000), authController.refresh);
router.post("/auth/logout", authController.logout);
router.post("/auth/logout-all", requireAuth, authController.logoutAll);
router.get("/auth/me", requireAuth, authController.me);
router.post("/auth/change-password", requireAuth, validate(changePasswordSchema), authController.changePassword);
router.post("/auth/delete-account", requireAuth, validate(deleteAccountSchema), authController.deleteAccount);

export default router;
