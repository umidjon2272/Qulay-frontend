import { useEffect, useState } from "react";
import { Bell, CheckCheck, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../hooks/useProfile";
import { getSettings, updateSettings } from "../../services/settingsService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { notificationApi } from "../../services/api";
import type { ApiNotification } from "../../services/api/types";

import "./TopBar.scss";

type LanguageCode = "UZ" | "RU";

const getLanguageCode = (language: string): LanguageCode => (language === "Русский" ? "RU" : "UZ");

const TopBar = () => {
  const navigate = useNavigate();
  const { name, avatar } = useProfile();
  const firstName = name.trim().split(/\s+/)[0] || "Profil";
  const [language, setLanguage] = useState<LanguageCode>(() => getLanguageCode(getSettings().language));
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const refreshUnread = () => void notificationApi.unreadCount().then((result) => setUnreadCount(result.count)).catch(() => undefined);

  useEffect(() => {
    refreshUnread();
    const timer = window.setInterval(refreshUnread, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void notificationApi.list({ limit: 20 }).then((result) => setNotifications(result.items)).catch(() => undefined);
  }, [isOpen]);

  const markRead = async (notification: ApiNotification) => {
    if (!notification.readAt && notification.status === "SENT") {
      await notificationApi.markRead(notification.id).catch(() => undefined);
      setUnreadCount((current) => Math.max(0, current - 1));
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString(), status: "READ" } : item));
    }
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead().catch(() => undefined);
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString(), status: item.status === "SENT" ? "READ" : item.status }));
  };

  const relativeTime = (value: string) => {
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return "hozir";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} soat`;
    return `${Math.floor(seconds / 86400)} kun`;
  };

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
        <button type="button" className="topbar__icon topbar__notification-trigger" onClick={() => setIsOpen((current) => !current)} aria-label="Bildirishnomalar" aria-expanded={isOpen}>
          <Bell size={17} />
          {unreadCount > 0 && <i>{unreadCount > 99 ? "99+" : unreadCount}</i>}
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
      {isOpen && (
        <aside className="notification-panel" aria-label="Bildirishnomalar markazi">
          <div className="notification-panel__header">
            <div><strong>Bildirishnomalar</strong><span>{unreadCount ? `${unreadCount} ta yangi` : "Hammasi o'qilgan"}</span></div>
            <div className="notification-panel__actions">
              <button type="button" onClick={() => void markAllRead()} title="Hammasini o'qilgan deb belgilash" aria-label="Hammasini o'qilgan deb belgilash"><CheckCheck size={16} /></button>
              <button type="button" onClick={() => setIsOpen(false)} title="Yopish" aria-label="Yopish"><X size={16} /></button>
            </div>
          </div>
          <div className="notification-panel__list">
            {!notifications.length && <p className="notification-panel__empty">Hozircha bildirishnoma yo'q.</p>}
            {notifications.map((notification) => (
              <button type="button" className={`notification-item ${!notification.readAt ? "is-unread" : ""}`} key={notification.id} onClick={() => void markRead(notification)}>
                <span className="notification-item__dot" />
                <span className="notification-item__body"><strong>{notification.title}</strong><span>{notification.message}</span><small>{relativeTime(notification.createdAt)} oldin</small></span>
              </button>
            ))}
          </div>
          <button type="button" className="notification-panel__footer" onClick={() => { setIsOpen(false); navigate("/settings?tab=notifications"); }}>Bildirishnoma sozlamalari</button>
        </aside>
      )}
    </header>
  );
};

export default TopBar;
