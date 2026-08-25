import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./Sidebar.scss";

const menuItems = [
  { label: "Bosh sahifa", path: "/dashboard", icon: LayoutDashboard },
  { label: "AI yordamchi", path: "/ai-assistant", icon: Sparkles },
  { label: "Kalendar", path: "/calendar", icon: CalendarDays },
  { label: "Vazifalar", path: "/tasks", icon: CheckSquare },
  { label: "Eslatmalar", path: "/reminders", icon: Bell },
  { label: "Fayllar", path: "/files", icon: FolderOpen },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openAIChat } = useAIChat();
  const { name, email, avatar } = useProfile();
  const { logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const isProfilePage = location.pathname === "/settings" && new URLSearchParams(location.search).get("tab") === "profile";

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
        <div className="sidebar__brand-text"><strong>Qulay AI</strong><span>AI ish maydoni</span></div>
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
        <div className="sidebar__ai-icon"><Sparkles size={18} /></div>
        <div className="sidebar__ai-content"><strong>AI yordamchi</strong><span>Gaplashishga tayyor</span></div>
        <div className="sidebar__ai-status"><i /></div>
      </button>

      <button type="button" className="sidebar__user" onClick={() => setProfileMenuOpen((value) => !value)} aria-expanded={profileMenuOpen} aria-label="Profil menyusini ochish">
        <div className="sidebar__avatar">{avatar ? <img src={avatar} alt={`${name} avatari`} /> : name.charAt(0).toUpperCase()}</div>
        <div className="sidebar__user-info"><strong>{name}</strong><span>Profil</span></div>
        <ChevronRight size={15} className="sidebar__user-arrow" />
      </button>

      {profileMenuOpen && (
        <div className="sidebar__profile-menu">
          <div className="sidebar__profile-menu-head">
            <div className="sidebar__profile-menu-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{name}</strong>
              <span>{email || "Qulay AI foydalanuvchisi"}</span>
            </div>
          </div>
          <div className="sidebar__profile-menu-divider" />
          <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/settings?tab=profile"); }}><UserRound size={16} /><span>Profil</span></button>
          <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/settings"); }}><Settings size={16} /><span>Sozlamalar</span></button>
          <div className="sidebar__profile-menu-divider" />
          <button type="button" className="is-danger" onClick={() => setConfirmLogout(true)}><LogOut size={16} /><span>Chiqish</span></button>
        </div>
      )}

      <nav className="sidebar__mobile-dock" aria-label="Mobil navigatsiya">
        <NavLink to="/dashboard" className="sidebar__mobile-item" aria-label="Bosh sahifa"><LayoutDashboard size={19} /><span>Bosh sahifa</span></NavLink>
        <NavLink to="/tasks" className="sidebar__mobile-item" aria-label="Vazifalar"><CheckSquare size={19} /><span>Vazifalar</span></NavLink>
        <button type="button" className="sidebar__mobile-item sidebar__mobile-item--ai" onClick={handleMobileAI} aria-label="AI yordamchi"><Sparkles size={20} /><span>AI</span></button>
        <NavLink to="/calendar" className="sidebar__mobile-item" aria-label="Kalendar"><CalendarDays size={19} /><span>Kalendar</span></NavLink>
        <button type="button" className={`sidebar__mobile-item ${isProfilePage ? "is-active" : ""}`} onClick={() => navigate("/settings?tab=profile")} aria-label="Profilni ochish" aria-current={isProfilePage ? "page" : undefined}><span className="sidebar__mobile-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span><span>Profil</span></button>
      </nav>

      {confirmLogout && (
        <ConfirmDialog
          title="Akkauntdan chiqmoqchimisiz?"
          description="Sessiyangiz va qurilmadagi tokenlar tozalanadi."
          confirmLabel="Chiqish"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={async () => { setConfirmLogout(false); await logout(); navigate("/login", { replace: true }); }}
        />
      )}
    </aside>
  );
};

export default Sidebar;
