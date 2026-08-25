import { request } from "./apiClient";
import type { AuthResponse, User } from "./types";

export type RegisterInput = { email: string; password: string; firstName: string; lastName: string };
export type ChangePasswordInput = { currentPassword: string; newPassword: string; confirmPassword: string };
export type ChangePasswordResponse = { success: true; message: string; requiresRelogin: true };
export type ForgotPasswordResponse = { success: true; message: string };
export type ResetPasswordInput = { token: string; newPassword: string; confirmPassword: string };
export type ResetPasswordResponse = { success: true; message: string };

export const register = (input: RegisterInput) => request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }, false);
export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false);
export const refresh = (refreshToken: string) => request<AuthResponse>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }, false);
export const logout = (refreshToken: string) => request<{ message: string }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }, false);
export const me = () => request<User>("/auth/me");
export const changePassword = (input: ChangePasswordInput) => request<ChangePasswordResponse>("/auth/change-password", { method: "PATCH", body: JSON.stringify(input) });
export const forgotPassword = (email: string) => request<ForgotPasswordResponse>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }, false);
export const resetPassword = (input: ResetPasswordInput) => request<ResetPasswordResponse>("/auth/reset-password", { method: "POST", body: JSON.stringify(input) }, false);
