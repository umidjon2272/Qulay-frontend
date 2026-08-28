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

type RateLimitInfo = { max: number; windowMinutes: number };
export type AdminSettings = {
  platform: { name: string; defaultUserStatus: "ACTIVE" | "BLOCKED"; registrationEnabled: boolean; maintenanceMode: boolean };
  security: {
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    loginBruteForce: { maxFailures: number; lockMinutes: number };
    rateLimits: { loginPerIp: RateLimitInfo; loginPerEmail: RateLimitInfo; registerPerIp: RateLimitInfo; registerPerEmail: RateLimitInfo; passwordReset: RateLimitInfo; globalPerIp: { max: number; windowSeconds: number } };
  };
  notifications: { workerStatus: "running" | "stopped"; intervalSeconds: number; batchSize: number; retryLimit: number };
  integrations: { telegram: { configured: boolean }; google: { configured: boolean }; openai: { configured: boolean } };
  storage: { provider: string; maxFileSizeBytes: number; localWarning: string | null };
  system: { environment: string; version: string | null; api: { status: string }; database: { status: string; latencyMs: number } };
};

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
  settings: () => request<AdminSettings>("/admin/settings"),
};
