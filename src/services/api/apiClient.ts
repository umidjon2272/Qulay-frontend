import { clearAuth, getTokens, updateTokens, type AuthTokens } from "./tokenStorage";
import type { AuthResponse } from "./types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const getApiErrorMessage = (error: unknown, fallback = "Server bilan bog'lanib bo'lmadi."): string => {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 400) return "Kiritilgan ma'lumotlarni tekshiring.";
  if (error.status === 401) return "Email yoki parol noto'g'ri.";
  if (error.status === 403) return "Akkauntingiz bloklangan yoki bu amal uchun ruxsatingiz yo'q.";
  if (error.status === 404) return "So'ralgan ma'lumot topilmadi.";
  if (error.status === 409) return "Bu email bilan akkaunt mavjud.";
  if (error.status >= 500) return "Serverda vaqtinchalik xatolik yuz berdi.";
  return fallback;
};

let refreshPromise: Promise<AuthTokens> | null = null;

const rawRequest = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : "API request failed";
      throw new ApiError(response.status, message, body);
    }
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Server response timeout");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

const refreshAccessToken = async (): Promise<AuthTokens> => {
  if (!refreshPromise) {
    const current = getTokens();
    if (!current?.refreshToken) return Promise.reject(new ApiError(401, "No refresh token"));
    refreshPromise = rawRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).then((response) => {
      const tokens = { accessToken: response.accessToken, refreshToken: response.refreshToken };
      updateTokens(tokens);
      return tokens;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

export const request = async <T>(path: string, options: RequestInit = {}, retry = true): Promise<T> => {
  const tokens = getTokens();
  try {
    return await rawRequest<T>(path, options, tokens?.accessToken);
  } catch (error) {
    const noRefreshEndpoint = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((endpoint) => path === endpoint);
    if (!(error instanceof ApiError) || error.status !== 401 || !retry || noRefreshEndpoint) throw error;
    try {
      const next = await refreshAccessToken();
      return await rawRequest<T>(path, options, next.accessToken);
    } catch (refreshError) {
      clearAuth();
      // Let AuthProvider/RequireAuth own the redirect. A hard location change
      // here caused a visible login flash during app bootstrap.
      if (typeof window !== "undefined") window.dispatchEvent(new Event("yechim_ai_auth_session_changed"));
      throw refreshError;
    }
  }
};

export const apiConfig = { baseUrl: API_URL };
