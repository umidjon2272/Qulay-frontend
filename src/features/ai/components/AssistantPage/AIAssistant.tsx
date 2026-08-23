import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BellPlus,
  CalendarDays,
  FolderSearch,
  ListTodo,
  MessageSquareText,
  Mic,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";

import { useAIChat } from "../../hooks/useAIChat";

import ChatHeader from "../ChatHeader/ChatHeader";
import ChatInput from "../ChatInput/ChatInput";
import MessageList from "../MessageList/MessageList";
import VoiceMode from "../VoiceMode/VoiceMode";

import "./AIAssistant.scss";

const suggestedPrompts = [
  "Bugungi rejamni ayt",
  "Yangi vazifa yarat",
  "Eslatma qo'sh",
];

const quickActions = [
  { label: "Kalendar", icon: CalendarDays, route: "/calendar" },
  { label: "Vazifalar", icon: ListTodo, route: "/tasks" },
  { label: "Eslatmalar", icon: BellPlus, route: "/reminders" },
  { label: "Fayllar", icon: FolderSearch, route: "/files" },
];

const recentConversations = [
  "Bugungi rejalarim nima?",
  "Ertangi uchrashuvni tashkil qil",
  "Loyiha uchun g'oya taklif qil",
];

const AIAssistant = () => {
  const {
    messages,
    isTyping,
    sendMessage,
    executeAction,
    clearChat,
    speakingId,
    speak,
    stopSpeaking,
  } = useAIChat();
  const [input, setInput] = useState("");
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const navigate = useNavigate();
  const hasConversation = messages.length > 1;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const syncViewportHeight = () => {
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
      document.documentElement.style.setProperty("--keyboard-inset", `${keyboardInset}px`);
    };

    syncViewportHeight();
    viewport.addEventListener("resize", syncViewportHeight);
    viewport.addEventListener("scroll", syncViewportHeight);
    return () => {
      viewport.removeEventListener("resize", syncViewportHeight);
      viewport.removeEventListener("scroll", syncViewportHeight);
      document.documentElement.style.removeProperty("--visual-viewport-height");
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const openVoiceMode = () => {
    stopSpeaking();
    setIsVoiceModeOpen(true);
  };

  const closeVoiceMode = () => setIsVoiceModeOpen(false);
  const focusTextComposer = () => {
    closeVoiceMode();
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(".ai-page .chat-input textarea")?.focus();
    }, 0);
  };

  return (
    <main className="ai-page">
      <div className="ai-page__ambient ai-page__ambient--one" />
      <div className="ai-page__ambient ai-page__ambient--two" />

      <section className="ai-page__workspace">
        <aside className="ai-page__rail" aria-label="AI yordamchi tezkor paneli">
          <div className="ai-page__rail-heading">
            <div className="ai-page__rail-mark"><Sparkles size={15} /></div>
            <div>
              <strong>Qulay AI</strong>
              <span>AI ish maydoni</span>
            </div>
          </div>

          <div className="ai-side-card">
            <div className="ai-side-card__title">
              <div className="ai-side-card__icon"><Sparkles size={15} /></div>
              <h2>Tezkor amallar</h2>
            </div>

            <div className="ai-side-card__actions">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button type="button" key={action.label} onClick={() => navigate(action.route)}>
                    <Icon size={15} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ai-side-card ai-side-card--history">
            <div className="ai-side-card__title">
              <div className="ai-side-card__icon ai-side-card__icon--soft"><MessageSquareText size={15} /></div>
              <h2>So'nggi suhbatlar</h2>
            </div>

            <div className="ai-side-card__conversations">
              {recentConversations.map((item) => (
                <button type="button" key={item} onClick={() => sendMessage(item)}>{item}</button>
              ))}
            </div>
          </div>
        </aside>

        <section className="ai-page__main">
          <ChatHeader onClear={clearChat} onVoice={openVoiceMode} />

          {!hasConversation ? (
            <div className="ai-welcome">
              <div className="ai-welcome__orb" aria-hidden="true">
                <span /><span /><span />
                <Sparkles size={28} />
              </div>

              <span className="ai-welcome__small">SALOM, MEN QULAY AI</span>
              <h1>Bugun sizga qanday yordam beray?</h1>
              <p>Reja tuzing, vazifa yarating yoki shunchaki gaplashishni boshlang.</p>

              <div className="ai-prompts">
                {suggestedPrompts.map((prompt) => (
                  <button type="button" key={prompt} className="ai-prompt" onClick={() => sendMessage(prompt)}>
                    <Sparkles size={14} />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>

              <div className="ai-welcome__input">
                <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={isTyping} />
              </div>

              <button type="button" className="ai-welcome__voice" onClick={openVoiceMode}>
                <Mic size={15} />
                Voice Mode'ni ochish
              </button>
            </div>
          ) : (
            <div className="ai-conversation">
              <MessageList
                messages={messages}
                isTyping={isTyping}
                speakingId={speakingId}
                onSpeak={speak}
                onStopSpeak={stopSpeaking}
                onAction={executeAction}
              />

              <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={isTyping} />
            </div>
          )}
        </section>
      </section>

      <header className="ai-page__mobile-bar">
        <button type="button" onClick={() => navigate(-1)} aria-label="Orqaga"><ArrowLeft size={18} /></button>
        <div><strong>Qulay AI</strong><span><i /> Onlayn · Tayyor</span></div>
        <button type="button" className="ai-page__mobile-voice" onClick={openVoiceMode} aria-label="Voice Mode'ni ochish"><Mic size={17} /></button>
        <button type="button" onClick={clearChat} aria-label="Suhbat sozlamalari"><MoreHorizontal size={18} /></button>
      </header>

      {isVoiceModeOpen && (
        <VoiceMode
          open={isVoiceModeOpen}
          onClose={closeVoiceMode}
          onKeyboard={focusTextComposer}
        />
      )}
    </main>
  );
};

export default AIAssistant;
