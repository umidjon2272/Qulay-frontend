import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AUTH_SESSION_CHANGED, getAuthSession, getAuthTokens, logout as logoutSession, restoreSession } from "../services/authService";
import { detachPushOnLogout } from '../services/webPush';
import type { User } from "../services/api/types";
import { clearWorkspaceCache } from "../services/workspaceCache";
import { clearProfileCache } from "../services/profileService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { removeStorage } from "../services/storage";
import { AuthContext } from "./AuthContextValue";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const hasCachedSession = Boolean(getAuthSession() && getAuthTokens());
  const [user, setUser] = useState<User | null>(() => getAuthSession());
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(() => hasCachedSession ? "authenticated" : "loading");
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initializationStartedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const restored = await restoreSession();
      setUser(restored);
      setStatus(restored ? "authenticated" : "unauthenticated");
      setAuthError(null);
    } catch {
      // Keep a cached user interactive while Render wakes up. With no cached
      // identity, expose a recoverable state instead of an infinite loader.
      if (getAuthSession() && getAuthTokens()) {
        setStatus("authenticated");
        setAuthError("Server uyg'onmoqda. Ma'lumotlar keyinroq yangilanadi.");
      } else {
        setUser(null);
        setStatus("unauthenticated");
        setAuthError("Serverga ulanib bo'lmadi.");
      }
    } finally {
      setAuthInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (initializationStartedRef.current) return;
    initializationStartedRef.current = true;
    void refresh();
  }, [refresh]);
  useEffect(() => {
    // Login/logout and a failed refresh update storage. They must not trigger
    // another /auth/me bootstrap or reset the authenticated route to loading.
    const sync = () => {
      const nextUser = getAuthSession();
      const nextStatus = nextUser && getAuthTokens() ? "authenticated" : "unauthenticated";
      if (!nextUser || !getAuthTokens()) {
        clearWorkspaceCache();
        clearProfileCache();
        removeStorage(STORAGE_KEYS.aiChatHistory);
      }
      setUser(nextUser);
      setStatus(nextStatus);
      setAuthError(null);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== "yechim_ai_auth_tokens" && event.key !== "yechim_ai_auth_user") return;
      sync();
    };
    window.addEventListener(AUTH_SESSION_CHANGED, sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED, sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const logout = useCallback(async () => { await detachPushOnLogout().catch(() => undefined); await logoutSession(); setUser(null); setStatus("unauthenticated"); setAuthError(null); }, []);
  const value = useMemo(() => ({ user, status, authInitialized, authError, refresh, logout }), [user, status, authInitialized, authError, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
