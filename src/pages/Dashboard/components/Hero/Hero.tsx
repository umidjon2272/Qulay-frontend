import {
  Sparkles,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAIChat } from "../../../../features/ai/hooks/useAIChat";

import "./Hero.scss";

const Hero = () => {
  const { open: openAIChat } = useAIChat();
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero__ambient hero__ambient--one" />
      <div className="hero__ambient hero__ambient--two" />
      <div className="hero__ambient hero__ambient--three" />

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
