import {
  Bell,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  Mic,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { useProfile } from "../../../../hooks/useProfile";
import { useI18n } from "../../../../i18n/useI18n";

import "./Hero.scss";

const Hero = () => {
  const { open: openAIChat, sendMessage } = useAIChat();
  const { name: fullName, avatar } = useProfile();
  const { t } = useI18n();
  const name = fullName.trim().split(/\s+/)[0] || t("dashboard.friendFallback", "Do'stimiz");
  const navigate = useNavigate();

  const mobilePrompts = [t("dashboard.prompt.whatToday", "Bugun nima qilishim kerak?"), t("dashboard.prompt.buildPlan", "Rejamni tuz"), t("dashboard.prompt.addReminder", "Eslatma qo'y")];

  const handleMobilePrompt = (prompt: string) => {
    openAIChat();
    sendMessage(prompt);
  };

  return (
    <section className="hero">
      <div className="hero__ambient hero__ambient--one" />
      <div className="hero__ambient hero__ambient--two" />
      <div className="hero__ambient hero__ambient--three" />

      <div className="hero__mobile-header">
        <div className="hero__mobile-brand">
          <div className="hero__mobile-brand-mark"><Sparkles size={15} /></div>
          <strong>QULAY AI</strong>
        </div>

        <div className="hero__mobile-actions">
          <button type="button" className="hero__mobile-icon-button hero__mobile-icon-button--notification" onClick={() => navigate("/reminders")} aria-label={t("top.notifications", "Bildirishnomalar")}>
            <Bell size={18} />
            <span>3</span>
          </button>
          <button type="button" className="hero__mobile-avatar" onClick={() => navigate("/settings?tab=profile")} aria-label={t("dashboard.openProfile", "Profilni ochish")}>
            {avatar ? <img src={avatar} alt={t("settings.avatarAlt", "{name} avatari", { name })} /> : name.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      <div className="hero__mobile-greeting">
        <span>{t("dashboard.welcome", "Xush kelibsiz,")}</span>
        <h2>{name} <span aria-hidden="true">👋</span></h2>
        <p>{t("dashboard.readyToday", "Bugungi rejangizni boshlashga tayyormisiz?")}</p>
      </div>

      <div className="hero__mobile-ai">
        <div className="hero__mobile-ai-copy">
          <div className="hero__mobile-ai-status"><i /> {t("dashboard.aiAssistant", "AI YORDAMCHI")} <span>{t("dashboard.online", "ONLAYN")}</span></div>
          <h3>{t("dashboard.howCanIHelp", "Bugun sizga qanday yordam beray?")}</h3>
          <p>{t("dashboard.readyForYourPlan", "Rejangiz, vazifalaringiz va g'oyalaringiz uchun men tayyorman.")}</p>
          <div className="hero__mobile-ai-actions">
            <button type="button" onClick={openAIChat}><Mic size={16} /> {t("dashboard.talkToAi", "AI bilan gaplashish")}</button>
            <button type="button" onClick={() => navigate("/calendar")} aria-label={t("dashboard.viewTodayPlan", "Bugungi rejani ko'rish")}><CalendarDays size={17} /></button>
          </div>
        </div>
        <button type="button" className="hero__mobile-orb" onClick={openAIChat} aria-label={t("dashboard.talkToAi", "AI bilan gaplashish")}>
          <span className="hero__mobile-orb-halo" />
          <span className="hero__mobile-orb-core"><Sparkles size={22} /></span>
        </button>
        <div className="hero__mobile-prompts">
          {mobilePrompts.map((prompt) => (
            <button type="button" key={prompt} onClick={() => handleMobilePrompt(prompt)}>{prompt}</button>
          ))}
        </div>
      </div>

      <div className="hero__content">
        <div className="hero__eyebrow">
          <Sparkles size={13} />
          <span>{t("dashboard.aiAssistantLabel", "AI yordamchi")}</span>
        </div>

        <h1>
          {t("dashboard.heroLine1", "Bugungi kuningizni")}
          <br />
          <span>{t("dashboard.heroLine2", "AI bilan boshqaring.")}</span>
        </h1>

        <p>
          {t("dashboard.heroSubtitle", "Vazifalar, uchrashuvlar va muhim ishlaringizni bitta aqlli yordamchi orqali boshqaring.")}
        </p>

        <div className="hero__actions">
          <button
            type="button"
            className="hero__button hero__button--primary"
            onClick={openAIChat}
          >
            <Sparkles size={15} />
            {t("dashboard.talkToAi", "AI bilan gaplashish")}
          </button>

          <button
            type="button"
            className="hero__button hero__button--secondary"
            onClick={() => navigate("/calendar")}
          >
            <CalendarDays size={15} />
            {t("dashboard.todayPlanButton", "Bugungi reja")}
          </button>
        </div>
      </div>

      <div className="hero__visual">
        <button
          type="button"
          className="hero__orb"
          onClick={openAIChat}
          aria-label={t("dashboard.openAiAssistant", "AI yordamchini ochish")}
        >
          <div className="hero__orb-core">
            <Sparkles size={31} />
          </div>

          <div className="hero__orb-ring hero__orb-ring--one" />
          <div className="hero__orb-ring hero__orb-ring--two" />
          <div className="hero__orb-wave hero__orb-wave--one" />
          <div className="hero__orb-wave hero__orb-wave--two" />
        </button>

        <button
          type="button"
          className="hero__assistant-card"
          onClick={openAIChat}
          aria-label={t("dashboard.openAiAssistant", "AI yordamchini ochish")}
        >
          <div className="hero__assistant-card-icon">
            <Sparkles size={18} />
          </div>

          <div className="hero__assistant-card-text">
            <span>{t("dashboard.aiAssistantLabel", "AI yordamchi")}</span>

            <strong>
              {t("dashboard.readyToHelp", "Bugun sizga yordam berishga tayyor.")}
            </strong>
          </div>

          <div className="hero__assistant-card-arrow">
            <ArrowUpRight size={14} />
          </div>
        </button>
      </div>
    </section>
  );
};

export default Hero;
