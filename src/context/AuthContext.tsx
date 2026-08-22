import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_SESSION_CHANGED, logout as logoutSession, restoreSession } from "../services/authService";
import type { User } from "../services/api/types";
import { AuthContext } from "./AuthContextValue";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    const restored = await restoreSession();
    setUser(restored);
    setStatus(restored ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const sync = () => { void refresh(); };
    window.addEventListener(AUTH_SESSION_CHANGED, sync);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED, sync);
  }, [refresh]);

  const logout = useCallback(async () => { await logoutSession(); setUser(null); setStatus("unauthenticated"); }, []);
  const value = useMemo(() => ({ user, status, refresh, logout }), [user, status, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
