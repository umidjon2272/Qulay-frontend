import { request } from "./apiClient";
import type { AuthResponse, User } from "./types";

export type RegisterInput = { email: string; password: string; firstName: string; lastName: string };

export const register = (input: RegisterInput) => request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }, false);
export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false);
export const refresh = (refreshToken: string) => request<AuthResponse>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }, false);
export const logout = (refreshToken: string) => request<{ message: string }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }, false);
export const me = () => request<User>("/auth/me");
