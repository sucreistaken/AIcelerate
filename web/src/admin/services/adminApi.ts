// admin/services/adminApi.ts — Admin API client
import toast from "react-hot-toast";
import { API_BASE } from "../../config";

const ADMIN_BASE = `${API_BASE}/api/admin`;

function getToken(): string | null {
  return localStorage.getItem("lc_token");
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

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
    const url = buildUrl(endpoint, params);
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
    });
    return handleResponse<T>(res);
  },

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = buildUrl(endpoint);
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = buildUrl(endpoint);
    const res = await fetch(url, {
      method: "PATCH",
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async del<T>(endpoint: string): Promise<T> {
    const url = buildUrl(endpoint);
    const res = await fetch(url, {
      method: "DELETE",
      headers: buildHeaders(),
    });
    return handleResponse<T>(res);
  },
};
