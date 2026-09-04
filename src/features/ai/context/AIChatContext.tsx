import { voiceApi, spokenText } from '../../../services/api/voiceApi';
import { playVoiceAudio, prepareAudioPlayback } from '../../../services/audioPlayback';
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

const isConversation = (value: unknown): value is Conversation =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const loadStoredConversations = (): Conversation[] => {
  const userId = getAuthSession()?.id;
  if (!userId) return [];
  const stored = readStorage<unknown>(STORAGE_KEYS.aiConversationList, null);
  if (!isRecord(stored) || stored.userId !== userId || !Array.isArray(stored.items)) return [];
  return stored.items.filter(isConversation).slice(0, 50);
};

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
  return [...messages, message];
};

export const AIChatProvider = ({ children }: { children: ReactNode }) => {
  const { name: platformName } = usePlatform();
  const { locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredMessages(createWelcomeMessage(platformName, locale)));
  const [isTyping, setIsTyping] = useState(false);
  const [saveHistory, setSaveHistory] = useState(() => getSettings().ai.saveHistory);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(() => loadStoredConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => loadStoredSession()?.conversationId ?? null);
  const sessionUserIdRef = useRef(getAuthSession()?.id ?? null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const historyCursorRef = useRef<string | null>(null);
  const historyMoreRef = useRef(false);
  const requestedHistoryRef = useRef<string | null>(null);
  const historyLoadingRef = useRef(false);
  const previousSaveHistoryRef = useRef(saveHistory);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const speechGenerationRef = useRef(0);
  const speechQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queuedSpeechCountRef = useRef(0);
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
      removeStorage(STORAGE_KEYS.aiConversationList);
      setConversations([]);
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
    if (saveHistory && userId === sessionUserIdRef.current && userId) writeStorage(STORAGE_KEYS.aiChatHistory, { userId, conversationId: activeConversationId, messages: messages.slice(-MAX_CHAT_MESSAGES) });
    else removeStorage(STORAGE_KEYS.aiChatHistory);
  }, [messages, saveHistory, activeConversationId]);

  useEffect(() => {
    const userId = getAuthSession()?.id;
    if (userId && userId === sessionUserIdRef.current) {
      writeStorage(STORAGE_KEYS.aiConversationList, { userId, items: conversations.slice(0, 50) });
    }
  }, [conversations]);

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
      historyLoadingRef.current = false; historyMoreRef.current = false; historyCursorRef.current = null; requestedHistoryRef.current = null;
      setHistoryLoading(false); setHistoryLoadingMore(false); setHasOlderMessages(false); setHistoryError(null);
      speechRequestRef.current?.abort();
      audioRef.current?.pause();
      speechGenerationRef.current += 1;
      for (const controller of pendingRequestsRef.current.values()) controller.abort();
      pendingRequestsRef.current.clear();
      pendingTelegramSelectionRef.current = null;
      executedActionsRef.current.clear();
      executingActionsRef.current.clear();
      setMessages([{ ...createWelcomeMessage(platformName, locale), id: 0, time: formatTime() }]);
      setConversations(loadStoredConversations());
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
    historyLoadingRef.current = false;
    historyMoreRef.current = false;
    historyCursorRef.current = null;
    requestedHistoryRef.current = null;
    setHistoryLoading(false); setHistoryLoadingMore(false); setHasOlderMessages(false); setHistoryError(null);
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
    if (!id) return;
    const preserveCurrentIfEmpty = activeConversationIdRef.current === id;
    requestedHistoryRef.current = id;
    historyLoadingRef.current = true;
    historyMoreRef.current = false;
    setHistoryLoadingMore(false);
    setHistoryError(null);
    setHistoryLoading(true);
    const generation = ++generationRef.current;
    speechRequestRef.current?.abort();
    audioRef.current?.pause();
    speechGenerationRef.current += 1;
    for (const controller of pendingRequestsRef.current.values()) controller.abort();
    pendingRequestsRef.current.clear();
    try {
      const [result, pendingResult] = await Promise.all([listMessages(id, 1, 50), agentApi.listActions('PENDING',1,100).catch(()=>null)]);
      if (!mountedRef.current || generation !== generationRef.current) return;
      const loaded: ChatMessage[] = result.items
        .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
        .map((message) => ({
          id: ++messageIdRef.current,
          serverId: message.id,
          role: message.role === "USER" ? "user" as const : "ai" as const,
          text: message.content,
          incomplete: message.isComplete === false,
          time: new Date(message.createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }));
      const pending = pendingResult?.items.find((item)=>item.conversationId===id && Date.parse(item.expiresAt) > Date.now());
      if (pending) {
        const action: AIAction = { type:'confirmAgentAction', payload:{actionId:pending.id,tool:pending.toolName,preview:pending.preview}, label: locale==='ru'?'Действие AI':'AI amali', confirmationMessage: locale==='ru'?'Подтвердить действие?':'Amalni tasdiqlaysizmi?', success:locale==='ru'?'✅ Действие выполнено.':'✅ Amal bajarildi.', error:locale==='ru'?'Не удалось выполнить действие.':'Amalni bajarishda xatolik yuz berdi.' };
        const lastAiIndex=[...loaded].map((m,i)=>({m,i})).reverse().find(({m})=>m.role==='ai')?.i;
        if(lastAiIndex===undefined) loaded.push({id:++messageIdRef.current,role:'ai',text:action.confirmationMessage,time:formatTime(),action}); else loaded[lastAiIndex]={...loaded[lastAiIndex],action};
      }
      const nextMessages = loaded;
      historyCursorRef.current = result.meta.nextCursor ?? null;
      setHasOlderMessages(Boolean(result.meta.hasMore));
      activeConversationIdRef.current = id;
      setActiveConversationId(id);
      setMessages((current) => {
        const hasCachedMessages = current.some((message) => message.id !== 0);
        if (nextMessages.length === 0 && preserveCurrentIfEmpty && hasCachedMessages) return current;
        return nextMessages;
      });
      pendingTelegramSelectionRef.current = null;
      setIsTyping(false);
    } catch {
      if (mountedRef.current && generation === generationRef.current) {
        setHistoryError(locale === "ru" ? "Не удалось загрузить историю. Повторите попытку." : "Suhbat tarixi yuklanmadi. Qayta urinib ko‘ring.");
      }
    } finally {
      if (mountedRef.current && generation === generationRef.current) { historyLoadingRef.current = false; setHistoryLoading(false); setIsTyping(false); setSpeakingId(null); }
    }
  }, [locale]);

  const loadOlderMessages = useCallback(async () => {
    const id = activeConversationIdRef.current;
    const before = historyCursorRef.current;
    if (!id || !before || historyMoreRef.current || historyLoadingRef.current) return;
    const generation = generationRef.current;
    historyMoreRef.current = true; setHistoryLoadingMore(true); setHistoryError(null);
    try {
      const result = await listMessages(id, 1, 50, before);
      if (!mountedRef.current || generation !== generationRef.current) return;
      const older: ChatMessage[] = result.items.filter(m => m.role === 'USER' || m.role === 'ASSISTANT').map(m => ({
        id: ++messageIdRef.current, serverId: m.id, role: m.role === 'USER' ? 'user' : 'ai', text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' }), incomplete: m.isComplete === false,
      }));
      setMessages(current => { const ids = new Set(current.map(m => m.serverId)); return [...older.filter(m => !ids.has(m.serverId)), ...current]; });
      historyCursorRef.current = result.meta.nextCursor ?? null;
      setHasOlderMessages(Boolean(result.meta.hasMore));
    } catch {
      if (mountedRef.current && generation === generationRef.current) setHistoryError(locale === 'ru' ? 'Не удалось загрузить предыдущие сообщения.' : 'Oldingi xabarlar yuklanmadi.');
    } finally {
      if (mountedRef.current && generation === generationRef.current) { historyMoreRef.current = false; setHistoryLoadingMore(false); }
    }
  }, [locale]);

  const retryHistory = useCallback(async () => {
    if (requestedHistoryRef.current && requestedHistoryRef.current !== activeConversationIdRef.current) await loadConversation(requestedHistoryRef.current);
    else if (historyCursorRef.current) await loadOlderMessages();
    else if (requestedHistoryRef.current) await loadConversation(requestedHistoryRef.current);
  }, [loadConversation, loadOlderMessages]);

  useEffect(() => {
    const storedId = loadStoredSession()?.conversationId;
    if (storedId) void loadConversation(storedId);
    // Restore the selected server conversation once; cache is only a warm preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const sendMessage = useCallback((text: string, options?: { voice?: boolean }) => {
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

    // Agent chat creates its own conversation atomically with the first turn;
    // no extra POST is needed before the model can start answering.
    const conversationPromise = Promise.resolve(activeConversationIdRef.current);
    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      text: trimmed,
      time: formatTime(),
    };

    const streamMessageId = nextMessageId();

    setMessages((current) => appendMessage(appendMessage(current, userMessage), {
      id: streamMessageId, role: 'ai', text: '', time: formatTime(), streaming: true, progress: 'preparing',
    }));
    // The agent is the single writer of its user/assistant transcript.
    const preparedConversation = conversationPromise;
    setIsTyping(true);

    void preparedConversation.then((conversationId) => getAIReply(trimmed, {
      voice: options?.voice,
      signal: controller.signal,
      conversationId,
      onDelta: (delta) => {
        if (!mountedRef.current || generation !== generationRef.current || controller.signal.aborted) return;
        setMessages(current => current.map(message => message.id === streamMessageId
          ? { ...message, text: message.text + delta, progress: undefined }
          : message));
      },
      onStatus: (progress) => {
        if (!mountedRef.current || generation !== generationRef.current || controller.signal.aborted) return;
        setMessages(current => current.map(message => message.id === streamMessageId ? { ...message, progress } : message));
      },
    }))
      .then((reply) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          controller.signal.aborted
        ) {
          return;
        }

        if (reply.resolvedActionStatus === "success") {
          (["tasks", "reminders", "calendarEvents", "notes", "finance", "contacts", "memories", "files", "integrations"] satisfies WorkspaceResource[]).forEach(notifyWorkspaceDataChanged);
        }
        if (reply.conversationId) {
          activeConversationIdRef.current = reply.conversationId;
          setActiveConversationId(reply.conversationId);
          void refreshConversations();
        }
        setMessages((current) => current.map((message) => {
          if (message.action?.type !== "confirmAgentAction") return message;
          if (message.action.payload.actionId === reply.resolvedActionId) return { ...message, text: reply.text, actionResult: reply.text, actionStatus: reply.resolvedActionStatus ?? "success" };
          if (reply.action && (!message.actionStatus || message.actionStatus === "pending")) return { ...message, actionStatus: "cancelled" };
          return message;
        }));
        const aiMessage: ChatMessage = {
          id: streamMessageId,
          role: "ai",
          text: reply.text,
          time: formatTime(),
          action: reply.action,
          telegramSelection: reply.telegramSelection,
        };

        pendingTelegramSelectionRef.current = reply.telegramSelection
          ? { messageId: streamMessageId, selection: reply.telegramSelection }
          : null;

        if (!reply.resolvedActionId) setMessages((current) => current.map(message => message.id === streamMessageId ? aiMessage : message));
        else setMessages(current => current.filter(message => message.id !== streamMessageId));
        if (!reply.serverPersisted) void conversationPromise.then(async (id) => { await persistConversationMessage(id, trimmed, "USER"); await persistConversationMessage(id, reply.text, "ASSISTANT"); });
      })
      .catch((error: unknown) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          controller.signal.aborted ||
          (isRecord(error) && error.name === "AbortError")
        ) {
          setMessages(current => current.map(message => message.id === streamMessageId && message.text
            ? { ...message, streaming: false, incomplete: true, progress: undefined }
            : message).filter(message => message.id !== streamMessageId || Boolean(message.text)));
          return;
        }

        setMessages(current => current.map(message => message.id !== streamMessageId ? message
          : message.text ? { ...message, streaming: false, incomplete: true, progress: undefined }
          : { ...message, streaming: false, progress: undefined, isError: true,
            text: getApiErrorMessage(error, getSettings().language === 'Русский' ? 'Не удалось получить ответ. Повторите попытку.' : 'Javobni olishning imkoni bo‘lmadi. Qayta urinib ko‘ring.') }));
      })
      .finally(() => {
        pendingRequestsRef.current.delete(requestId);

        if (mountedRef.current && generation === generationRef.current) {
          setIsTyping(pendingRequestsRef.current.size > 0);
        }
      });
  }, [ensureConversation, persistConversationMessage, resolveTelegramSelection, refreshConversations]);

  const stopResponse = useCallback(() => {
    for (const controller of pendingRequestsRef.current.values()) controller.abort();
    pendingRequestsRef.current.clear();
    setIsTyping(false);
    setMessages(current => current.map(message => message.streaming ? { ...message, streaming: false, incomplete: true, progress: undefined } : message));
  }, []);

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
        setMessages(current => current.map(m => m.action && JSON.stringify(m.action) === actionKey ? { ...m, text: result.message, actionStatus: result.success ? "success" : "failed", actionResult: result.message } : m));
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
      if (mountedRef.current && generation === generationRef.current) setMessages(current => current.map(m => m.action && JSON.stringify(m.action) === actionKey ? { ...m, text: result.message, actionStatus: result.success ? "cancelled" : "failed", actionResult: result.message } : m));
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
    speechQueueRef.current = Promise.resolve();
    queuedSpeechCountRef.current = 0;
    if (mountedRef.current) setSpeakingId(null);
  }, []);
