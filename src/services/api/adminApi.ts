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
  subscription?: { tier: AdminPlan['tier']; status: string; currentPeriodEnd: string | null } | null;
};
export type AdminPlan = { tier: 'STARTER'|'PRO'|'BUSINESS'; name:string; monthlyPrice:number; currency:'UZS'|'USD'; isActive:boolean; limits:{ aiCreditsPerMonth:number; toolActionsPerMonth:number; voiceMinutesPerMonth:number; files:number; storageMb:number; memories:number } };
export type AdminPage<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

type RateLimitInfo = { max: number; windowMinutes: number };
export type AdminSettings = {
  platform: { name: string; defaultUserStatus: "ACTIVE" | "BLOCKED"; registrationEnabled: boolean; updatedAt?: string | null };
  security: {
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    loginBruteForce: { maxFailures: number; lockMinutes: number };
    rateLimits: { loginPerIp: RateLimitInfo; loginPerEmail: RateLimitInfo; registerPerIp: RateLimitInfo; registerPerEmail: RateLimitInfo; passwordReset: RateLimitInfo; globalPerIp: { max: number; windowSeconds: number } };
  };
  notifications: { workerStatus: "running" | "stopped"; intervalSeconds: number; batchSize: number; retryLimit: number };
  integrations: { telegram: { configured: boolean; loginDiagnosticEnabled?: boolean }; google: { configured: boolean }; openai: { configured: boolean } };
  storage: { provider: string; maxFileSizeBytes: number; localWarning: string | null };
  system: { environment: string; version: string | null; api: { status: string }; database: { status: string; latencyMs: number } };
};
export type AdminSettingsSection = keyof AdminSettings;
export type NormalizedAdminSettings = { data: AdminSettings; missingSections: AdminSettingsSection[] };

