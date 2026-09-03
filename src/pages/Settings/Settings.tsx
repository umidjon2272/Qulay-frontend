import { useEffect, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import { agentSettingsApi, type UpdateAgentSettingsInput } from '../../services/api/agentSettingsApi';
import { applyAiPreferences } from '../../services/aiPreferences';
import { subscribeToWorkspaceData } from '../../services/workspaceEvents';
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Camera,
  CalendarDays,
  Check,
  ChevronRight,
  KeyRound,
  Languages,
  Link2,
  LogOut,
  Moon,
  Palette,
  Save,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Sunrise,
  User,
} from "lucide-react";

import { useToast } from "../../hooks/useToast";
import { useProfile } from "../../hooks/useProfile";
import { useIntegrations } from "../../hooks/useIntegrations";
import ChangePasswordModal from "../../components/ChangePasswordModal/ChangePasswordModal";
import IntegrationHub from "../../components/IntegrationHub/IntegrationHub";
import { getSettings, updateSettings } from "../../services/settingsService";
import { playNotificationChime } from '../../services/notificationSound';
import { getGoogleStatus } from "../../services/integrationService";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { updateProfile } from "../../services/profileService";
import { notificationApi } from "../../services/api";
import { disableWebPush, enableWebPush, webPushStatus } from '../../services/webPush';
import type { ApiNotificationPreference } from "../../services/api/types";
import { useI18n } from "../../i18n/useI18n";
import Memory from "../Memory/Memory";
import AgentBriefingSettings from "./sections/AgentBriefingSettings";

import "./Settings.scss";

type SectionId = "profile" | "appearance" | "notifications" | "ai" | "agentBriefing" | "language" | "integrations";

type SettingsSection = {
  id: SectionId;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
};

type TFn = (key: string, fallback: string, params?: Record<string, string | number>) => string;

const sectionIds: SectionId[] = ["appearance", "notifications", "ai", "agentBriefing", "language", "integrations"];

const getSections = (t: TFn): SettingsSection[] => [
  { id: "appearance", label: t("settings.appearance", "Ko'rinish"), description: t("settings.appearance.hint", "Yorug' yoki qorong'i rejim"), icon: Palette },
  { id: "notifications", label: t("settings.notifications", "Bildirishnomalar"), description: t("settings.notifications.hint", "Ovoz, tinch vaqt va xabar turlari"), icon: Bell },
  { id: "ai", label: t("settings.ai", "AI va maxfiylik"), description: t("settings.ai.hint", "Xotira, javob va maxfiylik nazorati"), icon: Sparkles },
  { id: "agentBriefing", label: t("agentBriefing.title", "Agent va briefing"), description: t("agentBriefing.subtitle.short", "Ertalabki reja, kechki yakun va proaktiv tavsiyalar"), icon: Sunrise },
  { id: "language", label: t("settings.language", "Til"), description: t("settings.language.hint", "O'zbek yoki rus tili"), icon: Languages },
  { id: "integrations", label: t("settings.integrations", "Integratsiyalar"), description: t("settings.integrations.hint", "Telegram, Calendar va Drive"), icon: Link2 },
];

const isSectionId = (value: string | null): value is SectionId =>
  Boolean(value) && (value === "profile" || sectionIds.includes(value as SectionId));

type NotificationKey = "newTasks" | "reminders" | "meetingReminders" | "aiReplies" | "telegram" | "webPush";

const getNotificationItems = (t: TFn): Array<{
  key: NotificationKey;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number }>;
}> => [
  { key: "newTasks", label: t("admin.item.tasks", "Vazifalar"), hint: t("settings.notif.newTasksHint", "Vazifa yangilanganda xabar berish"), icon: Check },
  { key: "reminders", label: t("admin.item.reminders", "Eslatmalar"), hint: t("settings.notif.remindersHint", "Eslatma vaqti yaqinlashganda xabar berish"), icon: Bell },
  { key: "meetingReminders", label: t("admin.item.meetings", "Uchrashuvlar"), hint: t("settings.notif.meetingsHint", "Uchrashuvdan oldin eslatish"), icon: CalendarDays },
  { key: "aiReplies", label: t("settings.notif.aiRepliesLabel", "AI tavsiyalari"), hint: t("settings.notif.aiRepliesHint", "Qulay AI tavsiyalari haqida xabar berish"), icon: Sparkles },
  { key: "telegram", label: t("settings.notif.telegramLabel", "Telegram bildirishnomalari"), hint: t("settings.notif.telegramHint", "Ulangan Telegram akkauntingizga yuborish"), icon: Bell },
  { key: "webPush", label: t("settings.notif.webPushLabel", "Web push"), hint: t("settings.notif.webPushDeviceHint", "Sayt yopiq bo‘lganda ham shu qurilmaga bildirishnoma"), icon: Bell },
];