const queueSpeech = useCallback(
  (id: number, text: string, voice?: 'marin' | 'cedar') => {
    const clean = spokenText(text).trim();
    if (!clean) return;

    if (
      !speechRequestRef.current ||
      speechRequestRef.current.signal.aborted
    ) {
      speechRequestRef.current = new AbortController();
    }

    const controller = speechRequestRef.current;
    const generation = speechGenerationRef.current;

    queuedSpeechCountRef.current += 1;
    setSpeakingId(id);

    // Keyingi audio navbatni kutmasdan oldindan tayyorlanadi.
    const audioPromise = voiceApi.speak(
      clean,
      controller.signal,
      voice,
    );

    speechQueueRef.current = speechQueueRef.current
      .then(async () => {
        if (
          controller.signal.aborted ||
          generation !== speechGenerationRef.current
        ) {
          return;
        }

        const result = await audioPromise;

        if (
          controller.signal.aborted ||
          generation !== speechGenerationRef.current
        ) {
          return;
        }

        await playVoiceAudio(result.audio, controller.signal);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          window.dispatchEvent(
            new CustomEvent('qulay:voice-error', {
              detail: 'Ovozli javobni ijro qilib bo‘lmadi.',
            }),
          );
        }
      })
      .finally(() => {
        queuedSpeechCountRef.current = Math.max(
          0,
          queuedSpeechCountRef.current - 1,
        );

        if (
          mountedRef.current &&
          generation === speechGenerationRef.current &&
          queuedSpeechCountRef.current === 0
        ) {
          setSpeakingId(null);
        }
      });
  },
  [],
);

