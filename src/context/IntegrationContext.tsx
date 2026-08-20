import {
  useCallback,
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
} from "../services/integrationService";
import { useToast } from "../hooks/useToast";

export type ConnectionState = {
  connected: boolean;
  username?: string;
};

const loadState = (): Record<string, ConnectionState> =>
  getIntegrationState();

export const IntegrationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<Record<string, ConnectionState>>(loadState);
  const { showToast } = useToast();

  const connect = useCallback(
    (id: IntegrationId, username: string) => {
      try {
        const connection = connectIntegration(id, username);
        setState((current) => ({ ...current, [id]: connection }));
        const integration = integrationCatalog.find((item) => item.id === id);
        showToast(`${integration?.name ?? "Integratsiya"} ulandi`, "success");
      } catch {
        showToast("Integratsiyani saqlab bo'lmadi", "error");
      }
    },
    [showToast],
  );

  const disconnect = useCallback(
    (id: IntegrationId) => {
      try {
        const connection = disconnectIntegration(id);
        setState((current) => ({ ...current, [id]: connection }));
        const integration = integrationCatalog.find((item) => item.id === id);
        showToast(`${integration?.name ?? "Integratsiya"} uchun ulanish bekor qilindi`, "info");
      } catch {
        showToast("Integratsiya holatini saqlab bo'lmadi", "error");
      }
    },
    [showToast],
  );

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
    () => ({ integrations, connectedCount, connect, disconnect }),
    [integrations, connectedCount, connect, disconnect],
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
};
