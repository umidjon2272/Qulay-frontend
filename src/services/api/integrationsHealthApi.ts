import { request } from './apiClient';

export type IntegrationHealthState = 'CONNECTED' | 'TEMPORARY_ISSUE' | 'RECONNECT_REQUIRED' | 'DISCONNECTED';
export type IntegrationHealth = {
  state: IntegrationHealthState;
  connected: boolean;
  lastSuccessfulSyncAt: string | null;
  lastCheckedAt: string;
  lastErrorCode: string | null;
};

export type IntegrationsHealth = { google: IntegrationHealth; telegram: IntegrationHealth };

export const integrationsHealthApi = {
  get: () => request<IntegrationsHealth>('/integrations/health'),
};
