import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BellPlus,
  CalendarDays,
  FolderSearch,
  ListTodo,
  MessageSquareText,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";

import { useAIChat } from "../../hooks/useAIChat";
import { prepareAudioPlayback } from "../../../../services/audioPlayback";
import { useI18n } from "../../../../i18n/useI18n";
import { usePlatform } from "../../../../context/PlatformContext";
import { readStorageString, writeStorageString } from "../../../../services/storage";
import { agentApi } from "../../../../services/api/agentApi";

import ChatHeader from "../ChatHeader/ChatHeader";
import ChatHistoryDrawer from "../ChatHistoryDrawer/ChatHistoryDrawer";
import ChatInput from "../ChatInput/ChatInput";
import MessageList from "../MessageList/MessageList";

const VoiceMode = lazy(() => import("../VoiceMode/VoiceMode"));

import "./AIAssistant.scss";

const quickActions = [
  { key: "nav.calendar", label: "Kalendar", icon: CalendarDays, route: "/calendar" },
  { key: "nav.tasks", label: "Vazifalar", icon: ListTodo, route: "/tasks" },
  { key: "nav.reminders", label: "Eslatmalar", icon: BellPlus, route: "/reminders" },
  { key: "nav.files", label: "Fayllar", icon: FolderSearch, route: "/files" },
];


