import { createContext } from "react";

import type { AIAction } from "../actions/actionTypes";
import type { AIActionExecutionResult } from "../actions/actionExecutor";
import type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
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
  resolveTelegramSelection: (messageId: number, candidate: TelegramCandidate, pendingText: string) => Promise<void>;
  clearChat: () => void;
  speakingId: number | null;
  speak: (id: number, text: string) => void;
  stopSpeaking: () => void;
};

export const AIChatContext = createContext<AIChatContextValue | null>(null);
