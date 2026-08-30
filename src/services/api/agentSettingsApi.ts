import { request } from './apiClient';

export type AgentSettings = {
  morningBriefingEnabled: boolean;
  morningBriefingTime: string;
  eveningSummaryEnabled: boolean;
  eveningSummaryTime: string;
  telegramDelivery: boolean;
  inAppDelivery: boolean;
  proactiveEnabled: boolean;
  financialAlertsEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

export type UpdateAgentSettingsInput = Partial<AgentSettings>;

export const agentSettingsApi = {
  get: () => request<AgentSettings>('/agent-settings'),
  update: (input: UpdateAgentSettingsInput) => request<AgentSettings>('/agent-settings', { method: 'PATCH', body: JSON.stringify(input) }),
};
