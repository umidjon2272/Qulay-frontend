import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  integrationCatalog,
  type IntegrationId,
} from "../constants/integrations";
import {
  IntegrationContext,
  type IntegrationView,
} from "./IntegrationContextValue";
import {
  connectIntegration,
  disconnectIntegration,
  getIntegrationState,
  getGoogleStatus,
  getTelegramStatus,
} from "../services/integrationService";
import { subscribeToWorkspaceData } from "../services/workspaceEvents";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/useI18n";

export type ConnectionState = {
  connected: boolean;
  username?: string;
};

const loadState = (): Record<string, ConnectionState> =>
  getIntegrationState();

export const IntegrationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<Record<string, ConnectionState>>(loadState);
  const { showToast } = useToast();
  const { t } = useI18n();

  const refreshServerConnections = useCallback(async () => {
    const [telegram, google] = await Promise.allSettled([getTelegramStatus(), getGoogleStatus()]);
    setState((current) => {
      const next = { ...current };
      if (telegram.status === "fulfilled") {
        next.telegram = { connected: telegram.value.connected, username: telegram.value.username ?? telegram.value.displayName ?? undefined };
      }
      if (google.status === "fulfilled") {
        const account = google.value.email ?? google.value.displayName ?? undefined;
        next["google-calendar"] = { connected: Boolean(google.value.connected && google.value.calendarEnabled), username: account };
        next["google-drive"] = { connected: Boolean(google.value.connected && google.value.driveEnabled), username: account };
      }
      return next;
    });
  }, []);

  useEffect(() => subscribeToWorkspaceData("integrations", () => setState(loadState())), []);

  // Server-owned integrations remain connected across refreshes, devices and sessions.
  // A temporary network error preserves the last known status instead of showing "Ulanmagan".
  useEffect(() => {
    void refreshServerConnections();
    const refreshOnFocus = () => void refreshServerConnections();
    const refreshOnVisibility = () => { if (document.visibilityState === "visible") void refreshServerConnections(); };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refreshServerConnections]);

  const connect = useCallback(
    (id: IntegrationId, username: string) => {
      try {
        const connection = connectIntegration(id, username);
        setState((current) => ({ ...current, [id]: connection }));
        const integration = integrationCatalog.find((item) => item.id === id);
        showToast(t("integrations.connectedToast", "{{name}} ulandi", { name: integration?.name ?? t("integrations.generic", "Integratsiya") }), "success");
      } catch {
        showToast(t("integrations.saveError", "Integratsiyani saqlab bo'lmadi"), "error");
      }
    },
    [showToast, t],
  );

  const disconnect = useCallback(
    (id: IntegrationId) => {
      try {
        const connection = disconnectIntegration(id);
        setState((current) => ({ ...current, [id]: connection }));
        const integration = integrationCatalog.find((item) => item.id === id);
        showToast(t("integrations.disconnectedToast", "{{name}} uchun ulanish bekor qilindi", { name: integration?.name ?? t("integrations.generic", "Integratsiya") }), "info");
      } catch {
        showToast(t("integrations.statusSaveError", "Integratsiya holatini saqlab bo'lmadi"), "error");
      }
    },
    [showToast, t],
  );


  const sync = useCallback((id: IntegrationId, connected: boolean, username?: string) => {
    const connection = { connected, username: connected ? username?.trim() || undefined : undefined };
    setState((current) => {
      const previous = current[id];
      if (previous?.connected === connection.connected && previous?.username === connection.username) return current;
      return { ...current, [id]: connection };
    });
  }, []);

  const integrations = useMemo<IntegrationView[]>(
    () =>
      integrationCatalog.map((item) => ({
        ...item,
        connected: state[item.id]?.connected ?? false,
        username: state[item.id]?.username,
      })),
    [state],
  );

  const connectedCount = integrations.filter((item) => item.connected).length;

  const value = useMemo(
    () => ({ integrations, connectedCount, connect, disconnect, sync }),
    [integrations, connectedCount, connect, disconnect, sync],
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
};
