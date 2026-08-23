import { profileApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { readStorageString, writeStorageString, removeStorage } from "./storage";
import { STORAGE_KEYS } from "../constants/storageKeys";

export type Profile = { name: string; email: string; bio: string; avatar: string | null; timezone: string; language: string };
let cache: Profile = { name: "", email: "", bio: readStorageString(STORAGE_KEYS.profileBio), avatar: null, timezone: "UTC", language: "en" };

const toProfile = (user: Awaited<ReturnType<typeof profileApi.getProfile>>): Profile => ({
  name: [user.firstName, user.lastName].filter(Boolean).join(" "),
  email: user.email,
  bio: cache.bio,
  avatar: user.avatarUrl,
  timezone: user.timezone,
  language: user.language,
});

export const getProfile = (): Profile => cache;
export const clearProfileCache = () => {
  cache = { name: "", email: "", bio: "", avatar: null, timezone: "UTC", language: "en" };
  removeStorage(STORAGE_KEYS.profileBio);
  notifyWorkspaceDataChanged("profile");
};
export const loadProfile = async (): Promise<Profile> => {
  cache = toProfile(await profileApi.getProfile());
  notifyWorkspaceDataChanged("profile");
  return cache;
};

const nameParts = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "Qulay", lastName: parts.slice(1).join(" ") || "AI" };
};

export const updateProfile = async (patch: Partial<Profile>): Promise<Profile> => {
  const next = { ...cache, ...patch };
  if (patch.bio !== undefined) writeStorageString(STORAGE_KEYS.profileBio, patch.bio);
  const apiPatch = {
    ...(patch.name !== undefined ? nameParts(patch.name) : {}),
    ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
    ...(patch.language !== undefined ? { language: patch.language } : {}),
    ...(patch.avatar === null ? { avatarUrl: null } : patch.avatar?.startsWith("http") ? { avatarUrl: patch.avatar } : {}),
  };
  if (Object.keys(apiPatch).length > 0) cache = toProfile(await profileApi.updateProfile(apiPatch));
  else cache = next;
  if (patch.avatar !== undefined && !patch.avatar?.startsWith("http")) cache = { ...cache, avatar: patch.avatar };
  notifyWorkspaceDataChanged("profile");
  return cache;
};

export const clearLocalProfileFields = () => { removeStorage(STORAGE_KEYS.profileBio); };
