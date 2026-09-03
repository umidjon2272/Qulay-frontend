import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../services/api/conversationApi', () => ({ listConversations: vi.fn() }));
vi.mock('../../../services/api/tokenStorage', () => ({ getStoredUser: () => ({ id: 'owner' }) }));
import { listConversations, type Conversation } from '../../../services/api/conversationApi';
import { useConversationList } from './useConversationList';
const row = (id: string): Conversation => ({ id, title: id, createdAt: '2026-09-01', updatedAt: '2026-09-01' });
describe('history pagination and server search', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reuses first page and loads older conversations only on demand', async () => {
    const seed = Array.from({ length: 50 }, (_, i) => row(String(i)));
    vi.mocked(listConversations).mockResolvedValue({ items: [row('older')], meta: { total: 51, page: 2, limit: 50, totalPages: 2 } });
    const { result } = renderHook(() => useConversationList(seed));
    expect(listConversations).not.toHaveBeenCalled();
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items.length).toBe(51));
    expect(listConversations).toHaveBeenCalledWith(undefined, 2, expect.any(AbortSignal));
    expect(result.current.hasMore).toBe(false);
  });
  it('searches the server, not just the loaded titles', async () => {
    const seed = [row('recent')];
    vi.mocked(listConversations).mockResolvedValue({ items: [row('long ago')], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } });
    const { result } = renderHook(() => useConversationList(seed));
    act(() => result.current.setQuery('long ago'));
    await waitFor(() => expect(result.current.items[0]?.id).toBe('long ago'));
    expect(listConversations).toHaveBeenCalledWith('long ago', 1, expect.any(AbortSignal));
  });
  it('keeps loaded chats and permits retry after a failed next page', async () => {
    const seed = Array.from({ length: 50 }, (_, i) => row(String(i)));
    vi.mocked(listConversations).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useConversationList(seed));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.items).toEqual(seed);
    vi.mocked(listConversations).mockResolvedValueOnce({ items: [], meta: { total: 50, page: 2, limit: 50, totalPages: 1 } });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(listConversations).toHaveBeenLastCalledWith(undefined, 2, expect.any(AbortSignal));
  });
});