const speak = useCallback(
  (id: number, text: string, voice?: 'marin' | 'cedar') => {
    stopSpeaking();

    // Start resume synchronously while a manual button click still has activation.
    const ready = prepareAudioPlayback();
    const generation = speechGenerationRef.current;
    const controller = new AbortController();

    speechRequestRef.current = controller;
    setSpeakingId(id);

    // Chunk long answers at sentence boundaries; do not silently cut off the reply.
    const clean = spokenText(text);
    const chunks =
      clean.match(/.{1,1800}(?:[.!?]\s|$)|.{1,1800}/gs) ?? [clean];

    void (async () => {
      await ready;

      for (const chunk of chunks) {
        if (!chunk.trim() || controller.signal.aborted) return;

        const result = await voiceApi.speak(
          chunk,
          controller.signal,
          voice,
        );

        if (
          !mountedRef.current ||
          generation !== speechGenerationRef.current
        ) {
          return;
        }

        await playVoiceAudio(result.audio, controller.signal);
      }
    })()
      .catch(() => {
        if (
          controller.signal.aborted ||
          generation !== speechGenerationRef.current
        ) {
          return;
        }

        window.dispatchEvent(
          new CustomEvent('qulay:voice-error', {
            detail:
              locale === 'ru'
                ? 'Не удалось воспроизвести ответ. Нажмите значок звука, чтобы повторить.'
                : 'Ovozli javobni ijro qilib bo‘lmadi. Ovoz tugmasini bosib qayta urinib ko‘ring.',
          }),
        );
      })
      .finally(() => {
        if (
          mountedRef.current &&
          generation === speechGenerationRef.current
        ) {
          audioRef.current = null;
          setSpeakingId(null);
        }
      });
  },
  [locale, stopSpeaking],
);

const value = useMemo(
  () => ({
    isOpen,
    open,
    close,
    toggle,
    messages,
    isTyping,
    sendMessage,
    stopResponse,
    executeAction,
    cancelAction,
    resolveTelegramSelection,
    clearChat,
    conversations,
    activeConversationId,
    historyLoading,
    historyError,
    historyLoadingMore,
    hasOlderMessages,
    loadOlderMessages,
    retryHistory,
    newChat,
    loadConversation,
    deleteConversation,
    renameConversation,
    speakingId,
    speak,
    queueSpeech,
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
    stopResponse,
    executeAction,
    cancelAction,
    resolveTelegramSelection,
    clearChat,
    conversations,
    activeConversationId,
    historyLoading,
    historyError,
    historyLoadingMore,
    hasOlderMessages,
    loadOlderMessages,
    retryHistory,
    newChat,
    loadConversation,
    deleteConversation,
    renameConversation,
    speakingId,
    speak,
    queueSpeech,
    stopSpeaking,
  ],
);

return (
  <AIChatContext.Provider value={value}>
    {children}
  </AIChatContext.Provider>
);
};