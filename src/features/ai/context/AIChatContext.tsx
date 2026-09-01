import { voiceApi, spokenText } from '../../../services/api/voiceApi';
import { cancelAIAction } from '../actions/actionExecutor';
import { getApiErrorMessage } from '../../../services/api/apiClient';
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
import { notifyWorkspaceDataChanged, subscribeToWorkspaceData, type WorkspaceResource } from "../../../services/workspaceEvents";
import { AUTH_SESSION_CHANGED, getAuthSession } from "../../../services/authService";
import { executeAIAction, type AIActionExecutionResult } from "../actions/actionExecutor";
import { isAIAction, type AIAction } from "../actions/actionTypes";
import { buildTelegramSendConfirmation } from "../router/chatRouter";
import { matchTelegramCandidate } from "../router/telegramCandidateSelection";
import type { TelegramSelection } from "../router/routerTypes";
import { getAIReply } from "../../../services/aiService";
import { addMessage as addConversationMessage, createConversation, deleteConversation as removeConversation, listConversations, listMessages, updateConversation } from "../../../services/api/conversationApi";
import type { Conversation } from "../../../services/api/conversationApi";
import { agentApi } from "../../../services/api/agentApi";
import { usePlatform } from "../../../context/PlatformContext";
import { getLocale, useI18n, type AppLocale } from "../../../i18n/useI18n";
import {
  AIChatContext,
  type ChatMessage,
  type TelegramCandidate,
} from "./AIChatContextValue";

