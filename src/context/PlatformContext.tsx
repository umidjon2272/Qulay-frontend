import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { request } from "../services/api/apiClient";

const FALLBACK_NAME = "Qulay AI";
const CACHE_KEY = "qulay_platform_name";
const PLATFORM_CHANGED_EVENT = "qulay_platform_changed";

type PlatformContextValue = {
  name: string;
  refresh: () => Promise<void>;
};

const readCachedName = () => {
  if (typeof window === "undefined") return FALLBACK_NAME;
  const cached = window.localStorage.getItem(CACHE_KEY)?.trim();
  return cached && cached.length >= 2 ? cached : FALLBACK_NAME;
};

const PlatformContext = createContext<PlatformContextValue>({ name: FALLBACK_NAME, refresh: async () => undefined });

export const notifyPlatformNameChanged = (name: string) => {
  if (typeof window === "undefined") return;
  const normalized = name.trim() || FALLBACK_NAME;
  window.localStorage.setItem(CACHE_KEY, normalized);
  window.dispatchEvent(new CustomEvent(PLATFORM_CHANGED_EVENT, { detail: { name: normalized } }));
};

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const [name, setName] = useState(readCachedName);
  const refresh = useCallback(async () => {
    try {
      const response = await request<{ name: string }>("/health/platform", {}, false);
      const next = response?.name?.trim() || FALLBACK_NAME;
      setName(next);
      window.localStorage.setItem(CACHE_KEY, next);
    } catch {
      setName((current) => current || FALLBACK_NAME);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      const next = detail?.name?.trim();
      if (next) setName(next);
    };
    window.addEventListener(PLATFORM_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PLATFORM_CHANGED_EVENT, onChanged);
  }, []);
  useEffect(() => { document.title = name; }, [name]);

  const value = useMemo(() => ({ name, refresh }), [name, refresh]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export const usePlatform = () => useContext(PlatformContext);
