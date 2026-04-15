import { API_BASE } from "../config";
import { apiJson, setAccessToken, clearTokens } from "./fetchWithAuth";

const BASE = `${API_BASE}/api/auth`;

export interface AuthUser {
  id: string;
  email: string;
  profile: {
    nickname: string;
    avatar: string;
    department?: string;
    bio?: string;
  };
  friendCode: string;
  settings?: {
    theme: "dark" | "light";
    notifications: boolean;
    sound: boolean;
  };
}

// Backend envelope: { ok: true, user, token, expiresIn }.
// We type the full envelope so the `ok` flag is part of the contract and the
// shape is harder to drift away from accidentally.
export interface AuthResponse {
  ok: true;
  user: AuthUser;
  token: string;
  expiresIn: string;
  // refreshToken is in the HttpOnly cookie — never in the response body
}

interface OkUser { ok: true; user: AuthUser }
interface OkSimple { ok: true }

export const authApi = {
  async register(email: string, password: string, nickname: string, rememberMe = false): Promise<AuthResponse> {
    const result = await apiJson<AuthResponse>(`${BASE}/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, nickname, rememberMe }),
    });
    setAccessToken(result.token);
    return result;
  },

  async login(email: string, password: string, rememberMe = false): Promise<AuthResponse> {
    const result = await apiJson<AuthResponse>(`${BASE}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    });
    setAccessToken(result.token);
    return result;
  },

  me(): Promise<OkUser> {
    return apiJson<OkUser>(`${BASE}/me`);
  },

  changePassword(currentPassword: string, newPassword: string): Promise<OkSimple> {
    return apiJson<OkSimple>(`${BASE}/change-password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  deleteAccount(password: string): Promise<OkSimple> {
    return apiJson<OkSimple>(`${BASE}/delete-account`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  async logout(): Promise<void> {
    try {
      // Cookie-bound endpoint; uses raw fetch with credentials so the HttpOnly
      // refresh cookie is sent for server-side invalidation. apiJson would also
      // work but logout is best-effort and we don't want a 401-retry loop.
      await fetch(`${BASE}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch {
      // Best-effort
    }
    clearTokens();
  },
};
