// admin/services/adminApi.ts — Admin API client
// Routes through the shared apiFetch wrapper so admin inherits the same
// Bearer + HttpOnly refresh cookie flow as the main app (single auth layer).
import toast from "react-hot-toast";
import { API_BASE } from "../../config";
import { apiFetch } from "../../services/fetchWithAuth";

const ADMIN_BASE = `${API_BASE}/api/admin`;

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${ADMIN_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = body.error || res.statusText;
    toast.error(message);
    throw new Error(message);
  }
  return res.json();
}

export const adminApi = {
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const res = await apiFetch(buildUrl(endpoint, params), { method: "GET" });
    return handleResponse<T>(res);
  },

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await apiFetch(buildUrl(endpoint), {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await apiFetch(buildUrl(endpoint), {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async del<T>(endpoint: string): Promise<T> {
    const res = await apiFetch(buildUrl(endpoint), { method: "DELETE" });
    return handleResponse<T>(res);
  },
};
