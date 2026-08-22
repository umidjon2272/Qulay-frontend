import { STORAGE_KEYS } from "../constants/storageKeys";
import { authApi } from "./api";
import { getStoredUser, getTokens, clearAuth, saveAuth, type AuthTokens } from "./api/tokenStorage";
import type { User } from "./api/types";
import { removeStorage } from "./storage";
import { clearWorkspaceCache } from "./workspaceCache";

export type AuthSession = User;
export const AUTH_SESSION_CHANGED = "yechim_ai_auth_session_changed";

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
};

export const getAuthSession = (): AuthSession | null => getStoredUser();
export const getAuthTokens = (): AuthTokens | null => getTokens();

export const signIn = async (email: string, password: string, remember = true): Promise<User> => {
  const response = await authApi.login(email.trim().toLowerCase(), password);
  saveAuth({ accessToken: response.accessToken, refreshToken: response.refreshToken }, response.user, remember);
  notifyAuthChanged();
  return response.user;
};

export const signUp = async (input: { email: string; password: string; firstName: string; lastName: string }, remember = true): Promise<User> => {
  const response = await authApi.register({ ...input, email: input.email.trim().toLowerCase() });
  saveAuth({ accessToken: response.accessToken, refreshToken: response.refreshToken }, response.user, remember);
  notifyAuthChanged();
  return response.user;
};

export const restoreSession = async (): Promise<User | null> => {
  if (!getTokens()) return null;
  try {
    const user = await authApi.me();
    const current = getTokens();
    if (current) {
      const remember = typeof window !== "undefined" && Boolean(window.localStorage.getItem("yechim_ai_auth_tokens"));
      saveAuth(current, user, remember);
    }
    notifyAuthChanged();
    return user;
  } catch {
    clearAuth();
    notifyAuthChanged();
    return null;
  }
};

export const logout = async (): Promise<void> => {
  const refreshToken = getTokens()?.refreshToken;
  try {
    if (refreshToken) await authApi.logout(refreshToken);
  } catch { /* local cleanup must still happen if the server is asleep/unavailable */ }
  clearAuth();
  clearWorkspaceCache();
  removeStorage(STORAGE_KEYS.authSession);
  notifyAuthChanged();
};

/** Backwards-compatible name used by the settings screen. */
export const clearMockSession = (): void => { void logout(); };
