import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../hooks/useProfile";
import { getSettings, updateSettings } from "../../services/settingsService";
import { updateProfile } from "../../services/profileService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { notificationApi } from "../../services/api";
import type { ApiFile, ApiNotification } from "../../services/api/types";
import { useI18n } from "../../i18n/useI18n";
import { getTasks, loadTasks } from "../../services/taskService";
import { getReminders, loadReminders } from "../../services/reminderService";
import { getCalendarEvents, loadCalendarEvents } from "../../services/meetingService";
import { listFiles } from "../../services/api/fileApi";

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
  const lastUnreadRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const [searchFiles, setSearchFiles] = useState<ApiFile[]>([]);
  const { locale, t } = useI18n();

  const isQuietHours = () => {
    const settings = getSettings().notifications;
    if (!settings.quietHoursEnabled) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
    const start = toMinutes(settings.quietHoursStart);
    const end = toMinutes(settings.quietHoursEnd);
    return start <= end ? current >= start && current < end : current >= start || current < end;
  };

  const playNotificationSound = () => {
    const settings = getSettings().notifications;
    if (!settings.sound || isQuietHours() || Date.now() - lastSoundAtRef.current < 3500) return;
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine"; oscillator.frequency.setValueAtTime(740, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(560, context.currentTime + .16);
      gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.055, context.currentTime + .018); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .22);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .23);
      oscillator.addEventListener("ended", () => void context.close());
      lastSoundAtRef.current = Date.now();
    } catch { /* Browser autoplay policy may block sound before user interaction. */ }
  };

  const refreshUnread = () => void notificationApi.unreadCount().then((result) => {
    if (lastUnreadRef.current !== null && result.count > lastUnreadRef.current) playNotificationSound();
    lastUnreadRef.current = result.count;
    setUnreadCount(result.count);
  }).catch(() => undefined);

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


  const notificationRoute = (notification: ApiNotification): string | null => {
    const entity = (notification.entityType ?? notification.type).toUpperCase();
    if (entity.includes("TASK")) return "/tasks";
    if (entity.includes("REMINDER")) return "/reminders";
    if (entity.includes("MEETING") || entity.includes("CALENDAR")) return "/calendar";
    if (entity.includes("FILE")) return "/files";
    if (entity.includes("AI_AGENT_ACTION") && notification.entityId) return `/ai-assistant?action=${notification.entityId}`;
    if (entity.includes("TELEGRAM") || entity.includes("AI")) return "/ai-assistant";
    return null;
  };

  const openNotification = async (notification: ApiNotification) => {
    await markRead(notification);
    const route = notificationRoute(notification);
    if (route) { setIsOpen(false); navigate(route); }
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead().catch(() => undefined);
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString(), status: item.status === "SENT" ? "READ" : item.status }));
  };

  const relativeTime = (value: string) => {
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return t("top.now", "hozir");
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t("top.minutes", "daqiqa")}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t("top.hours", "soat")}`;
    return `${Math.floor(seconds / 86400)} ${t("top.days", "kun")}`;
  };

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setLanguage(getLanguageCode(getSettings().language));
  }), []);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([loadTasks(), loadReminders(), loadCalendarEvents(), listFiles({ limit: 100 })]).then((results) => {
      if (!active) return;
      const fileResult = results[3];
      if (fileResult?.status === "fulfilled") setSearchFiles(fileResult.value.items);
      setSearchRevision((value) => value + 1);
    });
    const unsubscribe = subscribeToWorkspaceData(["tasks", "reminders", "calendarEvents"], () => setSearchRevision((value) => value + 1));
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase();
    if (q.length < 2) return [];
    const includes = (value?: string) => Boolean(value?.toLocaleLowerCase().includes(q));
    const results = [
      ...getTasks().filter((item) => includes(item.title) || includes(item.description)).map((item) => ({ id: `task-${item.id}`, title: item.title, meta: "Vazifa", path: "/tasks" })),
      ...getReminders().filter((item) => includes(item.title) || includes(item.description)).map((item) => ({ id: `reminder-${item.id}`, title: item.title, meta: "Eslatma", path: "/reminders" })),
      ...getCalendarEvents().filter((item) => includes(item.title) || includes(item.participant) || includes(item.location)).map((item) => ({ id: `meeting-${item.id}`, title: item.title, meta: "Kalendar", path: "/calendar" })),
      ...searchFiles.filter((item) => includes(item.label ?? undefined) || includes(item.originalName)).map((item) => ({ id: `file-${item.id}`, title: item.label || item.originalName, meta: "Fayl", path: "/files" })),
    ];
    return results.slice(0, 8);
  }, [searchQuery, searchRevision, searchFiles]);

  const toggleLanguage = () => {
    const nextLanguage: LanguageCode = language === "UZ" ? "RU" : "UZ";
    setLanguage(nextLanguage);
    updateSettings({ language: nextLanguage === "UZ" ? "O'zbekcha" : "Русский" });
    void updateProfile({ language: nextLanguage === "UZ" ? "uz" : "ru" }).catch(() => undefined);
  };

  return (
    <header className="topbar">
      <div className="topbar__search-wrap">
        <label className="topbar__search">
          <Search size={16} />
          <input ref={searchInputRef} type="search" placeholder={t("top.search", "Qidirish...")} aria-label={t("top.searchWorkspace", "Workspace bo'ylab qidirish")} value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }} />
          <kbd>⌘ K</kbd>
        </label>
        {searchOpen && searchQuery.trim().length >= 2 && <div className="topbar-search-results">
          {searchResults.length ? searchResults.map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearchOpen(false); setSearchQuery(""); navigate(item.path); }}><Search size={13} /><span><strong>{item.title}</strong><small>{item.meta}</small></span></button>) : <p>{t("top.search.none", "Hech narsa topilmadi.")}</p>}
        </div>}
      </div>

      <div className="topbar__actions">
        <button type="button" className="topbar__icon topbar__notification-trigger" onClick={() => setIsOpen((current) => !current)} aria-label={t("top.notifications", "Bildirishnomalar")} aria-expanded={isOpen}>
          <Bell size={17} />
          {unreadCount > 0 && <i>{unreadCount > 99 ? "99+" : unreadCount}</i>}
        </button>
        <button
          type="button"
          className="topbar__icon topbar__language"
          onClick={toggleLanguage}
          aria-label={t("top.switchLanguage", "Tilni {{language}} tiliga almashtirish", { language: language === "UZ" ? "Русский" : "O'zbekcha" })}
          title={t("top.currentLanguage", "Joriy til: {{language}}", { language })}
        >
          <span key={language}>{language}</span>
        </button>
        <ThemeToggle variant="menu" />
        <button type="button" className="topbar__profile" onClick={() => navigate("/settings?tab=profile")} aria-label={t("top.openProfile", "{{name}} profilini ochish", { name: firstName })}>
          <span className="topbar__avatar">{avatar ? <img src={avatar} alt="" /> : firstName.charAt(0).toUpperCase()}</span>
          <span className="topbar__profile-name">{firstName}</span>
        </button>
      </div>
      {isOpen && (
        <aside className="notification-panel" aria-label={t("top.notificationCenter", "Bildirishnomalar markazi")}>
          <div className="notification-panel__header">
            <div><strong>{t("top.notifications", "Bildirishnomalar")}</strong><span>{unreadCount ? `${unreadCount} ${t("top.new", "ta yangi")}` : t("top.allRead", "Hammasi o'qilgan")}</span></div>
            <div className="notification-panel__actions">
              <button type="button" onClick={() => void markAllRead()} title={t("top.markAllRead", "Hammasini o'qilgan deb belgilash")} aria-label={t("top.markAllRead", "Hammasini o'qilgan deb belgilash")}><CheckCheck size={16} /></button>
              <button type="button" onClick={() => setIsOpen(false)} title={t("common.close", "Yopish")} aria-label={t("common.close", "Yopish")}><X size={16} /></button>
            </div>
          </div>
          <div className="notification-panel__list">
            {!notifications.length && <p className="notification-panel__empty">{t("top.none", "Hozircha bildirishnoma yo'q.")}</p>}
            {notifications.map((notification) => (
              <button type="button" className={`notification-item ${!notification.readAt ? "is-unread" : ""}`} key={notification.id} onClick={() => void openNotification(notification)}>
                <span className="notification-item__dot" />
                <span className="notification-item__body"><strong>{notification.title}</strong><span>{notification.message}</span><small>{relativeTime(notification.createdAt)}{locale === "uz" ? " oldin" : " назад"}</small></span>
              </button>
            ))}
          </div>
          <button type="button" className="notification-panel__footer" onClick={() => { setIsOpen(false); navigate("/settings?tab=notifications"); }}>{t("top.notificationSettings", "Bildirishnoma sozlamalari")}</button>
        </aside>
      )}
    </header>
  );
};

export default TopBar;
