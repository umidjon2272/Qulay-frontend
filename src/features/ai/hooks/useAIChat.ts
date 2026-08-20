import { useContext } from "react";

import {
  AIChatContext,
  type AIChatContextValue,
} from "../context/AIChatContextValue";

export const useAIChat = (): AIChatContextValue => {
  const context = useContext(AIChatContext);

  if (!context) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }

  return context;
};