const languageOptions = [
  { value: "O'zbekcha", label: "O'zbek" },
  { value: "Русский", label: "Русский" },
];

const splitName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
};

type SettingsRootProps = {
  onSelect: (section: SectionId) => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onBack?: () => void;
};

const SettingsRoot = ({ onSelect, onChangePassword, onLogout, onBack }: SettingsRootProps) => {
  const { t } = useI18n();
  return <section className="settings-root" aria-label={t("settings.title", "Sozlamalar")}>
    <header className="settings-root__header">
      {onBack && <button type="button" className="settings-root__back" onClick={onBack} aria-label={t("settings.backToProfile", "Profilga qaytish")}><ArrowLeft size={18} /></button>}
      <div><span className="settings-root__eyebrow">QULAY AI</span><h1>{t("settings.title", "Sozlamalar")}</h1></div>
    </header>
    <div className="settings-root__group">
      <span className="settings-root__label">{t("settings.account", "Akkaunt")}</span>
      <button type="button" onClick={() => onSelect("profile")}><span className="settings-row-icon"><User size={18} /></span><span>{t("nav.profile", "Profil")}</span><ChevronRight size={18} /></button>
      <button type="button" onClick={onChangePassword}><span className="settings-row-icon"><KeyRound size={18} /></span><span>{t("settings.security", "Parolni o'zgartirish")}</span><ChevronRight size={18} /></button>
      <button type="button" className="is-danger" onClick={onLogout}><span className="settings-row-icon"><LogOut size={18} /></span><span>{t("nav.logout", "Chiqish")}</span><ChevronRight size={18} /></button>
    </div>
    <div className="settings-root__group">
      {getSections(t).map((section) => {
        const Icon = section.icon;
        return <button type="button" key={section.id} onClick={() => onSelect(section.id)}><span className="settings-row-icon"><Icon size={18} /></span><span><strong>{section.label}</strong><small>{section.description}</small></span><ChevronRight size={18} /></button>;
      })}
    </div>
  </section>;
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const activeParam = searchParams.get("tab");
  const active: SectionId | null = isSectionId(activeParam) ? activeParam : null;
  const setActive = (section: SectionId) => setSearchParams({ tab: section });
  const goToRoot = () => setSearchParams({});
  const goToProfile = () => navigate("/settings?tab=profile", { replace: true });
  const fromProfile = location.state && typeof location.state === "object" && "fromProfile" in location.state && location.state.fromProfile === true;

  const { showToast } = useToast();
  const { t } = useI18n();
  const { name, email, bio, avatar, setName, setBio, setAvatar } = useProfile();
  const { integrations, sync } = useIntegrations();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => getSettings().theme === "dark" ? "dark" : "light");
  const [language, setLanguage] = useState(() => getSettings().language === "O'zbekcha" ? "O'zbekcha" : "Русский");
  const [notifications, setNotifications] = useState(() => getSettings().notifications);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const notificationSavingRef = useRef(false);
  const notificationRevision = useRef(0);
  const [aiSettings, setAiSettings] = useState(() => getSettings().ai);
  const [aiSaving, setAiSaving] = useState(false);
  const aiSavingRef = useRef(false);
  const [replyStyle, setReplyStyle] = useState(() => getSettings().replyStyle);
  const [replyLength, setReplyLength] = useState(() => getSettings().replyLength);
  const [firstName, setFirstName] = useState(() => splitName(name).firstName);
  const [lastName, setLastName] = useState(() => splitName(name).lastName);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const googleOAuthHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const oauthIntegration = searchParams.get("integration");
    if (active !== "integrations" && oauthIntegration !== "google") return;
    const oauthStatus = searchParams.get("status");
    const oauthReason = searchParams.get("reason");
    const oauthErrorCode = searchParams.get("errorCode");
    const oauthMessage = searchParams.get("message");
    const oauthKey = oauthIntegration === "google" ? `${oauthStatus ?? "status"}:${oauthReason ?? ""}:${oauthErrorCode ?? ""}` : null;
    let activeRequest = true;
    void getGoogleStatus().then((status) => {
      if (!activeRequest) return;
      const account = status.email ?? status.displayName ?? "Google";
      sync("google-calendar", Boolean(status.connected && status.calendarEnabled), account);
      sync("google-drive", Boolean(status.connected && status.driveEnabled), account);

      if (oauthIntegration === "google" && oauthKey && googleOAuthHandledRef.current !== oauthKey) {
        googleOAuthHandledRef.current = oauthKey;
        if (oauthStatus === "connected" && status.connected) {
          const connectedServices = [status.calendarEnabled ? "Calendar" : null, status.driveEnabled ? "Drive" : null].filter(Boolean).join(` ${t("common.and", "va")} `);
          showToast(connectedServices ? t("settings.google.connectedWith", "Google {services} ulandi", { services: connectedServices }) : t("settings.google.connectedNoScopes", "Google akkaunti ulandi, lekin kerakli ruxsatlar topilmadi"), connectedServices ? "success" : "error");
        } else if (oauthStatus === "cancelled" || oauthReason === "cancelled") showToast(t("settings.google.cancelled", "Google ulanishi bekor qilindi"), "info");
        else if (oauthStatus === "error") showToast(oauthMessage || (oauthErrorCode ? t("settings.google.oauthErrorCode", "Google OAuth xatosi: {code}", { code: oauthErrorCode }) : t("settings.google.finishFailed", "Google ulanishini yakunlab bo'lmadi")), "error");
      }

      if (oauthIntegration === "google") setSearchParams({ tab: "integrations" }, { replace: true });
    }).catch((error) => showToast(error instanceof Error && error.message ? error.message : t("settings.google.checkFailed", "Google ulanish holatini tekshirib bo'lmadi"), "error"));
    return () => { activeRequest = false; };
  }, [active, searchParams, setSearchParams, showToast, sync, t]);

  useEffect(() => {
    const parts = splitName(name);
    setFirstName(parts.firstName);
    setLastName(parts.lastName);
  }, [name]);

  useEffect(() => {
    updateSettings({ theme, notifications });
  }, [theme, notifications]);

  useEffect(() => subscribeToWorkspaceData('settings', () => {
    const settings = getSettings(); setAiSettings(settings.ai); setReplyStyle(settings.replyStyle); setReplyLength(settings.replyLength);
  }), []);

  const saveAi = async (patch: UpdateAgentSettingsInput) => {
    if (aiSavingRef.current) return;
    aiSavingRef.current = true; setAiSaving(true);
    try { applyAiPreferences(await agentSettingsApi.update(patch)); }
    catch { showToast(t('settings.aiSaveError', 'AI sozlamasi saqlanmadi. Qayta urinib ko‘ring.'), 'error'); }
    finally { aiSavingRef.current = false; setAiSaving(false); }
  };

  useEffect(() => {
    if (active !== "notifications") return;
    let live = true;
    const revision = notificationRevision.current;
    void Promise.all([notificationApi.getPreferences(), webPushStatus().catch(() => ({ available: false, subscribed: false }))]).then(([preferences, push]) => {
      if (!live || revision !== notificationRevision.current) return;
      setNotifications((current) => ({
        ...current,
        newTasks: preferences.taskEnabled,
        reminders: preferences.reminderEnabled,
        meetingReminders: preferences.meetingEnabled,
        aiReplies: preferences.aiEnabled,
        telegram: preferences.telegramEnabled,
        webPush: push.subscribed,
      }));
    }).catch(() => { if (live) showToast(t("settings.notifPrefsLoadError", "Bildirishnoma sozlamalarini yuklab bo'lmadi"), "error"); });
    return () => { live = false; };
  }, [active, showToast, t]);


  const updateLocalNotificationSetting = <K extends keyof typeof notifications>(key: K, value: (typeof notifications)[K]) => {
    setNotifications((current) => ({ ...current, [key]: value }));
  };

  const updateLocalAiSetting = <K extends keyof typeof aiSettings>(key: K, value: (typeof aiSettings)[K]) => {
    if (key !== 'autoSpeak') void saveAi({ [key]: value });
  };

  const preferencePatchFor = (key: NotificationKey, value: boolean): Partial<ApiNotificationPreference> => ({
    newTasks: { taskEnabled: value },
    reminders: { reminderEnabled: value },
    meetingReminders: { meetingEnabled: value },
    aiReplies: { aiEnabled: value },
    telegram: { telegramEnabled: value },
    webPush: { webPushEnabled: value },
  }[key]);

  const toggleNotification = async (key: NotificationKey) => {
    if (notificationSavingRef.current) return;
    notificationSavingRef.current = true;
    notificationRevision.current++;
    setNotificationSaving(true);
    const nextValue = !notifications[key];
    try {
      if (key === 'webPush') { if (nextValue) await enableWebPush(); else await disableWebPush(); }
      else await notificationApi.updatePreferences(preferencePatchFor(key, nextValue));
      setNotifications((current) => ({ ...current, [key]: nextValue }));
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : t("settings.notifPrefSaveError", "Bildirishnoma sozlamasini saqlab bo'lmadi"), "error");
    } finally { notificationSavingRef.current = false; setNotificationSaving(false); }
  };

  const languageSaving = useRef(false);
  const saveLanguage = async (nextLanguage: string) => {
    if (languageSaving.current || language === nextLanguage) return;
    languageSaving.current = true;
    try {
      await updateProfile({ language: nextLanguage === "O'zbekcha" ? 'uz' : 'ru' });
      updateSettings({ language: nextLanguage });
      setLanguage(nextLanguage);
    } catch { showToast(t('settings.languageSaveError', 'Til sozlamasi saqlanmadi.'), 'error'); }
    finally { languageSaving.current = false; }
  };

  const handleProfileSave = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (fullName.length < 2) {
      showToast(t("settings.nameTooShort", "Ism kamida 2 ta belgidan iborat bo'lsin"), "error");
      return;
    }

    setName(fullName);
    try {
      await updateProfile({ name: fullName, bio, avatar });
      showToast(t("settings.profileSaved", "Profil saqlandi"), "success");
    } catch {
      showToast(t("settings.profileSaveError", "Profilni serverda saqlab bo'lmadi"), "error");
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast(t("settings.avatarNotImage", "Faqat rasm faylini tanlang"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast(t("settings.avatarTooLarge", "Avatar hajmi 2 MB dan oshmasin"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        showToast(t("settings.avatarUpdated", "Avatar yangilandi"), "success");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleLogout = async () => {
    setConfirmingLogout(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const title = active === "profile" ? t("nav.profile", "Profil") : active === "appearance" ? t("settings.appearance", "Ko'rinish") : active === "notifications" ? t("settings.notifications", "Bildirishnomalar") : active === "ai" ? t("settings.ai", "AI yordamchi") : active === "agentBriefing" ? t("agentBriefing.title", "Agent va briefing") : active === "language" ? t("settings.language", "Til") : active === "integrations" ? t("settings.integrations", "Integratsiyalar") : t("settings.title", "Sozlamalar");

  return (
    <main className={`settings-page settings-page--${active ?? "root"}`}>
      {!active ? (
        <SettingsRoot onSelect={setActive} onChangePassword={() => setChangingPassword(true)} onLogout={() => setConfirmingLogout(true)} onBack={fromProfile ? goToProfile : undefined} />
      ) : (
        <section className="settings-subpage">
          <header className="settings-header">
            <button type="button" className="settings-header__back" onClick={goToRoot} aria-label={t("settings.backToSettings", "Sozlamalarga qaytish")}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="settings-header__eyebrow">{t("settings.title", "SOZLAMALAR").toUpperCase()}</span>
              <h1>{title}</h1>
              <p>{t("settings.subtitle", "Qulay AI afzalliklaringizni boshqaring.")}</p>
            </div>
            {active === "profile" ? (
              <button type="button" className="settings-header__save" onClick={() => void handleProfileSave()}>
                <Save size={15} /> {t("common.save", "Saqlash")}
              </button>
            ) : <span className="settings-header__placeholder" aria-hidden="true" />}
          </header>

          <section className="settings-panel">
            {active === "profile" && (
              <div className="settings-card">
                <h2>{t("settings.profileInfo.title", "Profil ma'lumotlari")}</h2>
                <p>{t("settings.profileInfo.subtitle", "Avatar, ism va bio ma'lumotlaringizni yangilang.")}</p>

                <div className="settings-avatar">
                  <div className="settings-avatar__preview">
                    {avatar ? <img src={avatar} alt={t("settings.avatarAlt", "{name} avatari", { name })} /> : <span>{name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="settings-avatar__actions">
                    <button type="button" className="settings-avatar__upload" onClick={() => fileInputRef.current?.click()}>
                      <Camera size={14} /> {t("settings.changePhoto", "Rasmni almashtirish")}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    {avatar && <button type="button" className="settings-avatar__remove" onClick={() => setAvatar(null)}>{t("common.delete", "O'chirish")}</button>}
                  </div>
                </div>

                <label>{t("settings.firstNameLabel", "Ism")}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
                <label>{t("settings.lastNameLabel", "Familiya")}<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
                <label>{t("settings.emailLabel", "Email")}<input type="email" value={email} readOnly aria-readonly="true" /></label>
                <label>{t("settings.bioLabel", "Bio")}<textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} /></label>

                <div className="settings-profile-actions">
                  <button type="button" className="settings-card__submit" onClick={() => void handleProfileSave()}>
                    <Check size={14} /> {t("common.save", "Saqlash")}
                  </button>
                  <button type="button" className="settings-danger-btn" onClick={() => setConfirmingLogout(true)}>
                    <LogOut size={14} /> {t("nav.logout", "Akkauntdan chiqish")}
                  </button>
                </div>

                <button type="button" className="settings-profile-settings" onClick={() => navigate("/settings", { state: { fromProfile: true } })}>
                  <span className="settings-profile-settings__icon"><SettingsIcon size={16} /></span>
                  <span><strong>{t("settings.title", "Sozlamalar")}</strong><small>{t("settings.profileSettingsHint", "Profil va ilova afzalliklari")}</small></span>
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {active === "appearance" && (
              <div className="settings-card">
                <h2>{t("settings.appearance", "Ko'rinish")}</h2>
                <p>{t("settings.appearance.subtitle", "Interfeys mavzusini tanlang.")}</p>
                <div className="settings-theme settings-theme--compact" role="group" aria-label={t("settings.themeAria", "Mavzu")}>
                  <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")}>
                    <span className="settings-row-icon"><Sun size={17} /></span><strong>{t("settings.themeLight", "Yorug'")}</strong>{theme === "light" && <Check size={14} />}
                  </button>
                  <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")}>
                    <span className="settings-row-icon"><Moon size={17} /></span><strong>{t("settings.themeDark", "Qorong'i")}</strong>{theme === "dark" && <Check size={14} />}
                  </button>
                </div>
              </div>
            )}

            {active === "language" && (
              <div className="settings-card">
                <h2>{t("settings.language", "Til")}</h2>
                <p>{t("settings.subtitle", "Qulay AI interfeysi uchun tilni tanlang.")}</p>
                <div className="settings-language-list" role="radiogroup" aria-label={t("settings.language", "Til")}>
                  {languageOptions.map((option) => (
                    <button type="button" key={option.value} className={language === option.value ? "is-active" : ""} onClick={() => void saveLanguage(option.value)} role="radio" aria-checked={language === option.value}>
                      <span className="settings-row-icon"><Languages size={17} /></span><span>{option.label}</span>{language === option.value && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active === "notifications" && (
              <div className="settings-card">
                <h2>{t("settings.notifications", "Bildirishnomalar")}</h2>
                <p>{t("settings.notifications.subtitle", "Qaysi xabarlarni olishni xohlaysiz.")}</p>
                <div className="settings-toggle-list">
                  {getNotificationItems(t).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="settings-toggle-row" key={item.key}>
                        <div className="settings-toggle-row__icon"><Icon size={16} /></div>
                        <div><strong>{item.label}</strong><span>{item.hint}</span></div>
                        <button type="button" disabled={notificationSaving} className={`settings-switch ${notifications[item.key] ? "is-on" : ""}`} onClick={() => void toggleNotification(item.key)} role="switch" aria-checked={notifications[item.key]} aria-label={item.label}><i /></button>
                      </div>
                    );
                  })}
                  <div className="settings-toggle-row">
                    <div className="settings-toggle-row__icon"><Bell size={16} /></div>
                    <div><strong>{t("settings.soundLabel", "Bildirishnoma ovozi")}</strong><span>{t("settings.soundHint", "Yangi muhim xabar kelganda yumshoq signal chalinsin.")}</span></div>
                    <button type="button" className={`settings-switch ${notifications.sound ? "is-on" : ""}`} onClick={() => updateLocalNotificationSetting("sound", !notifications.sound)} role="switch" aria-checked={notifications.sound} aria-label={t("settings.soundLabel", "Bildirishnoma ovozi")}><i /></button>
                  </div>
                  <div className="settings-sound-preview">
                    <div><strong>Qulay Glass</strong><span>{t('settings.chimeDescription', 'Yumshoq, ikki notali original signal')}</span></div>
                    <button type="button" onClick={() => void playNotificationChime(true).catch(() => showToast(t('settings.chimeError', 'Ovozni yoqib bo‘lmadi. Brauzer va qurilma ovozini tekshiring.'), 'error'))}>{t('settings.chimePreview', 'Ovozni eshitish')}</button>
                    <label>{t('settings.volume', 'Ovoz balandligi')} <output>{Math.round(notifications.soundVolume * 100)}%</output>
                      <input type="range" min="0" max="100" step="5" value={Math.round(notifications.soundVolume * 100)} onChange={event => updateLocalNotificationSetting('soundVolume', Number(event.target.value) / 100)} />
                    </label>
                    <small>{t('settings.chimeHelp', 'Sayt ochiq bo‘lganda ishlaydi. Brauzer ovozga ruxsat berishi uchun sahifaga bir marta bosing. Tinch vaqt qurilma soati bo‘yicha.')}</small>
                  </div>
                  <div className="settings-toggle-row">
                    <div className="settings-toggle-row__icon"><Moon size={16} /></div>
                    <div><strong>{t("settings.quietHours", "Tinch vaqt")}</strong><span>{t("settings.quietHoursHint", "Tanlangan vaqtda ovozli bildirishnomalar chalinmaydi.")}</span></div>
                    <button type="button" className={`settings-switch ${notifications.quietHoursEnabled ? "is-on" : ""}`} onClick={() => updateLocalNotificationSetting("quietHoursEnabled", !notifications.quietHoursEnabled)} role="switch" aria-checked={notifications.quietHoursEnabled} aria-label={t("settings.quietHours", "Tinch vaqt")}><i /></button>
                  </div>
                  {notifications.quietHoursEnabled && <div className="settings-time-range"><label>{t("settings.quietStart", "Boshlanish")}<input type="time" value={notifications.quietHoursStart} onChange={(event) => updateLocalNotificationSetting("quietHoursStart", event.target.value)} /></label><span>→</span><label>{t("settings.quietEnd", "Tugash")}<input type="time" value={notifications.quietHoursEnd} onChange={(event) => updateLocalNotificationSetting("quietHoursEnd", event.target.value)} /></label></div>}
                </div>
              </div>
            )}

            {active === "ai" && (
              <div className="settings-card">
                <h2>{t("settings.ai", "AI yordamchi")}</h2>
                <p>{t("settings.ai.subtitle", "Qulay AI qanday javob berishi va amallarni qanday tasdiqlashini sozlang.")}</p>
                <div className="settings-field-grid">
                  <label>{t("settings.replyStyleLabel", "Javob uslubi")}<select disabled={aiSaving} value={replyStyle} onChange={(event) => void saveAi({ replyStyle: event.target.value })}><option value="Professional">{t("settings.replyStyle.professional", "Professional")}</option><option value="Sodda">{t("settings.replyStyle.simple", "Sodda")}</option><option value="Qisqa">{t("settings.replyStyle.short", "Qisqa")}</option></select></label>
                  <label>{t("settings.replyLengthLabel", "Javob uzunligi")}<select disabled={aiSaving} value={replyLength} onChange={(event) => void saveAi({ replyLength: event.target.value })}><option value="Qisqa">{t("settings.replyLength.short", "Qisqa")}</option><option value="O'rta">{t("settings.replyLength.medium", "O'rta")}</option><option value="Batafsil">{t("settings.replyLength.detailed", "Batafsil")}</option></select></label>
                </div>
                <div className="settings-toggle-list">
                  <div className="settings-toggle-row"><div className="settings-toggle-row__icon"><Sparkles size={16} /></div><div><strong>{t("settings.saveHistoryLabel", "Chat tarixini saqlash")}</strong><span>{t("settings.saveHistoryHint", "Yoqilsa suhbatlar akkauntda saqlanadi. O‘chirilsa yangi chat matni faqat vaqtinchalik xotirada turadi; amal auditi saqlanadi.")}</span></div><button type="button" disabled={aiSaving} className={`settings-switch ${aiSettings.saveHistory ? "is-on" : ""}`} onClick={() => updateLocalAiSetting("saveHistory", !aiSettings.saveHistory)} role="switch" aria-checked={aiSettings.saveHistory}><i /></button></div>
                  <div className="settings-toggle-row"><div className="settings-toggle-row__icon"><Bell size={16} /></div><div><strong>{t("settings.confirmExternalLabel", "Tashqi amallarni tasdiqlash")}</strong><span>{t("settings.confirmExternalHint", "Telegram xabari va boshqa tashqi amallar yuborilishidan oldin tasdiqlash so'ralsin.")}</span></div><button type="button" disabled={aiSaving} className={`settings-switch ${aiSettings.confirmExternalActions ? "is-on" : ""}`} onClick={() => updateLocalAiSetting("confirmExternalActions", !aiSettings.confirmExternalActions)} role="switch" aria-checked={aiSettings.confirmExternalActions}><i /></button></div>
                  <div className="settings-toggle-row"><div className="settings-toggle-row__icon"><Sparkles size={16} /></div><div><strong>{t("settings.voiceReplyLabel", "Ovozli javob")}</strong><span>{t("settings.voiceReplyHint", "Voice Mode'da AI javobini ovoz bilan o'qishi mumkin.")}</span></div><button type="button" disabled={aiSaving} className={`settings-switch ${aiSettings.voiceReply ? "is-on" : ""}`} onClick={() => updateLocalAiSetting("voiceReply", !aiSettings.voiceReply)} role="switch" aria-checked={aiSettings.voiceReply}><i /></button></div>
                </div>
              </div>
            )}
            {active === "ai" && <Memory />}

            {active === "agentBriefing" && <AgentBriefingSettings />}

            {active === "integrations" && (
              <div className="settings-card settings-card--wide">
                <div className="settings-integrations__header">
                  <div><h2>{t("settings.integrations", "Integratsiyalar")}</h2><p>{t("settings.integrations.subtitle", "Telegram, Google Calendar, Google Drive va WhatsApp.")}</p></div>
                  <span className="settings-integrations__stats">{t("settings.connectedCount", "{count} ta ulangan", { count: integrations.filter((item) => item.connected).length })}</span>
                </div>
                <IntegrationHub columns={1} />
              </div>
            )}
          </section>
        </section>
      )}

      {confirmingLogout && (
        <ConfirmDialog
          title={t("settings.logoutConfirm.title", "Akkauntdan chiqmoqchimisiz?")}
          description={t("settings.logoutConfirm.description", "Sessiyangiz va qurilmadagi tokenlar tozalanadi.")}
          confirmLabel={t("nav.logout", "Chiqish")}
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={() => void handleLogout()}
        />
      )}
      {changingPassword && (
        <ChangePasswordModal
          onCancel={() => setChangingPassword(false)}
          onSuccess={async () => {
            setChangingPassword(false);
            showToast(t("settings.passwordUpdatedRelogin", "Parolingiz yangilandi. Qayta kiring."), "success");
            await logout();
            navigate("/login", { replace: true });
          }}
        />
      )}
    </main>
  );
};

export default Settings;
