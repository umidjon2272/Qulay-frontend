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
import { useI18n } from "../../i18n/useI18n";
import { usePlatform } from "../../context/PlatformContext";
import "./Sidebar.scss";

const menuItems = [
  { key: "nav.home", label: "Bosh sahifa", path: "/dashboard", icon: LayoutDashboard },
  { key: "nav.ai", label: "AI yordamchi", path: "/ai-assistant", icon: Sparkles },
  { key: "nav.calendar", label: "Kalendar", path: "/calendar", icon: CalendarDays },
  { key: "nav.tasks", label: "Vazifalar", path: "/tasks", icon: CheckSquare },
  { key: "nav.reminders", label: "Eslatmalar", path: "/reminders", icon: Bell },
  { key: "nav.files", label: "Fayllar", path: "/files", icon: FolderOpen },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openAIChat } = useAIChat();
  const { name, email, avatar } = useProfile();
  const { logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { t } = useI18n();
  const { name: platformName } = usePlatform();
  const isSettingsHub = location.pathname === "/settings";

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
        <div className="sidebar__brand-text"><strong>{platformName}</strong><span>{t("nav.workspace", "AI ish maydoni")}</span></div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-title">{t("nav.main", "ASOSIY")}</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className={`sidebar__link ${location.pathname === item.path ? "sidebar__link--active" : ""}`}>
              <span className="sidebar__link-icon"><Icon size={19} /></span>
              <span className="sidebar__link-text">{t(item.key, item.label)}</span>
              <ChevronRight className="sidebar__arrow" size={15} />
            </NavLink>
          );
        })}
        <div className="sidebar__section-title sidebar__section-title--bottom">{t("nav.system", "TIZIM")}</div>
        <NavLink to="/settings" className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}>
          <span className="sidebar__link-icon"><Settings size={19} /></span>
          <span className="sidebar__link-text">{t("nav.settings", "Sozlamalar")}</span>
          <ChevronRight className="sidebar__arrow" size={15} />
        </NavLink>
      </nav>

      <button type="button" className="sidebar__user" onClick={() => setProfileMenuOpen((value) => !value)} aria-expanded={profileMenuOpen} aria-label="Profil menyusini ochish">
        <div className="sidebar__avatar">{avatar ? <img src={avatar} alt={`${name} avatari`} /> : name.charAt(0).toUpperCase()}</div>
        <div className="sidebar__user-info"><strong>{name}</strong><span>{t("nav.profile", "Profil")}</span></div>
        <ChevronRight size={15} className="sidebar__user-arrow" />
      </button>

      {profileMenuOpen && (
        <div className="sidebar__profile-menu">
          <div className="sidebar__profile-menu-head">
            <div className="sidebar__profile-menu-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{name}</strong>
              <span>{email || `${platformName} foydalanuvchisi`}</span>
            </div>
          </div>
          <div className="sidebar__profile-menu-divider" />
          <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/settings?tab=profile"); }}><UserRound size={16} /><span>{t("nav.profile", "Profil")}</span></button>
          <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/settings"); }}><Settings size={16} /><span>{t("nav.settings", "Sozlamalar")}</span></button>
          <div className="sidebar__profile-menu-divider" />
          <button type="button" className="is-danger" onClick={() => setConfirmLogout(true)}><LogOut size={16} /><span>{t("nav.logout", "Chiqish")}</span></button>
        </div>
      )}

      <nav className="sidebar__mobile-dock" aria-label="Mobil navigatsiya">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar__mobile-item ${isActive ? "is-active" : ""}`} aria-label="Bosh sahifa"><LayoutDashboard size={19} /><span>{t("nav.home", "Bosh sahifa")}</span></NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `sidebar__mobile-item ${isActive ? "is-active" : ""}`} aria-label="Vazifalar"><CheckSquare size={19} /><span>{t("nav.tasks", "Vazifalar")}</span></NavLink>
        <button type="button" className="sidebar__mobile-item sidebar__mobile-item--ai" onClick={handleMobileAI} aria-label="AI yordamchi"><Sparkles size={20} /><span>AI</span></button>
        <NavLink to="/calendar" className={({ isActive }) => `sidebar__mobile-item ${isActive ? "is-active" : ""}`} aria-label="Kalendar"><CalendarDays size={19} /><span>{t("nav.calendar", "Kalendar")}</span></NavLink>
        <button type="button" className={`sidebar__mobile-item ${isSettingsHub ? "is-active" : ""}`} onClick={() => navigate("/settings")} aria-label="Sozlamalarni ochish" aria-current={isSettingsHub ? "page" : undefined}><span className="sidebar__mobile-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span><span>{t("nav.profile", "Profil")}</span></button>
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