const AIAssistant = () => {
  const {
    messages,
    isTyping,
    sendMessage,
    executeAction,
    conversations,
    activeConversationId,
    historyLoading,
    historyError,
    newChat,
    loadConversation,
    deleteConversation,
    renameConversation,
    speakingId,
    speak,
    stopSpeaking,
  } = useAIChat();
  const [panelOpen, setPanelOpen] = useState(() => readStorageString("qulay.ai.panel") !== "closed");
  const [input, setInput] = useState("");
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const { t } = useI18n();
  const { name: platformName } = usePlatform();
  const suggestedPrompts = [t("ai.todayPlan", "Bugungi rejamni ayt"), t("ai.newTask", "Yangi vazifa yarat"), t("ai.newReminder", "Eslatma qo'sh")];
  const navigate = useNavigate();
  const [searchParams,setSearchParams]=useSearchParams();
  const hasConversation = Boolean(activeConversationId || historyLoading || historyError || messages.some(m => m.id !== 0));
  const filteredConversations = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase();
    return query ? conversations.filter((item) => item.title.toLocaleLowerCase().includes(query)) : conversations;
  }, [conversations, historySearch]);
  const activeConversationTitle = useMemo(
    () => conversations.find((item) => item.id === activeConversationId)?.title,
    [conversations, activeConversationId],
  );
  useEffect(()=>{const actionId=searchParams.get('action');if(!actionId)return;void agentApi.listActions('PENDING',1,100).then((result)=>{const action=result.items.find((item)=>item.id===actionId);if(action?.conversationId)void loadConversation(action.conversationId);setSearchParams({}, {replace:true});}).catch(()=>setSearchParams({}, {replace:true}));},[loadConversation,searchParams,setSearchParams]);

  const commitConversationRename = async (id: string) => {
    const title = editingTitle.trim();
    setEditingConversationId(null);
    if (!title) return;
    await renameConversation(id, title);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const openVoiceMode = () => {
    void prepareAudioPlayback().catch(() => undefined);
    stopSpeaking();
    setIsVoiceModeOpen(true);
  };

  const closeVoiceMode = () => setIsVoiceModeOpen(false);
  const startNewChat = () => {
    newChat();
    setIsHistoryDrawerOpen(false);
    setInput("");
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(".ai-page .chat-input textarea")?.focus(), 0);
  };
  const focusTextComposer = () => {
    closeVoiceMode();
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(".ai-page .chat-input textarea")?.focus();
    }, 0);
  };

  return (
    <main className={`ai-page ${panelOpen ? "" : "ai-page--panel-hidden"}`}>
      <div className="ai-page__ambient ai-page__ambient--one" />
      <div className="ai-page__ambient ai-page__ambient--two" />

      <section className="ai-page__workspace">
        <aside className="ai-page__rail" aria-label={t("ai.quickPanelAria", "AI yordamchi tezkor paneli")}>
          <div className="ai-page__rail-heading">
            <div className="ai-page__rail-mark"><Sparkles size={15} /></div>
            <div>
              <strong>{platformName}</strong>
              <span>{t("ai.workspace", "AI ish maydoni")}</span>
            </div>
          </div>

          <div className="ai-side-card">
            <div className="ai-side-card__title">
              <div className="ai-side-card__icon"><Sparkles size={15} /></div>
              <h2>{t("ai.quick", "Tezkor amallar")}</h2>
            </div>

            <div className="ai-side-card__actions">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button type="button" key={action.label} onClick={() => navigate(action.route)}>
                    <Icon size={15} />
                    {t(action.key, action.label)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ai-side-card ai-side-card--history">
            <div className="ai-side-card__title ai-side-card__title--history">
              <div className="ai-side-card__icon ai-side-card__icon--soft"><MessageSquareText size={15} /></div>
              <h2>{t("ai.history", "So'nggi suhbatlar")}</h2>
              <button type="button" className="ai-history__new" onClick={newChat} aria-label={t("ai.newChat", "Yangi chat")}><Plus size={14} /></button>
            </div>

            <label className="ai-history__search">
              <Search size={13} />
              <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={t("ai.historySearch", "Chat tarixidan qidirish...")} aria-label={t("ai.historySearch", "Chat tarixidan qidirish...")} />
            </label>

            <div className="ai-side-card__conversations">
              {historyLoading && <span className="ai-history__empty">{t("ai.historyLoading", "Tarix yuklanmoqda…")}</span>}
              {!historyLoading && filteredConversations.map((item) => (
                <div className={`ai-history__row ${activeConversationId === item.id ? "is-active" : ""}`} key={item.id}>
                  {editingConversationId === item.id ? (
                    <input
                      className="ai-history__rename"
                      autoFocus
                      maxLength={200}
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => void commitConversationRename(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void commitConversationRename(item.id); }
                        if (event.key === "Escape") { setEditingConversationId(null); setEditingTitle(""); }
                      }}
                      aria-label={t("ai.renameChat", "Chat nomini o'zgartirish")}
                    />
                  ) : (
                    <button type="button" className="ai-history__open" onClick={() => void loadConversation(item.id)} title={item.title}>
                      <span>{item.title}</span><small>{item.messageCount ?? 0} {t("ai.messages", "xabar")}</small>
                    </button>
                  )}
                  <span className="ai-history__actions">
                    <button type="button" className="ai-history__edit" onClick={() => { setEditingConversationId(item.id); setEditingTitle(item.title); }} aria-label={t("ai.renameChat", "Chat nomini o'zgartirish")}><Pencil size={12} /></button>
                    <button type="button" className="ai-history__delete" onClick={() => void deleteConversation(item.id)} aria-label={t("ai.deleteChatAria", "{title} suhbatini o'chirish", { title: item.title })}><Trash2 size={13} /></button>
                  </span>
                </div>
              ))}
              {!historyLoading && filteredConversations.length === 0 && <span className="ai-history__empty">{historySearch.trim() ? t("ai.historyNotFound", "Mos chat topilmadi.") : t("ai.noHistory", "Hali saqlangan suhbat yo'q.")}</span>}
            </div>
          </div>
        </aside>

        <section className="ai-page__main">
          <ChatHeader
            panelOpen={panelOpen}
            onTogglePanel={() => { setPanelOpen(v => { writeStorageString("qulay.ai.panel", v ? "closed" : "open"); return !v; }); }}
            title={activeConversationTitle}
            onOpenHistory={() => setIsHistoryDrawerOpen(true)}
            onNewChat={startNewChat}
            onBack={() => navigate("/dashboard")}
          />

          {!hasConversation ? (
            <div className="ai-welcome">
              <div className="ai-welcome__content">
                <div className="ai-welcome__orb" aria-hidden="true">
                  <span /><span /><span />
                  <Sparkles size={28} />
                </div>

                <span className="ai-welcome__small">{t("ai.greeting", `SALOM, MEN ${platformName.toUpperCase()}`)}</span>
                <h1>{t("ai.question", "Bugun sizga qanday yordam beray?")}</h1>
                <p>{t("ai.subtitle", "Reja tuzing, vazifa yarating yoki shunchaki gaplashishni boshlang.")}</p>

                <div className="ai-prompts">
                  {suggestedPrompts.map((prompt) => (
                    <button type="button" key={prompt} className="ai-prompt" onClick={() => sendMessage(prompt)}>
                      <Sparkles size={14} />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              isTyping={isTyping}
              speakingId={speakingId}
              onSpeak={speak}
              onStopSpeak={stopSpeaking}
              onAction={executeAction}
            />
          )}

          <ChatInput value={input} onChange={setInput} onSend={handleSend} onVoice={openVoiceMode} disabled={isTyping || historyLoading || Boolean(historyError)} />
        </section>
      </section>

      <ChatHistoryDrawer
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onHome={() => {
          setIsHistoryDrawerOpen(false);
          navigate("/dashboard", { replace: true });
        }}
      />

      {isVoiceModeOpen && (
        <Suspense fallback={<div className="ai-voice-loading" role="status"><span />{t("ai.voiceLoading", "Voice Mode yuklanmoqda")}</div>}>
          <VoiceMode
            open={isVoiceModeOpen}
            onClose={closeVoiceMode}
            onKeyboard={focusTextComposer}
          />
        </Suspense>
      )}
    </main>
  );
};

export default AIAssistant;
