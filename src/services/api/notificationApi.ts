import { request } from "./apiClient";
import type { ApiNotification, ApiNotificationPreference, PaginatedResponse } from "./types";

export const list = (params: { unreadOnly?: boolean; type?: ApiNotification["type"]; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.unreadOnly) query.set("unreadOnly", "true");
  if (params.type) query.set("type", params.type);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return request<PaginatedResponse<ApiNotification>>(`/notifications?${query.toString()}`);
};

export const unreadCount = () => request<{ count: number }>("/notifications/unread-count");
export const markRead = (id: string) => request<ApiNotification>(`/notifications/${id}/read`, { method: "PATCH" });
export const markAllRead = () => request<{ count: number }>("/notifications/read-all", { method: "PATCH" });
export const getPreferences = () => request<ApiNotificationPreference>("/notifications/preferences");
export const updatePreferences = (patch: Partial<Omit<ApiNotificationPreference, "userId">>) => request<ApiNotificationPreference>("/notifications/preferences", { method: "PATCH", body: JSON.stringify(patch) });
export const deleteNotification = (id: string) => request<{ message: string }>(`/notifications/${id}`, { method: "DELETE" });
