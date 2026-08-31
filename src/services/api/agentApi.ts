import { request } from './apiClient';

export type AgentStatus = { configured: boolean; mode: 'MODEL' | 'SETUP_REQUIRED' };
export type AgentChatResponse = {
  conversationId: string;
  message: string;
  pendingConfirmation: null | { id: string; tool: string; preview: unknown; expiresAt: string };
};

export type AgentActionStatus = 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
export type AgentAction = {
  id: string;
  conversationId: string | null;
  toolName: string;
  input: unknown;
  preview: unknown;
  status: AgentActionStatus;
  expiresAt: string;
  executedAt: string | null;
  errorCode: string | null;
  createdAt: string;
};
export type AgentActionList = { items: AgentAction[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export const agentApi = {
  status: () => request<AgentStatus>('/ai/agent/status'),
  chat: (message: string, conversationId?: string, signal?: AbortSignal) => request<AgentChatResponse>('/ai/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId }),
    signal,
  }),
  confirm: (actionId: string, confirmed: boolean) => request<{ status: 'success' | 'cancelled'; message: string; data?: unknown }>(`/ai/agent/actions/${actionId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmed }),
  }),
  listActions: (status?: AgentActionStatus, page = 1, limit = 20) => request<AgentActionList>(`/ai/agent/actions?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page), limit: String(limit) })}`),
};
