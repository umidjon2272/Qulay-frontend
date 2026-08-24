import { noteApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Note } from "../types/workspace";

let cache: Note[] = [];
let loadedAt = 0;
let loadedKey = "";
const inFlight = new Map<string, Promise<Note[]>>();
const CACHE_TTL_MS = 30_000;
export const clearNoteCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); };
export type CreateNoteInput = Omit<Note, "id" | "createdAt">;
export const getNotes = (): Note[] => cache;
export const loadNotes = (search?: string): Promise<Note[]> => {
  const key = JSON.stringify(search ?? null);
  if (loadedKey === key && loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = noteApi.listNotes(search).then((next) => {
    cache = next;
    loadedAt = Date.now();
    loadedKey = key;
    notifyWorkspaceDataChanged("notes");
    return cache;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
};
export const createNote = async (input: CreateNoteInput): Promise<Note> => {
  const note = await noteApi.createNote(input); cache = [note, ...cache]; notifyWorkspaceDataChanged("notes"); return note;
};
export const updateNote = async (id: string | number, patch: Partial<Note>): Promise<Note> => {
  const note = await noteApi.updateNote(id, patch); cache = cache.map((item) => item.id === id ? note : item); notifyWorkspaceDataChanged("notes"); return note;
};
export const deleteNote = async (id: string | number): Promise<boolean> => {
  await noteApi.deleteNote(id); cache = cache.filter((item) => item.id !== id); notifyWorkspaceDataChanged("notes"); return true;
};
