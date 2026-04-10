import { API_BASE } from "../config";
import { fetchWithAuth, setAccessToken, clearTokens } from "./fetchWithAuth";

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

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: string;
  // refreshToken is NOT in the response body — it's in the HttpOnly cookie
}

export const authApi = {
  async register(email: string, password: string, nickname: string) {
    const result = await fetchWithAuth<AuthResponse>(`${BASE}/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
    setAccessToken(result.token);
    return result;
  },

  async login(email: string, password: string) {
    const result = await fetchWithAuth<AuthResponse>(`${BASE}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(result.token);
    return result;
  },

  me() {
    return fetchWithAuth<{ user: AuthUser }>(`${BASE}/me`);
  },

  changePassword(currentPassword: string, newPassword: string) {
    return fetchWithAuth<{ ok: boolean }>(`${BASE}/change-password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  deleteAccount(password: string) {
    return fetchWithAuth<{ ok: boolean }>(`${BASE}/delete-account`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  async logout() {
    try {
      await fetch(`${BASE}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Send the HttpOnly cookie for server-side invalidation
        body: JSON.stringify({}),
      });
    } catch {
      // Best-effort
    }
    clearTokens();
  },
};
