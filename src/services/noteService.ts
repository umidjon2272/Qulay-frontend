import { STORAGE_KEYS } from "../constants/storageKeys";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { createLocalId } from "./dateUtils";
import { readStorage, writeStorage } from "./storage";
import type { Note } from "../types/workspace";

const isNote = (value: unknown): value is Note => {
  if (typeof value !== "object" || value === null) return false;

  const note = value as Partial<Note>;

  return (
    typeof note.id === "number" &&
    typeof note.title === "string" &&
    typeof note.content === "string" &&
    typeof note.createdAt === "string" &&
    (note.updatedAt === undefined || typeof note.updatedAt === "string")
  );
};

const isNoteList = (value: unknown): value is Note[] =>
  Array.isArray(value) && value.every(isNote);

export const getNotes = (): Note[] =>
  readStorage(STORAGE_KEYS.notes, [], isNoteList);

export type CreateNoteInput = Omit<Note, "id" | "createdAt">;

export const createNote = (input: CreateNoteInput): Note => {
  const note: Note = {
    ...input,
    id: createLocalId(getNotes()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!writeStorage(STORAGE_KEYS.notes, [note, ...getNotes()])) {
    throw new Error("Notes could not be saved");
  }

  notifyWorkspaceDataChanged("notes");
  return note;
};

export const updateNote = (id: number, patch: Partial<Note>): Note | null => {
  const notes = getNotes();
  const current = notes.find((note) => note.id === id);
  if (!current) return null;
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (!writeStorage(STORAGE_KEYS.notes, notes.map((note) => (note.id === id ? updated : note)))) {
    throw new Error("Notes could not be saved");
  }
  notifyWorkspaceDataChanged("notes");
  return updated;
};

export const deleteNote = (id: number): boolean => {
  const notes = getNotes();
  const next = notes.filter((note) => note.id !== id);
  if (next.length === notes.length) return false;
  if (!writeStorage(STORAGE_KEYS.notes, next)) return false;
  notifyWorkspaceDataChanged("notes");
  return true;
};
