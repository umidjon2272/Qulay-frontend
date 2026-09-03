import { createContext } from "react";

import type { AIAction } from "../actions/actionTypes";
import type { AIActionExecutionResult } from "../actions/actionExecutor";
import type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";
import type { Conversation } from "../../../services/api/conversationApi";

export type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type ChatMessage = {
  id: number;
  serverId?: string;
  isError?: boolean;
  role: "user" | "ai";
  text: string;
  time: string;
  action?: AIAction;
  actionStatus?: "pending" | "loading" | "success" | "cancelled" | "failed";
  actionResult?: string;
  telegramSelection?: TelegramSelection;
  streaming?: boolean;
  incomplete?: boolean;
  progress?: 'preparing' | 'checking_income' | 'searching_tasks' | 'waiting_confirmation' | 'executing';
};

export type AIChatContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string, options?: { voice?: boolean }) => void;
  stopResponse: () => void;
  executeAction: (action: AIAction) => Promise<AIActionExecutionResult>;
  cancelAction: (action: AIAction) => Promise<AIActionExecutionResult>;
  resolveTelegramSelection: (messageId: number, candidate: TelegramCandidate, selection: TelegramSelection) => Promise<void>;
  clearChat: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  historyLoading: boolean;
  historyError: string | null;
  historyLoadingMore: boolean;
  hasOlderMessages: boolean;
  loadOlderMessages: () => Promise<void>;
  retryHistory: () => Promise<void>;
  newChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  speakingId: number | null;
  speak: (id: number, text: string, voice?: 'marin' | 'cedar') => void;
  queueSpeech: (id: number, text: string, voice?: 'marin' | 'cedar') => void;
  stopSpeaking: () => void;
};

export const AIChatContext = createContext<AIChatContextValue | null>(null);
