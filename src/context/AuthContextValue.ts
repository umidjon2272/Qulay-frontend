import { createContext } from "react";
import type { User } from "../services/api/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  authInitialized: boolean;
  authError: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
