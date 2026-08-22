import { noteApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Note } from "../types/workspace";

let cache: Note[] = [];
export const clearNoteCache = () => { cache = []; };
export type CreateNoteInput = Omit<Note, "id" | "createdAt">;
export const getNotes = (): Note[] => cache;
export const loadNotes = async (search?: string): Promise<Note[]> => {
  cache = await noteApi.listNotes(search); notifyWorkspaceDataChanged("notes"); return cache;
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
