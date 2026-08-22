import {
  Bell,
  Bot,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  Menu,
  Mic,
  Search,
  X,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { useProfile } from "../../../../hooks/useProfile";

import "./Hero.scss";

const Hero = () => {
  const { open: openAIChat, sendMessage } = useAIChat();
  const { name, avatar } = useProfile();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <button
          type="button"
          className="hero__mobile-icon-button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label={mobileMenuOpen ? "Menyuni yopish" : "Menyuni ochish"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hero__mobile-brand">
          <div className="hero__mobile-brand-mark"><Sparkles size={15} /></div>
          <strong>YECHIM AI</strong>
        </div>

        <div className="hero__mobile-actions">
          <button type="button" className="hero__mobile-icon-button" onClick={() => handleMobilePrompt("Fayllardan top")} aria-label="Qidirish">
            <Search size={18} />
          </button>
          <button type="button" className="hero__mobile-icon-button hero__mobile-icon-button--notification" onClick={() => navigate("/reminders")} aria-label="Bildirishnomalar">
            <Bell size={18} />
            <span>3</span>
          </button>
          <button type="button" className="hero__mobile-avatar" onClick={() => navigate("/settings?tab=profile")} aria-label="Profilni ochish">
            {avatar ? <img src={avatar} alt={`${name} avatari`} /> : name.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="hero__mobile-menu" role="menu">
          <button type="button" onClick={() => { navigate("/reminders"); setMobileMenuOpen(false); }}>Eslatmalar</button>
          <button type="button" onClick={() => { navigate("/files"); setMobileMenuOpen(false); }}>Fayllar</button>
          <button type="button" onClick={() => { navigate("/settings"); setMobileMenuOpen(false); }}>Sozlamalar</button>
        </div>
      )}

      <div className="hero__mobile-greeting">
        <span>Xush kelibsiz,</span>
        <h2>{name} <span aria-hidden="true">👋</span></h2>
        <p>Bugungi rejangizni boshlashga tayyormisiz?</p>
      </div>

      <div className="hero__mobile-ai">
        <div className="hero__mobile-ai-copy">
          <div className="hero__mobile-ai-status"><i /> AI YORDAMCHI <span>ONLAYN</span></div>
          <h3>Bugun nimadan boshlaymiz?</h3>
          <p>Rejangiz, vazifalaringiz va g‘oyalaringiz uchun men tayyorman.</p>
          <div className="hero__mobile-ai-actions">
            <button type="button" onClick={openAIChat}><Mic size={16} /> AI bilan gaplashish</button>
            <button type="button" onClick={() => navigate("/calendar")} aria-label="Bugungi rejani ko‘rish"><CalendarDays size={17} /></button>
          </div>
        </div>
        <button type="button" className="hero__mobile-orb" onClick={openAIChat} aria-label="AI bilan gaplashish">
          <span className="hero__mobile-orb-halo" />
          <span className="hero__mobile-orb-core"><Bot size={22} /></span>
        </button>
        <div className="hero__mobile-prompts">
          {["Bugun nima qilishim kerak?", "Rejamni tuz", "Eslatma qo‘y"].map((prompt) => (
            <button type="button" key={prompt} onClick={() => handleMobilePrompt(prompt)}>{prompt}</button>
          ))}
        </div>
      </div>

      <div className="hero__content">
        <div className="hero__eyebrow">
          <Sparkles size={13} />
          <span>AI yordamchi</span>
        </div>

        <h1>
          Bugungi kuningizni
          <br />
          <span>AI bilan boshqaring.</span>
        </h1>

        <p>
          Vazifalar, uchrashuvlar va muhim ishlaringizni
          bitta aqlli yordamchi orqali boshqaring.
        </p>

        <div className="hero__actions">
          <button
            type="button"
            className="hero__button hero__button--primary"
            onClick={openAIChat}
          >
            <Sparkles size={15} />
            AI bilan gaplashish
          </button>

          <button
            type="button"
            className="hero__button hero__button--secondary"
            onClick={() => navigate("/calendar")}
          >
            <CalendarDays size={15} />
            Bugungi reja
          </button>
        </div>
      </div>

      <div className="hero__visual">
        <button
          type="button"
          className="hero__orb"
          onClick={openAIChat}
          aria-label="AI yordamchini ochish"
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
          aria-label="AI yordamchini ochish"
        >
          <div className="hero__assistant-card-icon">
            <Sparkles size={18} />
          </div>

          <div className="hero__assistant-card-text">
            <span>AI yordamchi</span>

            <strong>
              Bugun sizga yordam
              <br />
              berishga tayyor.
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
