import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { STORAGE_KEYS } from "../../../constants/storageKeys";
import { readStorage, removeStorage, writeStorage } from "../../../services/storage";
import { getSettings } from "../../../services/settingsService";
import { subscribeToWorkspaceData } from "../../../services/workspaceEvents";
import { AUTH_SESSION_CHANGED, getAuthSession } from "../../../services/authService";
import { executeAIAction, type AIActionExecutionResult } from "../actions/actionExecutor";
import { isAIAction, type AIAction } from "../actions/actionTypes";
import { buildTelegramSendConfirmation } from "../router/chatRouter";
import { matchTelegramCandidate } from "../router/telegramCandidateSelection";
import type { TelegramSelection } from "../router/routerTypes";
import { getAIReply } from "../../../services/aiService";
import {
  AIChatContext,
  type ChatMessage,
  type TelegramCandidate,
} from "./AIChatContextValue";

const formatTime = () =>
  new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

const welcomeMessage: ChatMessage = {
  id: 0,
  role: "ai",
  text: "Assalomu alaykum! Men Qulay AI. Vazifa, eslatma, uchrashuv va qayd yaratish yoki bugungi rejangizni ko‘rishda yordam beraman.",
  time: formatTime(),
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CHAT_MESSAGES = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTelegramSelection = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (
    !isRecord(value) ||
    (value.mode !== "search_result" && value.mode !== "send_recipient") ||
    !Array.isArray(value.candidates) ||
    (value.mode === "send_recipient" && typeof value.pendingText !== "string")
  ) return false;

  return value.candidates.every((candidate) => {
    if (!isRecord(candidate)) return false;
    return (
      typeof candidate.peerId === "string" &&
      (candidate.type === "USER" || candidate.type === "GROUP" || candidate.type === "CHANNEL") &&
      typeof candidate.displayName === "string" &&
      (candidate.username === null || typeof candidate.username === "string")
    );
  });
};

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) return false;

  const isAction = value.action === undefined || isAIAction(value.action);

  return (
    typeof value.id === "number" &&
    (value.role === "user" || value.role === "ai") &&
    typeof value.text === "string" &&
    typeof value.time === "string" &&
    isAction &&
    isTelegramSelection(value.telegramSelection)
  );
};

const isChatHistory = (value: unknown): value is ChatMessage[] =>
  Array.isArray(value) && value.length > 0 && value.every(isChatMessage);

const loadStoredMessages = (): ChatMessage[] => {
  if (!getSettings().ai.saveHistory) return [welcomeMessage];

  const stored = readStorage(STORAGE_KEYS.aiChatHistory, [welcomeMessage], isChatHistory);
  if (stored.length <= MAX_CHAT_MESSAGES) return stored;

  return [stored[0], ...stored.slice(-(MAX_CHAT_MESSAGES - 1))];
};

const appendMessage = (messages: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const next = [...messages, message];
  if (next.length <= MAX_CHAT_MESSAGES) return next;

  return [next[0], ...next.slice(-(MAX_CHAT_MESSAGES - 1))];
};

