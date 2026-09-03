import { useCallback, useEffect, useRef, useState } from 'react';
import { listConversations, type Conversation } from '../../../services/api/conversationApi';
import { getStoredUser } from '../../../services/api/tokenStorage';

/** The sidebar and mobile history share the same server search/page contract. */
export function useConversationList(seed: Conversation[], active = true) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(seed);
  const [hasMore, setHasMore] = useState(seed.length >= 50);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = useRef(1);
  const pending = useRef<AbortController | null>(null);
  const fetchPage = useCallback(async (search: string, next: number) => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const owner = getStoredUser()?.id;
    setLoading(true); setFailed(false);
    try {
      const result = await listConversations(search || undefined, next, controller.signal);
      if (controller.signal.aborted || getStoredUser()?.id !== owner) return;
      setItems(previous => next === 1 ? result.items : [...new Map([...previous, ...result.items].map(item => [item.id, item])).values()]);
      page.current = next;
      setHasMore(next * 50 < (result.meta?.total ?? next * 50));
    } catch { if (!controller.signal.aborted && getStoredUser()?.id === owner) setFailed(true); }
    finally { if (pending.current === controller) { pending.current = null; setLoading(false); } }
  }, []);
  useEffect(() => {
    pending.current?.abort(); pending.current = null;
    setLoading(false); setFailed(false); page.current = 1;
    if (!active || !query.trim()) { setItems(seed); setHasMore(seed.length >= 50); return; }
    setItems([]); setHasMore(false); setLoading(true);
    const timer = setTimeout(() => void fetchPage(query.trim(), 1), 250);
    return () => { clearTimeout(timer); pending.current?.abort(); };
  }, [active, query, seed, fetchPage]);
  useEffect(() => () => { pending.current?.abort(); }, []);
  const loadMore = () => { if (!pending.current && active) void fetchPage(query.trim(), failed && !items.length ? 1 : page.current + 1); };
  return { query, setQuery, items, hasMore, loading, failed, loadMore };
}
