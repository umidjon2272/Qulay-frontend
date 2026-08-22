import { request } from "./apiClient";
import type { Note } from "../../types/workspace";
import type { ApiNote, PaginatedResponse } from "./types";

export const listNotes = (search?: string) => {
  const query = new URLSearchParams({ limit: "100" });
  if (search) query.set("search", search);
  return request<PaginatedResponse<ApiNote>>(`/notes?${query}`).then((response) => response.items.map((item) => ({ id: item.id, title: item.title, content: item.content, createdAt: item.createdAt, updatedAt: item.updatedAt }) satisfies Note));
};
export const getNote = (id: string | number) => request<ApiNote>(`/notes/${id}`);
export const createNote = (input: Omit<Note, "id" | "createdAt">) => request<ApiNote>("/notes", { method: "POST", body: JSON.stringify({ title: input.title, content: input.content }) });
export const updateNote = (id: string | number, patch: Partial<Note>) => request<ApiNote>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify({ title: patch.title, content: patch.content }) });
export const deleteNote = (id: string | number) => request<{ message: string }>(`/notes/${id}`, { method: "DELETE" });
