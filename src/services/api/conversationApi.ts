import { request } from "./apiClient";
import type { PaginatedResponse } from "./types";

export type Conversation = { id: string; title: string; createdAt: string; updatedAt: string; messageCount?: number };
export type Message = { id: string; conversationId: string; role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL"; content: string; createdAt: string };

export const listConversations = (search?: string) => {
  const query = new URLSearchParams({ limit: "100" });
  if (search) query.set("search", search);
  return request<PaginatedResponse<Conversation>>(`/conversations?${query}`);
};
export const createConversation = (title?: string) => request<Conversation>("/conversations", { method: "POST", body: JSON.stringify({ title }) });
export const updateConversation = (id: string, title: string) => request<Conversation>(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
export const listMessages = (id: string, page = 1, limit = 100) => request<PaginatedResponse<Message>>(`/conversations/${id}/messages?page=${page}&limit=${limit}`);
export const addMessage = (id: string, content: string, role: Message["role"] = "USER") => request<Message>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content, role }) });
export const deleteConversation = (id: string) => request<{ message: string }>(`/conversations/${id}`, { method: "DELETE" });
