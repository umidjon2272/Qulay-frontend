import {
  Bell,
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useProfile } from "../../hooks/useProfile";
import "./Sidebar.scss";

const menuItems = [
  { label: "Bosh sahifa", path: "/dashboard", icon: LayoutDashboard },
  { label: "AI yordamchi", path: "/ai-assistant", icon: Bot },
  { label: "Kalendar", path: "/calendar", icon: CalendarDays },
  { label: "Vazifalar", path: "/tasks", icon: CheckSquare },
  { label: "Eslatmalar", path: "/reminders", icon: Bell },
  { label: "Fayllar", path: "/files", icon: FolderOpen },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openAIChat } = useAIChat();
  const { name, avatar } = useProfile();

  const handleMobileAI = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      navigate("/ai-assistant");
      return;
    }
    openAIChat();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo"><Sparkles size={20} /></div>
        <div className="sidebar__brand-text"><strong>Yechim AI</strong><span>Smart ish maydoni</span></div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-title">ASOSIY</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className={`sidebar__link ${location.pathname === item.path ? "sidebar__link--active" : ""}`}>
              <span className="sidebar__link-icon"><Icon size={19} /></span>
              <span className="sidebar__link-text">{item.label}</span>
              <ChevronRight className="sidebar__arrow" size={15} />
            </NavLink>
          );
        })}
        <div className="sidebar__section-title sidebar__section-title--bottom">TIZIM</div>
        <NavLink to="/settings" className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}>
          <span className="sidebar__link-icon"><Settings size={19} /></span>
          <span className="sidebar__link-text">Sozlamalar</span>
          <ChevronRight className="sidebar__arrow" size={15} />
        </NavLink>
      </nav>

      <button type="button" className="sidebar__ai-card" onClick={openAIChat} aria-label="AI yordamchini ochish">
        <div className="sidebar__ai-glow" />
        <div className="sidebar__ai-icon"><Bot size={18} /></div>
        <div className="sidebar__ai-content"><strong>AI yordamchi</strong><span>Gaplashishga tayyor</span></div>
        <div className="sidebar__ai-status"><i /></div>
      </button>

      <button type="button" className="sidebar__user" onClick={() => navigate("/settings?tab=profile")} aria-label="Profilni ochish">
        <div className="sidebar__avatar">{avatar ? <img src={avatar} alt={`${name} avatari`} /> : name.charAt(0).toUpperCase()}</div>
        <div className="sidebar__user-info"><strong>{name}</strong><span>Profil</span></div>
        <ChevronRight size={15} className="sidebar__user-arrow" />
      </button>

      <nav className="sidebar__mobile-dock" aria-label="Mobil navigatsiya">
        <NavLink to="/dashboard" className="sidebar__mobile-item" aria-label="Bosh sahifa"><LayoutDashboard size={19} /><span>Bosh sahifa</span></NavLink>
        <NavLink to="/tasks" className="sidebar__mobile-item" aria-label="Vazifalar"><CheckSquare size={19} /><span>Vazifalar</span></NavLink>
        <button type="button" className="sidebar__mobile-item sidebar__mobile-item--ai" onClick={handleMobileAI} aria-label="AI yordamchi"><Bot size={20} /><span>AI</span></button>
        <NavLink to="/calendar" className="sidebar__mobile-item" aria-label="Kalendar"><CalendarDays size={19} /><span>Kalendar</span></NavLink>
        <button type="button" className="sidebar__mobile-item" onClick={() => navigate("/settings?tab=profile")} aria-label="Profilni ochish"><span className="sidebar__mobile-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span><span>Profil</span></button>
      </nav>
    </aside>
  );
};

export default Sidebar;
