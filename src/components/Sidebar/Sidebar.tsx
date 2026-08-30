import {
  ChevronRight,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { useI18n } from "../../i18n/useI18n";
import { usePlatform } from "../../context/PlatformContext";
import { getNavigation } from "../../app/navigationRegistry";
import "./Sidebar.scss";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openAIChat } = useAIChat();
  const { name, email, avatar } = useProfile();
  const { logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useI18n();
  const { name: platformName } = usePlatform();
  const desktopItems = getNavigation("desktop");
  const mobileItems = getNavigation("mobilePrimary");
  const moreItems = getNavigation("mobileMore");

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnPopState = () => setMoreOpen(false);
    window.history.pushState({ mobileMore: true }, "");
    window.addEventListener("popstate", closeOnPopState);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("popstate", closeOnPopState);
    };
  }, [moreOpen]);

  const closeMore = () => {
    if (window.history.state?.mobileMore) {
      window.history.back();
      return;
    }
    setMoreOpen(false);
  };
  const openMore = () => setMoreOpen(true);
  const isMoreItemActive = (path: string) => {
    const [pathname, search = ""] = path.split("?");
    if (location.pathname !== pathname) return false;
    return search ? location.search === `?${search}` : location.search === "";
  };

  const handleMobileAI = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      navigate("/ai-assistant");
      return;
    }
    openAIChat();
  };

  return (
    <aside className={`sidebar ${moreOpen ? "sidebar--more-open" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo"><Sparkles size={20} /></div>
        <div className="sidebar__brand-text"><strong>{platformName}</strong><span>{t("nav.workspace", "AI ish maydoni")}</span></div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-title">{t("nav.main", "ASOSIY")}</div>
        {desktopItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className={`sidebar__link ${location.pathname === item.path ? "sidebar__link--active" : ""}`}>
              <span className="sidebar__link-icon"><Icon size={19} /></span>
              <span className="sidebar__link-text">{t(item.translationKey, item.label)}</span>
              <ChevronRight className="sidebar__arrow" size={15} />
            </NavLink>
          );
        })}
      </nav>

      <button type="button" className="sidebar__user" onClick={() => setProfileMenuOpen((value) => !value)} aria-expanded={profileMenuOpen} aria-label={t("nav.openProfileMenu", "Profil menyusini ochish")}>
        <div className="sidebar__avatar">{avatar ? <img src={avatar} alt={t("nav.userAvatar", "{{name}} avatari", { name })} /> : name.charAt(0).toUpperCase()}</div>
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

      <nav className="sidebar__mobile-dock" aria-label={t("nav.mobile", "Mobil navigatsiya")}>
        {mobileItems.map((item) => {
          const Icon = item.icon;
          if (item.id === "ai") return <button key={item.id} type="button" className={`sidebar__mobile-item sidebar__mobile-item--ai ${location.pathname === item.path ? "is-active" : ""}`} onClick={handleMobileAI} aria-label={item.label}><Icon size={20} /><span>AI</span></button>;
          if (item.id === "more") return <button key={item.id} type="button" className={`sidebar__mobile-item ${moreOpen || moreItems.some((entry) => isMoreItemActive(entry.path)) ? "is-active" : ""}`} onClick={openMore} aria-label={item.label} aria-expanded={moreOpen}><Icon size={19} /><span>{item.label}</span></button>;
          return <NavLink key={item.id} to={item.path} className={({ isActive }) => `sidebar__mobile-item ${isActive ? "is-active" : ""}`} aria-label={item.label}><Icon size={19} /><span>{t(item.translationKey, item.label)}</span></NavLink>;
        })}
      </nav>

      {moreOpen && <div className="mobile-more" role="dialog" aria-modal="true" aria-label={t("nav.moreMenu", "Ko'proq menyusi")} onMouseDown={(event) => { if (event.target === event.currentTarget) closeMore(); }}>
        <section className="mobile-more__sheet">
          <header><div><span>QULAY AI</span><h2>{t("nav.more", "Ko'proq")}</h2></div><button type="button" onClick={closeMore} aria-label={t("nav.closeMenu", "Menyuni yopish")}><X size={20} /></button></header>
          <nav aria-label={t("nav.additionalSections", "Qo'shimcha bo'limlar")}>
            {moreItems.map((item) => { const Icon = item.icon; const active = isMoreItemActive(item.path); return <NavLink key={item.id} to={item.path} onClick={() => setMoreOpen(false)} className={active ? "is-active" : ""}><span><Icon size={19} /></span><strong>{t(item.translationKey, item.label)}</strong><ChevronRight className="mobile-more__chevron" size={16} /></NavLink>; })}
          </nav>
        </section>
      </div>}

      {confirmLogout && (
        <ConfirmDialog
          title={t("nav.logoutConfirmTitle", "Akkauntdan chiqmoqchimisiz?")}
          description={t("nav.logoutConfirmDescription", "Sessiyangiz va qurilmadagi tokenlar tozalanadi.")}
          confirmLabel={t("nav.logout", "Chiqish")}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={async () => { setConfirmLogout(false); await logout(); navigate("/login", { replace: true }); }}
        />
      )}
    </aside>
  );
};

export default Sidebar;
