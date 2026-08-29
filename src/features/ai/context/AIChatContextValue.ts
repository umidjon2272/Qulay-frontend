import { createContext } from "react";

import type { AIAction } from "../actions/actionTypes";
import type { AIActionExecutionResult } from "../actions/actionExecutor";
import type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";
import type { Conversation } from "../../../services/api/conversationApi";

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
  resolveTelegramSelection: (messageId: number, candidate: TelegramCandidate, selection: TelegramSelection) => Promise<void>;
  clearChat: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  historyLoading: boolean;
  newChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  speakingId: number | null;
  speak: (id: number, text: string) => void;
  stopSpeaking: () => void;
};

export const AIChatContext = createContext<AIChatContextValue | null>(null);