const formatTime = () =>
  new Date().toLocaleTimeString(getLocale() === "ru" ? "ru-RU" : "uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

const createWelcomeMessage = (platformName = "Qulay AI", locale: AppLocale = "uz"): ChatMessage => ({
  id: 0,
  role: "ai",
  text: locale === "ru"
    ? `Здравствуйте! Я ${platformName}. Помогу с задачами, напоминаниями, встречами, заметками и планом на сегодня.`
    : `Assalomu alaykum! Men ${platformName}. Vazifa, eslatma, uchrashuv va qayd yaratish yoki bugungi rejangizni ko‘rishda yordam beraman.`,
  time: formatTime(),
});

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

// Scope cached history to its owner and keep the server conversation ID across reloads.
const loadStoredSession = (): { conversationId: string | null; messages: ChatMessage[] } | null => {
  const userId = getAuthSession()?.id;
  if (!userId || !getSettings().ai.saveHistory) return null;
  const stored = readStorage<unknown>(STORAGE_KEYS.aiChatHistory, null);
  if (!isRecord(stored) || stored.userId !== userId || !isChatHistory(stored.messages)) return null;
  return {
    conversationId: typeof stored.conversationId === "string" ? stored.conversationId : null,
    messages: stored.messages.slice(-MAX_CHAT_MESSAGES).map(message => message.actionStatus === "loading" ? { ...message, actionStatus: "pending" } : message),
  };
};

const loadStoredMessages = (welcomeMessage = createWelcomeMessage()): ChatMessage[] =>
  loadStoredSession()?.messages ?? [welcomeMessage];

const appendMessage = (messages: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const next = [...messages, message];
  if (next.length <= MAX_CHAT_MESSAGES) return next;

  return [next[0], ...next.slice(-(MAX_CHAT_MESSAGES - 1))];
};

export const AIChatProvider = ({ children }: { children: ReactNode }) => {
  const { name: platformName } = usePlatform();
  const { locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredMessages(createWelcomeMessage(platformName, locale)));
  const [isTyping, setIsTyping] = useState(false);
  const [saveHistory, setSaveHistory] = useState(() => getSettings().ai.saveHistory);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => loadStoredSession()?.conversationId ?? null);
  const sessionUserIdRef = useRef(getAuthSession()?.id ?? null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLoadingRef = useRef(false);
  const previousSaveHistoryRef = useRef(saveHistory);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const speechGenerationRef = useRef(0);
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
      setMessages([{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }]);
    } else if (!previousSaveHistoryRef.current) {
      setMessages(loadStoredMessages(createWelcomeMessage(platformName, locale)));
    }

    previousSaveHistoryRef.current = nextSaveHistory;
  }), [platformName, locale]);

  useEffect(() => {
    setMessages((current) => current.map((message, index) => index === 0 && message.id === 0 ? { ...message, text: createWelcomeMessage(platformName, locale).text } : message));
  }, [platformName, locale]);

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

  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);

  useEffect(() => {
    const userId = getAuthSession()?.id;
    if (saveHistory && userId === sessionUserIdRef.current && userId) writeStorage(STORAGE_KEYS.aiChatHistory, { userId, conversationId: activeConversationId, messages });
    else removeStorage(STORAGE_KEYS.aiChatHistory);
  }, [messages, saveHistory, activeConversationId]);

  const refreshConversations = useCallback(async () => {
    const userId = getAuthSession()?.id;
    if (!userId) { setConversations([]); return; }
    try {
      const result = await listConversations();
      if (mountedRef.current && getAuthSession()?.id === userId) setConversations(result.items);
    } catch {
      // Chat stays usable even if history API is temporarily unavailable.
    }
  }, []);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);

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

      speechRequestRef.current?.abort();
      audioRef.current?.pause();
      speechGenerationRef.current += 1;
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const handleAuthSessionChanged = () => {
      const userId = getAuthSession()?.id ?? null;
      if (userId === sessionUserIdRef.current) {
        void refreshConversations();
        return;
      }
      sessionUserIdRef.current = userId;
      generationRef.current += 1;
      speechRequestRef.current?.abort();
      audioRef.current?.pause();
      speechGenerationRef.current += 1;
      for (const controller of pendingRequestsRef.current.values()) controller.abort();
      pendingRequestsRef.current.clear();
      pendingTelegramSelectionRef.current = null;
      executedActionsRef.current.clear();
      executingActionsRef.current.clear();
      setMessages([{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }]);
      setConversations([]);
      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setIsTyping(false);
      setSpeakingId(null);
      if (userId) void refreshConversations();
    };

    window.addEventListener(AUTH_SESSION_CHANGED, handleAuthSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED, handleAuthSessionChanged);
  }, [refreshConversations, platformName, locale]);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const ensureConversation = useCallback(async (title: string): Promise<string | null> => {
    if (activeConversationIdRef.current) return activeConversationIdRef.current;
    if (!getSettings().ai.saveHistory || !getAuthSession()) return null;
    const generation = generationRef.current;
    try {
      const conversation = await createConversation(title.slice(0, 80));
      if (!mountedRef.current || generation !== generationRef.current) return null;
      activeConversationIdRef.current = conversation.id;
      if (mountedRef.current) {
        setActiveConversationId(conversation.id);
        setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      }
      return conversation.id;
    } catch { return null; }
  }, []);

  const persistConversationMessage = useCallback(async (conversationId: string | null, content: string, role: "USER" | "ASSISTANT") => {
    if (!conversationId || !getSettings().ai.saveHistory) return;
    try {
      await addConversationMessage(conversationId, content, role);
      void refreshConversations();
    } catch { /* History persistence is best-effort. */ }
  }, [refreshConversations]);

  const newChat = useCallback(() => {
    generationRef.current += 1;
    speechRequestRef.current?.abort();
    audioRef.current?.pause();
    speechGenerationRef.current += 1;
    for (const controller of pendingRequestsRef.current.values()) controller.abort();
    pendingRequestsRef.current.clear();
    pendingTelegramSelectionRef.current = null;
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    executedActionsRef.current.clear();
    executingActionsRef.current.clear();
    setMessages([{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }]);
    setIsTyping(false);
    setSpeakingId(null);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [platformName, locale]);

  const loadConversation = useCallback(async (id: string) => {
    if (!id || historyLoadingRef.current) return;
    historyLoadingRef.current = true;
    setHistoryLoading(true);
    const generation = ++generationRef.current;
    speechRequestRef.current?.abort();
    audioRef.current?.pause();
    speechGenerationRef.current += 1;
    for (const controller of pendingRequestsRef.current.values()) controller.abort();
    pendingRequestsRef.current.clear();
    try {
      const [result, pendingResult] = await Promise.all([listMessages(id, 1, 200), agentApi.listActions('PENDING',1,100).catch(()=>null)]);
      if (!mountedRef.current || generation !== generationRef.current) return;
      const loaded: ChatMessage[] = result.items
        .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
        .map((message, index) => ({
          id: index + 1,
          role: message.role === "USER" ? "user" as const : "ai" as const,
          text: message.content,
          time: new Date(message.createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }));
      const pending = pendingResult?.items.find((item)=>item.conversationId===id && Date.parse(item.expiresAt) > Date.now());
      if (pending) {
        const action: AIAction = { type:'confirmAgentAction', payload:{actionId:pending.id,tool:pending.toolName,preview:pending.preview}, label: locale==='ru'?'Действие AI':'AI amali', confirmationMessage: locale==='ru'?'Подтвердить действие?':'Amalni tasdiqlaysizmi?', success:locale==='ru'?'✅ Действие выполнено.':'✅ Amal bajarildi.', error:locale==='ru'?'Не удалось выполнить действие.':'Amalni bajarishda xatolik yuz berdi.' };
        const lastAiIndex=[...loaded].map((m,i)=>({m,i})).reverse().find(({m})=>m.role==='ai')?.i;
        if(lastAiIndex===undefined) loaded.push({id:loaded.length+1,role:'ai',text:action.confirmationMessage,time:formatTime(),action}); else loaded[lastAiIndex]={...loaded[lastAiIndex],action};
      }
      messageIdRef.current = loaded.length;
      const nextMessages = loaded.length ? [{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }, ...loaded] : [{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }];
      activeConversationIdRef.current = id;
      setActiveConversationId(id);
      setMessages(nextMessages);
      pendingTelegramSelectionRef.current = null;
      setIsTyping(false);
    } catch (error) {
      if (mountedRef.current && generation === generationRef.current) {
        setMessages(current => appendMessage(current, { id: ++messageIdRef.current, role: "ai", time: formatTime(), text: getApiErrorMessage(error, locale === "ru" ? "Не удалось открыть историю. Попробуйте ещё раз." : "Suhbat tarixini ochib bo‘lmadi. Qayta urinib ko‘ring.") }));
      }
    } finally {
      historyLoadingRef.current = false;
      if (mountedRef.current) setHistoryLoading(false);
      if (mountedRef.current && generation === generationRef.current) { setIsTyping(false); setSpeakingId(null); }
    }
  }, [platformName, locale]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const cleanTitle = title.trim().slice(0, 200);
    if (!cleanTitle) return;
    try {
      const updated = await updateConversation(id, cleanTitle);
      if (mountedRef.current) setConversations((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
    } catch {
      // Keep the current title if the API is temporarily unavailable.
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await removeConversation(id);
      setConversations((current) => current.filter((item) => item.id !== id));
      if (activeConversationIdRef.current === id) newChat();
    } catch { /* Keep current UI if delete failed. */ }
  }, [newChat]);


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
    if (pendingRequestsRef.current.size > 0 || executingActionsRef.current.size > 0 || historyLoadingRef.current) return;

    const pendingSelection = pendingTelegramSelectionRef.current;
    if (pendingSelection) {
      const conversationPromise = ensureConversation(trimmed);
      const userMessage: ChatMessage = { id: nextMessageId(), role: "user", text: trimmed, time: formatTime() };
      setMessages((current) => appendMessage(current, userMessage));
      void conversationPromise.then((id) => persistConversationMessage(id, trimmed, "USER"));
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

    const conversationPromise = ensureConversation(trimmed);
    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      text: trimmed,
      time: formatTime(),
    };

    setMessages((current) => appendMessage(current, userMessage));
    // The agent is the single writer of its user/assistant transcript.
    const preparedConversation = conversationPromise;
    setIsTyping(true);

    void preparedConversation.then((conversationId) => getAIReply(trimmed, { signal: controller.signal, conversationId }))
      .then((reply) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          controller.signal.aborted
        ) {
          return;
        }

        if (reply.resolvedActionStatus === "success") {
          (["tasks", "reminders", "calendarEvents", "notes", "finance", "contacts", "memories"] satisfies WorkspaceResource[]).forEach(notifyWorkspaceDataChanged);
        }
        if (reply.conversationId) {
          activeConversationIdRef.current = reply.conversationId;
          setActiveConversationId(reply.conversationId);
          void refreshConversations();
        }
        setMessages((current) => current.map((message) => {
          if (message.action?.type !== "confirmAgentAction") return message;
          if (message.action.payload.actionId === reply.resolvedActionId) return { ...message, actionStatus: reply.resolvedActionStatus ?? "success" };
          if (reply.action && (!message.actionStatus || message.actionStatus === "pending")) return { ...message, actionStatus: "cancelled" };
          return message;
        }));
        const aiMessage: ChatMessage = {
          id: nextMessageId(),
          role: "ai",
          text: reply.text,
          time: formatTime(),
          action: reply.action,
          telegramSelection: reply.telegramSelection,
        };

        setMessages((current) => appendMessage(current, aiMessage));
        if (!reply.serverPersisted) void conversationPromise.then(async (id) => { await persistConversationMessage(id, trimmed, "USER"); await persistConversationMessage(id, reply.text, "ASSISTANT"); });
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
            text: getApiErrorMessage(error, "Javobni olishning imkoni bo‘lmadi. Suhbatni qayta ochib holatini tekshiring."),
            time: formatTime(),
          }));
      })
      .finally(() => {
        pendingRequestsRef.current.delete(requestId);

        if (mountedRef.current && generation === generationRef.current) {
          setIsTyping(pendingRequestsRef.current.size > 0);
        }
      });
  }, [ensureConversation, persistConversationMessage, resolveTelegramSelection, refreshConversations]);

  const executeAction = useCallback(async (action: AIAction): Promise<AIActionExecutionResult> => {
    if (!mountedRef.current) {
      return { success: false, message: action.error };
    }

    const generation = generationRef.current;
    const conversationId = activeConversationIdRef.current;
    const actionKey = JSON.stringify(action);
    if (executedActionsRef.current.has(actionKey)) {
      return { success: true, message: "Bu amal allaqachon bajarilgan." };
    }
    if (executingActionsRef.current.has(actionKey)) {
      return { success: false, message: "Bu amal hozir bajarilmoqda." };
    }

    executingActionsRef.current.add(actionKey);
    setMessages(current => current.map(m => m.action && JSON.stringify(m.action) === actionKey ? { ...m, actionStatus: "loading" } : m));
    setIsTyping(true);

    try {
      const result = await executeAIAction(action);

      if (result.success) executedActionsRef.current.add(actionKey);

      if (mountedRef.current && generation === generationRef.current) {
        setMessages(current => appendMessage(current.map(m => m.action && JSON.stringify(m.action) === actionKey ? { ...m, actionStatus: result.success ? "success" : "failed" } : m), { id: nextMessageId(), role: "ai", text: result.message, time: formatTime() }));
        if (action.type !== "confirmAgentAction") void persistConversationMessage(conversationId, result.message, "ASSISTANT");
      }

      return result;
    } catch {
      return { success: false, message: action.error };
    } finally {
      executingActionsRef.current.delete(actionKey);
      if (mountedRef.current && generation === generationRef.current) {
        setIsTyping(pendingRequestsRef.current.size > 0);
      }
    }
  }, [persistConversationMessage]);

  const cancelAction = useCallback(async (action: AIAction): Promise<AIActionExecutionResult> => {
    const generation = generationRef.current;
    const actionKey = JSON.stringify(action);
    if (executingActionsRef.current.has(actionKey)) return { success: false, message: "Amal bajarilmoqda." };
    executingActionsRef.current.add(actionKey);
    try {
      const result = await cancelAIAction(action);
      if (mountedRef.current && generation === generationRef.current) setMessages(current => appendMessage(current.map(m => m.action && JSON.stringify(m.action) === actionKey ? { ...m, actionStatus: result.success ? "cancelled" : "failed" } : m), { id: nextMessageId(), role: "ai", text: result.message, time: formatTime() }));
      return result;
    } finally { executingActionsRef.current.delete(actionKey); }
  }, []);

  const clearChat = newChat;

  const stopSpeaking = useCallback(() => {
    speechGenerationRef.current += 1;
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    if (mountedRef.current) setSpeakingId(null);
  }, []);

  const speak = useCallback((id: number, text: string) => {
    stopSpeaking();
    const generation = speechGenerationRef.current;
    const controller = new AbortController();
    speechRequestRef.current = controller;
    setSpeakingId(id);
    // Chunk long answers at sentence boundaries; do not silently cut off the reply.
    const clean = spokenText(text);
    const chunks = clean.match(/.{1,1800}(?:[.!?]\s|$)|.{1,1800}/gs) ?? [clean];
    void (async () => {
      for (const chunk of chunks) {
        if (!chunk.trim() || controller.signal.aborted) return;
        const result = await voiceApi.speak(chunk, controller.signal);
        if (!mountedRef.current || generation !== speechGenerationRef.current) return;
        const audio = new Audio(`data:${result.mimeType};base64,${result.audio}`);
        audioRef.current = audio;
        await new Promise<void>((resolve, reject) => {
          const abort = () => { audio.pause(); resolve(); };
          controller.signal.addEventListener("abort", abort, { once: true });
          audio.onended = () => { controller.signal.removeEventListener("abort", abort); resolve(); };
          audio.onerror = () => { controller.signal.removeEventListener("abort", abort); reject(new Error("Audio playback failed")); };
          void audio.play().catch(reject);
        });
      }
    })().catch(() => {
      if (controller.signal.aborted || generation !== speechGenerationRef.current) return;
      // Surface playback/autoplay failures without silently pretending the answer was spoken.
      window.dispatchEvent(new CustomEvent("qulay:voice-error", { detail: locale === "ru" ? "Не удалось воспроизвести ответ. Нажмите значок звука, чтобы повторить." : "Ovozli javobni ijro qilib bo‘lmadi. Ovoz tugmasini bosib qayta urinib ko‘ring." }));
    }).finally(() => {
      if (mountedRef.current && generation === speechGenerationRef.current) { audioRef.current = null; setSpeakingId(null); }
    });
  }, [locale, stopSpeaking]);

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
      cancelAction,
      resolveTelegramSelection,
      clearChat,
      conversations,
      activeConversationId,
      historyLoading,
      newChat,
      loadConversation,
      deleteConversation,
      renameConversation,
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
      cancelAction,
      resolveTelegramSelection,
      clearChat,
      conversations,
      activeConversationId,
      historyLoading,
      newChat,
      loadConversation,
      deleteConversation,
      renameConversation,
      speakingId,
      speak,
      stopSpeaking,
    ],
  );

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};
