import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../hooks/useProfile";
import { getSettings, updateSettings } from "../../services/settingsService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

import "./TopBar.scss";

type LanguageCode = "UZ" | "RU";

const getLanguageCode = (language: string): LanguageCode => (language === "Русский" ? "RU" : "UZ");

const TopBar = () => {
  const navigate = useNavigate();
  const { name, avatar } = useProfile();
  const firstName = name.trim().split(/\s+/)[0] || "Profil";
  const [language, setLanguage] = useState<LanguageCode>(() => getLanguageCode(getSettings().language));

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setLanguage(getLanguageCode(getSettings().language));
  }), []);

  const toggleLanguage = () => {
    const nextLanguage: LanguageCode = language === "UZ" ? "RU" : "UZ";
    setLanguage(nextLanguage);
    updateSettings({ language: nextLanguage === "UZ" ? "O'zbekcha" : "Русский" });
  };

  return (
    <header className="topbar">
      <label className="topbar__search">
        <Search size={16} />
        <input type="search" placeholder="Qidirish..." aria-label="Workspace bo'ylab qidirish" />
        <kbd>⌘ K</kbd>
      </label>

      <div className="topbar__actions">
        <button type="button" className="topbar__icon" onClick={() => navigate("/reminders")} aria-label="Bildirishnomalar">
          <Bell size={17} />
          <i />
        </button>
        <button
          type="button"
          className="topbar__icon topbar__language"
          onClick={toggleLanguage}
          aria-label={`Tilni ${language === "UZ" ? "Русский" : "O'zbekcha"} tiliga almashtirish`}
          title={`Joriy til: ${language}`}
        >
          <span key={language}>{language}</span>
        </button>
        <ThemeToggle variant="menu" />
        <button type="button" className="topbar__profile" onClick={() => navigate("/settings?tab=profile")} aria-label={`${firstName} profilini ochish`}>
          <span className="topbar__avatar">{avatar ? <img src={avatar} alt="" /> : firstName.charAt(0).toUpperCase()}</span>
          <span className="topbar__profile-name">{firstName}</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
