import { request } from './apiClient';

export type MemoryType = 'PERSONAL' | 'BUSINESS' | 'CONTACT' | 'PREFERENCE' | 'DECISION' | 'GOAL' | 'CONTEXT';
export type UserMemory = { id: string; type: MemoryType; key: string; value: string; importance: number; confidence: number; isVerified: boolean; status: 'ACTIVE' | 'ARCHIVED'; source: string; updatedAt: string; contact?: { id: string; displayName: string } | null };

export const memoryApi = {
  list: (search = '', page = 1, signal?: AbortSignal) => request<{ items: UserMemory[]; meta: { total: number; totalPages: number } }>(`/memories?${new URLSearchParams({ search, status: 'ACTIVE', limit: '50', page: String(page) })}`, { signal }),
  create: (input: { type: MemoryType; key: string; value: string; importance: number }) => request<UserMemory>('/memories', { method: 'POST', body: JSON.stringify({ ...input, source: 'MANUAL', isVerified: true, confidence: 100 }) }),
  update: (id: string, input: Partial<UserMemory>) => request<UserMemory>(`/memories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<{ message: string }>(`/memories/${id}`, { method: 'DELETE' }),
  getPreference: () => request<{ enabled: boolean }>('/memories/preference'),
  setPreference: (enabled: boolean) => request<{ enabled: boolean }>('/memories/preference', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  removeAll: () => request<{ message: string; count: number }>('/memories', { method: 'DELETE' }),
  exportAll: () => request<{ exportedAt: string; items: UserMemory[] }>('/memories/export'),
};
