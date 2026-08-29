import { request } from './apiClient';

export type MemoryType = 'PERSONAL' | 'BUSINESS' | 'CONTACT' | 'PREFERENCE' | 'DECISION' | 'GOAL' | 'CONTEXT';
export type UserMemory = { id: string; type: MemoryType; key: string; value: string; importance: number; confidence: number; isVerified: boolean; status: 'ACTIVE' | 'ARCHIVED'; source: string; updatedAt: string; contact?: { id: string; displayName: string } | null };

export const memoryApi = {
  list: (search = '') => request<{ items: UserMemory[] }>(`/memories?${new URLSearchParams({ search, status: 'ACTIVE', limit: '100' })}`),
  create: (input: { type: MemoryType; key: string; value: string; importance: number }) => request<UserMemory>('/memories', { method: 'POST', body: JSON.stringify({ ...input, source: 'MANUAL', isVerified: true, confidence: 100 }) }),
  update: (id: string, input: Partial<UserMemory>) => request<UserMemory>(`/memories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<{ message: string }>(`/memories/${id}`, { method: 'DELETE' }),
};
