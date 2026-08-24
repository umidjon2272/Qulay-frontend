import { Bell, Globe2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../hooks/useProfile";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

import "./TopBar.scss";

const TopBar = () => {
  const navigate = useNavigate();
  const { name, avatar } = useProfile();
  const firstName = name.trim().split(/\s+/)[0] || "Profil";

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
        <button type="button" className="topbar__icon topbar__language" onClick={() => navigate("/settings?tab=language")} aria-label="Tilni tanlash">
          <Globe2 size={17} />
          <span>UZ</span>
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