export const AIChatProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [saveHistory, setSaveHistory] = useState(() => getSettings().ai.saveHistory);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const previousSaveHistoryRef = useRef(saveHistory);

  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const messageIdRef = useRef(0);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map<number, AbortController>());
  const executedActionsRef = useRef(new Set<string>());
  const executingActionsRef = useRef(new Set<string>());
  const pendingTelegramSelectionRef = useRef<{ messageId: number; selection: TelegramSelection } | null>(null);

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    const nextSaveHistory = getSettings().ai.saveHistory;
    setSaveHistory(nextSaveHistory);

    if (!nextSaveHistory) {
      removeStorage(STORAGE_KEYS.aiChatHistory);
      setMessages([{ ...welcomeMessage, id: 0, time: formatTime() }]);
    } else if (!previousSaveHistoryRef.current) {
      setMessages(loadStoredMessages());
    }

    previousSaveHistoryRef.current = nextSaveHistory;
  }), []);

  useEffect(() => {
    messageIdRef.current = messages.reduce(
      (max, message) => Math.max(max, message.id),
      0,
    );
    const pending = [...messages].reverse().find((message) => message.telegramSelection);
    pendingTelegramSelectionRef.current = pending?.telegramSelection
      ? { messageId: pending.id, selection: pending.telegramSelection }
      : null;
  }, [messages]);

  useEffect(() => {
    if (saveHistory) writeStorage(STORAGE_KEYS.aiChatHistory, messages);
    else removeStorage(STORAGE_KEYS.aiChatHistory);
  }, [messages, saveHistory]);

  useEffect(() => {
    mountedRef.current = true;

    const pendingRequests = pendingRequestsRef.current;

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;

      for (const controller of pendingRequests.values()) {
        controller.abort();
      }

      pendingRequests.clear();

      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const clearForSignedOutUser = () => {
      if (getAuthSession()) return;
      generationRef.current += 1;
      for (const controller of pendingRequestsRef.current.values()) controller.abort();
      pendingRequestsRef.current.clear();
      pendingTelegramSelectionRef.current = null;
      executedActionsRef.current.clear();
      executingActionsRef.current.clear();
      setMessages([{ ...welcomeMessage, id: 0, time: formatTime() }]);
      setIsTyping(false);
      setSpeakingId(null);
    };

    window.addEventListener(AUTH_SESSION_CHANGED, clearForSignedOutUser);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED, clearForSignedOutUser);
  }, []);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const resolveTelegramSelection = useCallback(async (
    messageId: number,
    candidate: TelegramCandidate,
    selection: TelegramSelection,
  ): Promise<void> => {
    if (!mountedRef.current) return;
    pendingTelegramSelectionRef.current = null;
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, telegramSelection: undefined } : message
    )));

    if (selection.mode === "search_result") {
      const username = candidate.username
        ? ` (${candidate.username.startsWith("@") ? candidate.username : `@${candidate.username}`})`
        : "";
      setMessages((current) => appendMessage(current, {
        id: nextMessageId(), role: "ai",
        text: `Tanlandi: ${candidate.displayName}${username}`,
        time: formatTime(),
      }));
      return;
    }

    if (!selection.pendingText) return;
    setIsTyping(true);
    try {
      const reply = await buildTelegramSendConfirmation(candidate, selection.pendingText);
      if (!mountedRef.current) return;
      setMessages((current) => appendMessage(current, {
        id: nextMessageId(), role: "ai", text: reply.text,
        time: formatTime(), action: reply.action,
      }));
    } catch {
      if (!mountedRef.current) return;
      setMessages((current) => appendMessage(current, {
        id: nextMessageId(), role: "ai",
        text: "Telegram xabarini tayyorlashda xatolik yuz berdi.", time: formatTime(),
      }));
    } finally {
      if (mountedRef.current) setIsTyping(pendingRequestsRef.current.size > 0);
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed || !mountedRef.current) return;
    if (pendingRequestsRef.current.size > 0) return;

    const pendingSelection = pendingTelegramSelectionRef.current;
    if (pendingSelection) {
      const userMessage: ChatMessage = { id: nextMessageId(), role: "user", text: trimmed, time: formatTime() };
      setMessages((current) => appendMessage(current, userMessage));
      const candidate = matchTelegramCandidate(trimmed, pendingSelection.selection.candidates);
      if (candidate) {
        void resolveTelegramSelection(pendingSelection.messageId, candidate, pendingSelection.selection);
      } else {
        setMessages((current) => appendMessage(current, {
          id: nextMessageId(), role: "ai",
          text: "Tanlovni raqam, aniq ism yoki @username bilan kiriting.", time: formatTime(),
        }));
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    const generation = generationRef.current;
    const controller = new AbortController();
    pendingRequestsRef.current.set(requestId, controller);

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      text: trimmed,
      time: formatTime(),
    };

    setMessages((current) => appendMessage(current, userMessage));
    setIsTyping(true);

    void getAIReply(trimmed, { signal: controller.signal })
      .then((reply) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          controller.signal.aborted
        ) {
          return;
        }

        const aiMessage: ChatMessage = {
          id: nextMessageId(),
          role: "ai",
          text: reply.text,
          time: formatTime(),
          action: reply.action,
          telegramSelection: reply.telegramSelection,
        };

        setMessages((current) => appendMessage(current, aiMessage));
      })
      .catch((error: unknown) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          controller.signal.aborted ||
          (isRecord(error) && error.name === "AbortError")
        ) {
          return;
        }

        setMessages((current) => appendMessage(current, {
            id: nextMessageId(),
            role: "ai",
            text: "Kechirasiz, hozir javob tayyorlashda muammo yuz berdi. Iltimos, yana urinib ko'ring.",
            time: formatTime(),
          }));
      })
      .finally(() => {
        pendingRequestsRef.current.delete(requestId);

        if (mountedRef.current && generation === generationRef.current) {
          setIsTyping(pendingRequestsRef.current.size > 0);
        }
      });
  }, [resolveTelegramSelection]);

  const executeAction = useCallback(async (action: AIAction): Promise<AIActionExecutionResult> => {
    if (!mountedRef.current) {
      return { success: false, message: action.error };
    }

    const actionKey = JSON.stringify(action);
    if (executedActionsRef.current.has(actionKey)) {
      return { success: true, message: "Bu amal allaqachon bajarilgan." };
    }
    if (executingActionsRef.current.has(actionKey)) {
      return { success: false, message: "Bu amal hozir bajarilmoqda." };
    }

    executingActionsRef.current.add(actionKey);
    setIsTyping(true);

    try {
      const result = await executeAIAction(action);

      if (result.success) executedActionsRef.current.add(actionKey);

      if (mountedRef.current) {
        setMessages((current) => appendMessage(current, {
            id: nextMessageId(),
            role: "ai",
            text: result.message,
            time: formatTime(),
          }));
      }

      return result;
    } catch {
      const result = { success: false, message: action.error };

      if (mountedRef.current) {
        setMessages((current) => appendMessage(current, {
            id: nextMessageId(),
            role: "ai",
            text: result.message,
            time: formatTime(),
          }));
      }

      return result;
    } finally {
      executingActionsRef.current.delete(actionKey);
      if (mountedRef.current) {
        setIsTyping(pendingRequestsRef.current.size > 0);
      }
    }
  }, []);

  const clearChat = useCallback(() => {
    generationRef.current += 1;

    for (const controller of pendingRequestsRef.current.values()) {
      controller.abort();
    }

    pendingRequestsRef.current.clear();
    pendingTelegramSelectionRef.current = null;
    executedActionsRef.current.clear();
    executingActionsRef.current.clear();
    setMessages([{ ...welcomeMessage, id: 0, time: formatTime() }]);
    setIsTyping(false);
    setSpeakingId(null);

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const speak = useCallback((id: number, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "uz-UZ";
    utterance.onend = () => {
      if (mountedRef.current) setSpeakingId(null);
    };
    utterance.onerror = () => {
      if (mountedRef.current) setSpeakingId(null);
    };

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    if (mountedRef.current) setSpeakingId(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      messages,
      isTyping,
      sendMessage,
      executeAction,
      resolveTelegramSelection,
      clearChat,
      speakingId,
      speak,
      stopSpeaking,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      messages,
      isTyping,
      sendMessage,
      executeAction,
      resolveTelegramSelection,
      clearChat,
      speakingId,
      speak,
      stopSpeaking,
    ],
  );

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};
