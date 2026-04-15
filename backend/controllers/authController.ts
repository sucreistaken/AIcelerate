import { Response } from "express";
import { authService } from "../services/authService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest } from "../middleware/errorHandler";
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from "../utils/cookies";

export const authController = {
  register: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, nickname, rememberMe } = req.body;
    if (!email || !password || !nickname) throw badRequest("email, password, and nickname are required");
    const result = await authService.register(email, password, nickname, Boolean(rememberMe));

    setRefreshTokenCookie(res, result.refreshToken, result.rememberMe);
    const { refreshToken: _rt, ...safeResult } = result;
    res.status(201).json({ ok: true, ...safeResult });
  }),

  login: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) throw badRequest("email and password are required");
    const result = await authService.login(email, password, Boolean(rememberMe));

    setRefreshTokenCookie(res, result.refreshToken, result.rememberMe);
    const { refreshToken: _rt, ...safeResult } = result;
    res.json({ ok: true, ...safeResult });
  }),

  refresh: asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;
    if (!refreshToken) throw badRequest("Refresh token required");

    const result = await authService.refreshToken(refreshToken);

    // Preserve rememberMe across token rotation
    setRefreshTokenCookie(res, result.refreshToken, result.rememberMe);
    const { refreshToken: _rt, ...safeResult } = result;
    res.json({ ok: true, ...safeResult });
  }),

  logout: asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearRefreshTokenCookie(res);
    res.json({ ok: true });
  }),

  logoutAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.logoutAll(req.user!.userId);
    clearRefreshTokenCookie(res);
    res.json({ ok: true });
  }),

  me: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getUser(req.user!.userId);
    res.json({ ok: true, user });
  }),

  changePassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw badRequest("currentPassword and newPassword are required");
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ ok: true });
  }),

  deleteAccount: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    if (!password) throw badRequest("password is required");
    await authService.deleteAccount(req.user!.userId, password);
    clearRefreshTokenCookie(res);
    res.json({ ok: true });
  }),
};
