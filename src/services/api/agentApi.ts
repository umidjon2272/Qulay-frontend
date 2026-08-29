import { request } from './apiClient';

export type AgentStatus = { configured: boolean; mode: 'MODEL' | 'SETUP_REQUIRED' };
export type AgentChatResponse = {
  conversationId: string;
  message: string;
  pendingConfirmation: null | { id: string; tool: string; preview: unknown; expiresAt: string };
};

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
};
