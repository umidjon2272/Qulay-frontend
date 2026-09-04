import { noteApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { clearPersistedList, readPersistedList, writePersistedList } from "./persistentListCache";
import type { Note } from "../types/workspace";

const initialPersisted = readPersistedList<Note>(STORAGE_KEYS.notes, "null");
let cache: Note[] = initialPersisted?.items ?? [];
let loadedAt = initialPersisted?.savedAt ?? 0;
let loadedKey = initialPersisted ? "null" : "";
const inFlight = new Map<string, Promise<Note[]>>();
const CACHE_TTL_MS = 30_000;
export const clearNoteCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); clearPersistedList(STORAGE_KEYS.notes); };
export type CreateNoteInput = Omit<Note, "id" | "createdAt">;
export const getNotes = (): Note[] => cache;
export const loadNotes = (search?: string): Promise<Note[]> => {
  const key = JSON.stringify(search ?? null);
  if (loadedKey !== key) {
    const persisted = readPersistedList<Note>(STORAGE_KEYS.notes, key);
    cache = persisted?.items ?? [];
    loadedAt = persisted?.savedAt ?? 0;
    loadedKey = key;
  }
  if (loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return cache.length ? Promise.resolve(cache) : existing;
  const request = noteApi.listNotes(search).then((next) => {
    if (loadedKey === key) { cache = next; loadedAt = Date.now(); }
    writePersistedList(STORAGE_KEYS.notes, key, next);
    notifyWorkspaceDataChanged("notes");
    return next;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return cache.length ? Promise.resolve(cache) : request;
};
export const createNote = async (input: CreateNoteInput): Promise<Note> => {
  const note = await noteApi.createNote(input); cache = [note, ...cache]; writePersistedList(STORAGE_KEYS.notes, loadedKey || "null", cache); notifyWorkspaceDataChanged("notes"); return note;
};
export const updateNote = async (id: string | number, patch: Partial<Note>): Promise<Note> => {
  const note = await noteApi.updateNote(id, patch); cache = cache.map((item) => item.id === id ? note : item); writePersistedList(STORAGE_KEYS.notes, loadedKey || "null", cache); notifyWorkspaceDataChanged("notes"); return note;
};
export const deleteNote = async (id: string | number): Promise<boolean> => {
  await noteApi.deleteNote(id); cache = cache.filter((item) => item.id !== id); writePersistedList(STORAGE_KEYS.notes, loadedKey || "null", cache); notifyWorkspaceDataChanged("notes"); return true;
};
