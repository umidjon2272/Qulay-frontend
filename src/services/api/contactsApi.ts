import { request } from './apiClient';

export type Contact = { id: string; firstName: string; lastName?: string | null; displayName: string; phone?: string | null; email?: string | null; telegramUsername?: string | null; company?: string | null; position?: string | null; relationship?: string | null; birthday?: string | null; lastContactedAt?: string | null; nextFollowUpAt?: string | null; notes?: string | null; tags: string[] };
export type ContactHistory = { contact: Contact; recentMeetings: Array<{ id: string; title: string; startsAt: string }>; relatedNotes: Array<{ id: string; title: string; content: string }>; relatedMemories: Array<{ id: string; key: string; value: string }>; financeTransactions: Array<{ id: string; title: string; amount: string; currency: string; type: string; transactionDate: string }> };

export const contactsApi = {
  list: (search = '') => request<{ items: Contact[] }>(`/contacts?${new URLSearchParams({ search, limit: '100' })}`),
  create: (input: Partial<Contact> & { firstName: string }) => request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<Contact>) => request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<{ message: string }>(`/contacts/${id}`, { method: 'DELETE' }),
  history: (id: string) => request<ContactHistory>(`/contacts/${id}/history`),
};
