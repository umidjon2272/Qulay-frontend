import { request } from "./apiClient";
import type { User } from "./types";

export type ProfilePatch = Partial<Pick<User, "firstName" | "lastName" | "avatarUrl" | "timezone" | "language">>;
export const getProfile = () => request<User>("/users/me");
export const updateProfile = (patch: ProfilePatch) => request<User>("/users/me", { method: "PATCH", body: JSON.stringify(patch) });
