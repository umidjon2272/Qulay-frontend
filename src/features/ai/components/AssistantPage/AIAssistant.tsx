import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Sparkles,
  CalendarDays,
  ListTodo,
  BellPlus,
  FolderSearch,
  MessageSquareText,
} from "lucide-react";

import { useAIChat } from "../../hooks/useAIChat";

import ChatHeader from "../ChatHeader/ChatHeader";
import MessageList from "../MessageList/MessageList";
import ChatInput from "../ChatInput/ChatInput";

import "./AIAssistant.scss";

const suggestedPrompts = [
  "Bugungi rejamni ayt",
  "Yangi vazifa yarat",
  "Eslatma qo‘sh",
  "Loyiha g‘oyasini yozib ol",
  "Fayllarimdan top",
  "Telegram xabarini tayyorla",
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
  "Loyiha uchun g‘oya taklif qil",
];

const AIAssistant = () => {
  const { messages, isTyping, sendMessage, executeAction, clearChat, speakingId, speak, stopSpeaking } = useAIChat();
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const hasConversation = messages.length > 1;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <main className="ai-page">
      <div className="ai-page__orb ai-page__orb--one" />
      <div className="ai-page__orb ai-page__orb--two" />

      <header className="ai-page__header">
        <div>
          <span className="ai-page__eyebrow">AQLLI ISH MAYDONI</span>
          <h1>AI yordamchi</h1>
          <p>G‘oyalar, rejalar va kundalik ishlaringiz uchun aqlli yordamchi.</p>
        </div>
      </header>

      <div className="ai-page__layout">
        <section className="ai-page__side">
          <div className="ai-side-card">
            <div className="ai-side-card__icon">
              <Sparkles size={16} />
            </div>

            <h3>Tezkor amallar</h3>

            <div className="ai-side-card__actions">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => navigate(action.route)}
                  >
                    <Icon size={15} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ai-side-card">
            <div className="ai-side-card__icon">
              <MessageSquareText size={16} />
            </div>

            <h3>So‘nggi suhbatlar</h3>

            <div className="ai-side-card__conversations">
              {recentConversations.map((item) => (
                <button type="button" key={item} onClick={() => sendMessage(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-page__main">
          {!hasConversation ? (
            <div className="ai-welcome">
              <div className="ai-welcome__icon">
                <div className="ai-welcome__ring ai-welcome__ring--one" />
                <div className="ai-welcome__ring ai-welcome__ring--two" />
                <Bot size={32} />
              </div>

              <span className="ai-welcome__small">SALOM</span>

              <h2>
                Bugun sizga
                <br />
                qanday yordam beray?
              </h2>

              <p>Savol bering, reja tuzing yoki yangi g‘oyalar yarating.</p>

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
            </div>
          ) : (
            <div className="ai-conversation">
              <ChatHeader onClear={clearChat} />

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
      </div>
    </main>
  );
};

export default AIAssistant;
