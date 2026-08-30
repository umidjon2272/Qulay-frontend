import { request } from './apiClient';

export type SuggestionStatus = 'ACTIVE' | 'DISMISSED' | 'SNOOZED' | 'RESOLVED';
export type SuggestionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ProactiveSuggestion = {
  id: string;
  triggerType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  body: string;
  reason: string;
  severity: SuggestionSeverity;
  status: SuggestionStatus;
  snoozedUntil: string | null;
  createdAt: string;
};

export const proactiveApi = {
  list: (status: SuggestionStatus = 'ACTIVE') => request<ProactiveSuggestion[]>(`/proactive-suggestions?status=${status}`),
  dismiss: (id: string) => request<ProactiveSuggestion>(`/proactive-suggestions/${id}/dismiss`, { method: 'POST' }),
  snooze: (id: string, until?: string) => request<ProactiveSuggestion>(`/proactive-suggestions/${id}/snooze`, { method: 'POST', body: JSON.stringify(until ? { until } : {}) }),
};
