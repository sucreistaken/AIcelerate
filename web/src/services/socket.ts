import { logger } from "../utils/logger";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "../config";
import { getAccessToken, refreshAccessToken } from "./fetchWithAuth";
import { isTokenNearExpiry } from "../utils/jwt";

let collabSocket: Socket | null = null;
let _authenticatedUserId: string | null = null;
let _authInProgress = false;

// ── Token helpers ──────────────────────────────────────────────────────────────

/**
 * Get a valid access token — refresh if expired.
 * Returns null only if no refresh token is available (truly logged out).
 */
async function getFreshToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isTokenNearExpiry(token)) return token;

  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}

// ── Socket auth with retry ─────────────────────────────────────────────────────

async function authenticateSocket(socket: Socket): Promise<any> {
  if (_authInProgress) return;
  _authInProgress = true;

  try {
    const token = await getFreshToken();
    if (!token) {
      logger.error("Socket auth: no valid token available");
      _authInProgress = false;
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Socket auth timeout"));
      }, 10_000);

      socket.emit("auth", { token }, (response: any) => {
        clearTimeout(timeout);
        if (response.ok) {
          resolve(response.profile);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  } finally {
    _authInProgress = false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getCollabSocket(): Socket {
  if (!collabSocket) {
    // Auth is performed post-connect via `authenticateSocket()` (see connectCollab)
    // because the backend validates the JWT on an 'auth' event, not handshake.auth.
    collabSocket = io(`${API_BASE}/collab`, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.3,
      timeout: 20_000,
    });

    // Re-authenticate with fresh token on every reconnect
    collabSocket.on("connect", async () => {
      if (_authenticatedUserId) {
        try {
          await authenticateSocket(collabSocket!);
        } catch (err: any) {
          logger.error("Re-auth failed after reconnect:", err.message);
        }
      }
    });

    // Log connection events for debugging
    collabSocket.on("connect_error", (err) => {
      logger.error("Socket connect error:", err.message);
    });

    collabSocket.on("disconnect", (reason) => {
      logger.warn("Socket disconnected:", reason);
      // If server-initiated disconnect, manually reconnect
      if (reason === "io server disconnect") {
        collabSocket?.connect();
      }
    });
  }
  return collabSocket;
}

export async function connectCollab(userId: string): Promise<any> {
  const socket = getCollabSocket();
  _authenticatedUserId = userId;

  if (!socket.connected) {
    socket.connect();
  }

  // Wait for connection if not yet connected
  if (!socket.connected) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 15_000);
      socket.once("connect", () => { clearTimeout(timeout); resolve(); });
      socket.once("connect_error", (err) => { clearTimeout(timeout); reject(err); });
    });
  }

  return authenticateSocket(socket);
}

export function disconnectCollab(): void {
  _authenticatedUserId = null;
  if (collabSocket) {
    collabSocket.disconnect();
    collabSocket = null;
  }
}

export function getAuthenticatedUserId(): string | null {
  return _authenticatedUserId;
}
