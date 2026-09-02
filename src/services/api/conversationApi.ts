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
export type MessagePage = PaginatedResponse<Message> & { meta: { hasMore?: boolean; nextCursor?: string | null } };
export const listMessages = (id: string, page = 1, limit = 50, before?: string) => {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 50;
  const query = new URLSearchParams({ page: String(page), limit: String(safeLimit) });
  if (before) query.set('before', before);
  return request<MessagePage>(`/conversations/${id}/messages?${query}`);
};
export const addMessage = (id: string, content: string, role: Message["role"] = "USER") => request<Message>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content, role }) });
export const deleteConversation = (id: string) => request<{ message: string }>(`/conversations/${id}`, { method: "DELETE" });