const emptyAdminSettings = (): AdminSettings => ({
  platform: { name: "Qulay AI", defaultUserStatus: "ACTIVE", registrationEnabled: false },
  security: {
    accessTokenExpiresIn: "", refreshTokenExpiresIn: "",
    loginBruteForce: { maxFailures: 0, lockMinutes: 0 },
    rateLimits: { loginPerIp: { max: 0, windowMinutes: 0 }, loginPerEmail: { max: 0, windowMinutes: 0 }, registerPerIp: { max: 0, windowMinutes: 0 }, registerPerEmail: { max: 0, windowMinutes: 0 }, passwordReset: { max: 0, windowMinutes: 0 }, globalPerIp: { max: 0, windowSeconds: 0 } },
  },
  notifications: { workerStatus: "stopped", intervalSeconds: 0, batchSize: 0, retryLimit: 0 },
  integrations: { telegram: { configured: false, loginDiagnosticEnabled: false }, google: { configured: false }, openai: { configured: false } },
  storage: { provider: "", maxFileSizeBytes: 0, localWarning: null },
  system: { environment: "", version: null, api: { status: "unreachable" }, database: { status: "unreachable", latencyMs: 0 } },
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Never throws: a malformed or partially-shaped backend response degrades to safe per-section defaults instead of crashing the page. */
export const normalizeAdminSettings = (raw: unknown): NormalizedAdminSettings => {
  const data = emptyAdminSettings();
  const missingSections: AdminSettingsSection[] = [];
  const sections = Object.keys(data) as AdminSettingsSection[];
  if (!isRecord(raw)) return { data, missingSections: sections };
  for (const key of sections) {
    const value = raw[key];
    if (isRecord(value)) Object.assign(data[key], value);
    else missingSections.push(key);
  }
  return { data, missingSections };
};

export type AdminUsage = {
  range: number;
  provider: { status: "configured" | "not_configured" };
  totals: {
    requests: number; inputTokens: number; outputTokens: number; audioSeconds: number; estimatedCost: number;
    text: { requests: number }; voice: { requests: number }; tool: { requests: number }; file: { requests: number };
  };
  byUser: Array<{ user: { id: string; email: string; firstName: string; lastName: string }; requests: number; inputTokens: number; outputTokens: number; estimatedCost: number }>;
  trend: Array<{ date: string; count: number }>;
  tools: Array<{ tool: string | null; count: number }>;
};
export type AdminConnectionCounts = { connected: number; disconnected: number; error: number };
export type AdminIntegrationWarning = { provider: "telegram" | "google"; userId: string; email: string; code: string; at: string | null };
export type AdminIntegrations = {
  telegram: AdminConnectionCounts;
  google: AdminConnectionCounts;
  health?: {
    telegram?: { lastValidatedAt: string | null; recentErrors: number };
    google?: { calendarEnabledUsers: number; driveEnabledUsers: number; recentErrors: number };
  };
  warnings?: AdminIntegrationWarning[];
};
export type AdminNotifications = {
  range: number;
  totals: { total: number; pending: number; sent: number; failed: number; read: number };
  failed: Array<{ id: string; type: string; channel: string; status: string; retryCount: number; failedAt: string | null; createdAt: string; user: { id: string; email: string } }>;
};
export type AdminFiles = {
  stats: { total: number; totalSizeBytes: number; images: number; pdfs: number; docs: number; storage: Record<string, number>; sources: Record<string, number> };
  items: Array<{ id: string; originalName: string; mimeType: string; extension: string; sizeBytes: number; source: string; storageProvider: string; createdAt: string; owner: { id: string; email: string; firstName: string; lastName: string } }>;
  meta: AdminPage<unknown>["meta"];
};
export type AdminActivity = {
  items: Array<{ id: string; time: string; action: string; entity: { type: string; id: string | null }; source: string; user: { id: string; email: string; firstName: string; lastName: string } }>;
  meta: AdminPage<unknown>["meta"];
};
export type AdminSystem = {
  api: { status: string }; database: { status: string; latencyMs: number }; notificationWorker: { status: string };
  uptimeSeconds: number; environment: string; version: string | null; migrations: { status: string };
  integrations: AdminIntegrations;
};

export const adminApi = {
  overview: (range: AdminRange) => request<AdminOverview>(`/admin/overview?range=${range}`),
  users: (params: { page: number; search?: string; role?: string; status?: string; sort?: string; order?: string }) => request<AdminPage<AdminUser>>(`/admin/users?${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as string[][])}`),
  user: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
  status: (id: string, status: "ACTIVE" | "BLOCKED") => request<{ id: string; status: string }>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  role: (id: string, role: "USER" | "ADMIN") => request<{ id: string; role: string }>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  usage: (range: AdminRange) => request<AdminUsage>(`/admin/usage?range=${range}`),
  integrations: () => request<AdminIntegrations>("/admin/integrations"),
  notifications: (range: AdminRange) => request<AdminNotifications>(`/admin/notifications?range=${range}`),
  retryNotification: (id: string) => request<{ id: string; status: string }>(`/admin/notifications/${id}/retry`, { method: "PATCH" }),
  files: (params: { page: number; search?: string; source?: string; storageProvider?: string; type?: string }) => request<AdminFiles>(`/admin/files?limit=20&${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as string[][])}`),
  activity: (params: { page: number; userId?: string; action?: string; entityType?: string; from?: string; to?: string }) => request<AdminActivity>(`/admin/activity?limit=25&${new URLSearchParams(Object.entries({ ...params }).filter(([, value]) => Boolean(value)) as string[][])}`),
  system: () => request<AdminSystem>("/admin/system"),
  settings: () => request<unknown>("/admin/settings").then(normalizeAdminSettings),
  updatePlatformSettings: (input: { name?: string; registrationEnabled?: boolean }) => request<{ name: string; registrationEnabled: boolean; updatedAt: string }>("/admin/settings/platform", { method: "PATCH", body: JSON.stringify(input) }),
  runTelegramLoginDiagnostic: () => request<{ accepted: true; diagnosticId: string; deploymentVersion: string }>("/admin/diagnostics/telegram-login", { method: "POST" }),
  plans: () => request<AdminPlan[]>("/admin/plans"),
  updatePlan: (tier: AdminPlan['tier'], input: Partial<Omit<AdminPlan,'tier'|'limits'>&AdminPlan['limits']>) => request<AdminPlan>(`/admin/plans/${tier}`, { method: 'PATCH', body: JSON.stringify(input) }),
  assignSubscription: (userId: string, tier: AdminPlan['tier'], status = 'ACTIVE') => request(`/admin/users/${userId}/subscription`, { method: 'PATCH', body: JSON.stringify({ tier, status }) }),
};
