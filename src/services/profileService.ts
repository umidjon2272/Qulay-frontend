import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorageString, removeStorage, writeStorageString } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";

export type Profile = {
  name: string;
  email: string;
  bio: string;
  avatar: string | null;
};

const defaults: Profile = {
  name: "Yechim foydalanuvchi",
  email: "user@yechim.ai",
  bio: "Yechim AI foydalanuvchisi",
  avatar: null,
};

export const getProfile = (): Profile => ({
  name: readStorageString(STORAGE_KEYS.profileName, defaults.name),
  email: readStorageString(STORAGE_KEYS.profileEmail, defaults.email),
  bio: readStorageString(STORAGE_KEYS.profileBio, defaults.bio),
  avatar: readStorageString(STORAGE_KEYS.profileAvatar) || null,
});

export const updateProfile = (patch: Partial<Profile>): Profile => {
  const profile = { ...getProfile(), ...patch };
  writeStorageString(STORAGE_KEYS.profileName, profile.name);
  writeStorageString(STORAGE_KEYS.profileEmail, profile.email);
  writeStorageString(STORAGE_KEYS.profileBio, profile.bio);

  if (profile.avatar) writeStorageString(STORAGE_KEYS.profileAvatar, profile.avatar);
  else removeStorage(STORAGE_KEYS.profileAvatar);

  notifyWorkspaceDataChanged("profile");
  return profile;
};
