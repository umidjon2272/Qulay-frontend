import { useContext } from "react";

import {
  IntegrationContext,
  type IntegrationContextValue,
} from "../context/IntegrationContextValue";

export const useIntegrations = (): IntegrationContextValue => {
  const context = useContext(IntegrationContext);

  if (!context) {
    throw new Error("useIntegrations must be used within an IntegrationProvider");
  }

  return context;
};
