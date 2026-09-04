import { getStoredUser } from "./api/tokenStorage";
import { readStorage, removeStorage, writeStorage } from "./storage";

type StoredEntry<T> = { savedAt: number; items: T[] };
type StoredEnvelope<T> = { userId: string; entries: Record<string, StoredEntry<T>> };

export const readPersistedList = <T>(storageKey: string, queryKey: string): StoredEntry<T> | null => {
  const userId = getStoredUser()?.id;
  if (!userId) return null;
  const stored = readStorage<StoredEnvelope<T> | null>(storageKey, null);
  if (!stored || stored.userId !== userId || !stored.entries || typeof stored.entries !== "object") return null;
  const entry = stored.entries[queryKey];
  return entry && Array.isArray(entry.items) && Number.isFinite(entry.savedAt) ? entry : null;
};

export const writePersistedList = <T>(storageKey: string, queryKey: string, items: T[]): void => {
  const userId = getStoredUser()?.id;
  if (!userId) return;
  const existing = readStorage<StoredEnvelope<T> | null>(storageKey, null);
  const entries = existing?.userId === userId && existing.entries ? { ...existing.entries } : {};
  entries[queryKey] = { savedAt: Date.now(), items };
  const newest = Object.entries(entries)
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, 6);
  writeStorage(storageKey, { userId, entries: Object.fromEntries(newest) });
};

export const clearPersistedList = (storageKey: string): void => {
  removeStorage(storageKey);
};
