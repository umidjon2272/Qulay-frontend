import { createContext } from "react";

import type { AIAction } from "../actions/actionTypes";
import type { AIActionExecutionResult } from "../actions/actionExecutor";

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  action?: AIAction;
};

export type AIChatContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
  executeAction: (action: AIAction) => Promise<AIActionExecutionResult>;
  clearChat: () => void;
  speakingId: number | null;
  speak: (id: number, text: string) => void;
  stopSpeaking: () => void;
};

export const AIChatContext = createContext<AIChatContextValue | null>(null);
