import { STORAGE_KEYS } from "../constants/storageKeys";
import { authApi } from "./api";
import { ApiError } from "./api/apiClient";
import { getStoredUser, getTokens, clearAuth, saveAuth, type AuthTokens } from "./api/tokenStorage";
import type { User } from "./api/types";
import { removeStorage } from "./storage";
import { clearWorkspaceCache } from "./workspaceCache";
import { clearProfileCache } from "./profileService";
import type { ChangePasswordInput, ChangePasswordResponse } from "./api/authApi";

export type AuthSession = User;
export const AUTH_SESSION_CHANGED = "yechim_ai_auth_session_changed";

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
};

export const getAuthSession = (): AuthSession | null => getStoredUser();
export const getAuthTokens = (): AuthTokens | null => getTokens();

let restorePromise: Promise<User | null> | null = null;

export const signIn = async (email: string, password: string, remember = true): Promise<User> => {
  const response = await authApi.login(email.trim().toLowerCase(), password);
  saveAuth({ accessToken: response.accessToken, refreshToken: response.refreshToken }, response.user, remember);
  notifyAuthChanged();
  return response.user;
};

export class AdminAccessDeniedError extends Error {
  constructor() {
    super("Admin huquqi mavjud emas.");
    this.name = "AdminAccessDeniedError";
  }
}

/**
 * Authenticate through the normal API, but do not persist a non-admin login.
 * The response is checked before touching either localStorage or sessionStorage.
 */
export const signInAdmin = async (email: string, password: string, remember = true): Promise<User> => {
  const response = await authApi.login(email.trim().toLowerCase(), password);
  if (response.user.role !== "ADMIN") throw new AdminAccessDeniedError();

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

export const changePassword = (input: ChangePasswordInput): Promise<ChangePasswordResponse> => authApi.changePassword(input);

const restoreSessionOnce = async (): Promise<User | null> => {
  const storedUser = getAuthSession();
  if (!getTokens()) return null;
  try {
    const user = await authApi.me();
    if (getAuthSession()?.id !== storedUser?.id) return getAuthSession();
    const current = getTokens();
    if (current) {
      const remember = typeof window !== "undefined" && Boolean(window.localStorage.getItem("yechim_ai_auth_tokens"));
      saveAuth(current, user, remember);
    }
    return user;
  } catch (error) {
    if (getAuthSession()?.id !== storedUser?.id) return getAuthSession();
    // Keep the shell available during a temporary network outage. Only a
    // failed refresh (401) means the refresh token is expired or revoked.
    if (storedUser && (!(error instanceof ApiError) || error.status !== 401)) {
      return storedUser;
    }

    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
      notifyAuthChanged();
      return null;
    }

    throw error;
  }
};

/** Bootstrap/revalidation is single-flight too, so StrictMode and retries cannot duplicate /auth/me. */
export const restoreSession = (): Promise<User | null> => {
  if (!restorePromise) {
    restorePromise = restoreSessionOnce().finally(() => { restorePromise = null; });
  }
  return restorePromise;
};

export const logout = async (): Promise<void> => {
  const refreshToken = getTokens()?.refreshToken;

  // Local logout is intentionally first. A sleeping backend must never keep
  // the user trapped in the app while the revoke request waits or times out.
  clearAuth();
  clearWorkspaceCache();
  clearProfileCache();
  removeStorage(STORAGE_KEYS.authSession);
  removeStorage(STORAGE_KEYS.aiChatHistory);
  notifyAuthChanged();

  // Revoke best-effort in the background. Local state is already cleared, so
  // navigation never waits for a sleeping or unavailable backend.
  if (refreshToken) {
    void authApi.logout(refreshToken).catch(() => undefined);
  }
};

/** Backwards-compatible name used by the settings screen. */
export const clearMockSession = (): void => { void logout(); };
