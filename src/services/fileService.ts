import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { createLocalId } from "./dateUtils";
import type { WorkspaceFile } from "../types/workspace";

const isFile = (value: unknown): value is WorkspaceFile => {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<WorkspaceFile>;
  return typeof file.id === "number" && typeof file.name === "string" && typeof file.type === "string" &&
    typeof file.mimeType === "string" && typeof file.size === "number" && typeof file.addedAt === "string" &&
    (file.previewText === undefined || typeof file.previewText === "string");
};

export const getFiles = (): WorkspaceFile[] => readStorage(STORAGE_KEYS.files, [], (value): value is WorkspaceFile[] =>
  Array.isArray(value) && value.every(isFile));

export const addFile = (file: Omit<WorkspaceFile, "id" | "addedAt">): WorkspaceFile => {
  const existing = getFiles();
  const next: WorkspaceFile = { ...file, id: createLocalId(existing), addedAt: new Date().toISOString() };
  if (!writeStorage(STORAGE_KEYS.files, [next, ...existing])) throw new Error("File could not be saved");
  notifyWorkspaceDataChanged("files");
  return next;
};

export const removeFile = (id: number): boolean => {
  const files = getFiles();
  const next = files.filter((file) => file.id !== id);
  if (files.length === next.length) return false;
  if (!writeStorage(STORAGE_KEYS.files, next)) return false;
  notifyWorkspaceDataChanged("files");
  return true;
};
