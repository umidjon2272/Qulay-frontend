import { request } from "./apiClient";

export type AdminRange = 7 | 30 | 90;
export type AdminUser = {
  id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null;
  role: "USER" | "ADMIN"; status: "ACTIVE" | "BLOCKED"; createdAt: string; updatedAt?: string;
  lastActivity?: string | null; activeSession?: boolean; integrations?: { telegram: boolean; google: boolean };
};
export type AdminOverview = {
  range: number; generatedAt: string;
  kpis: Record<string, number>;
  activityOverview: Record<string, number>;
  userGrowth: Array<{ date: string; count: number }>;
  activityTrend: Array<{ date: string; count: number }>;
};
export type AdminUserDetail = AdminUser & {
  activity: Array<{ id: string; action: string; entityType: string; entityId: string | null; createdAt: string }>;
  usage: Record<string, number>;
  security: { activeRefreshSessions: number; passwordResetRequests: number };
  integrations: { telegram: { connected: boolean; status: string }; google: { connected: boolean; status: string } };
  lastActivity: string | null;
};
export type AdminPage<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export const adminApi = {
  overview: (range: AdminRange) => request<AdminOverview>(`/admin/overview?range=${range}`),
  users: (params: { page: number; search?: string; role?: string; status?: string; sort?: string; order?: string }) => request<AdminPage<AdminUser>>(`/admin/users?${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as string[][])}`),
  user: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
  status: (id: string, status: "ACTIVE" | "BLOCKED") => request<{ id: string; status: string }>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  role: (id: string, role: "USER" | "ADMIN") => request<{ id: string; role: string }>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  usage: (range: AdminRange) => request<any>(`/admin/usage?range=${range}`),
  integrations: () => request<any>("/admin/integrations"),
  notifications: (range: AdminRange) => request<any>(`/admin/notifications?range=${range}`),
  files: (page: number) => request<any>(`/admin/files?page=${page}&limit=20`),
  activity: (page: number) => request<any>(`/admin/activity?page=${page}&limit=25`),
  system: () => request<any>("/admin/system"),
  settings: () => request<any>("/admin/settings"),
};
