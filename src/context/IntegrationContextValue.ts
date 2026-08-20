import { createContext } from "react";

import type { IntegrationDefinition, IntegrationId } from "../constants/integrations";

export type IntegrationView = IntegrationDefinition & {
  connected: boolean;
  username?: string;
};

export type IntegrationContextValue = {
  integrations: IntegrationView[];
  connectedCount: number;
  connect: (id: IntegrationId, username: string) => void;
  disconnect: (id: IntegrationId) => void;
};

export const IntegrationContext = createContext<IntegrationContextValue | null>(null);
