import { removeStorage, readStorage, writeStorage } from "../storage";
import type { User } from "./types";

export type AuthTokens = { accessToken: string; refreshToken: string };

const decodeJwtPayload = (token: string): { exp?: unknown } | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(decoded) as { exp?: unknown };
  } catch {
    // Opaque tokens are still sent to the backend and remain fully secured there.
    return null;
  }
};

export const isAccessTokenExpiringSoon = (token: string, leewaySeconds = 30): boolean => {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && exp * 1000 <= Date.now() + leewaySeconds * 1000;
};

const tokenKey = "yechim_ai_auth_tokens";
const userKey = "yechim_ai_auth_user";

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
};

const readSession = <T>(key: string): T | null => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try { return JSON.parse(storage.getItem(key) ?? "null") as T | null; } catch { return null; }
};

const writeSession = (key: string, value: unknown): void => {
  const storage = getSessionStorage();
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
};

const removeSession = (key: string): void => {
  try { getSessionStorage()?.removeItem(key); } catch { /* storage is optional */ }
};

export const getTokens = (): AuthTokens | null =>
  readStorage<AuthTokens | null>(tokenKey, null) ?? readSession<AuthTokens>(tokenKey);

export const getStoredUser = (): User | null =>
  readStorage<User | null>(userKey, null) ?? readSession<User>(userKey);

export const saveAuth = (tokens: AuthTokens, user: User, remember = true): void => {
  clearAuth();
  if (remember) {
    writeStorage(tokenKey, tokens);
    writeStorage(userKey, user);
  } else {
    writeSession(tokenKey, tokens);
    writeSession(userKey, user);
  }
};

export const updateTokens = (tokens: AuthTokens): void => {
  if (readStorage<AuthTokens | null>(tokenKey, null)) writeStorage(tokenKey, tokens);
  else writeSession(tokenKey, tokens);
};

export const clearAuth = (): void => {
  removeStorage(tokenKey);
  removeStorage(userKey);
  removeSession(tokenKey);
  removeSession(userKey);
};
