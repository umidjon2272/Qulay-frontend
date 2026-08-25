import { useEffect, useRef, useState, type ChangeEvent, type ComponentType } from "react";
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
  User,
} from "lucide-react";

import { useToast } from "../../hooks/useToast";
import { useProfile } from "../../hooks/useProfile";
import { useIntegrations } from "../../hooks/useIntegrations";
import IntegrationHub from "../../components/IntegrationHub/IntegrationHub";
import { getSettings, updateSettings } from "../../services/settingsService";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { updateProfile } from "../../services/profileService";

import "./Settings.scss";

type SectionId = "profile" | "appearance" | "notifications" | "language" | "integrations";

type SettingsSection = {
  id: SectionId;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
};

const sections: SettingsSection[] = [
  { id: "appearance", label: "Ko'rinish", description: "Yorug' yoki qorong'i rejim", icon: Palette },
  { id: "notifications", label: "Bildirishnomalar", description: "Vazifalar, eslatmalar va AI", icon: Bell },
  { id: "language", label: "Til", description: "O'zbek yoki rus tili", icon: Languages },
  { id: "integrations", label: "Integratsiyalar", description: "Telegram, Calendar va Drive", icon: Link2 },
];

const isSectionId = (value: string | null): value is SectionId =>
  Boolean(value) && (value === "profile" || sections.some((section) => section.id === value));

type NotificationKey = "newTasks" | "reminders" | "meetingReminders" | "aiReplies";

const notificationItems: Array<{
  key: NotificationKey;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  { key: "newTasks", label: "Vazifalar", hint: "Vazifa yangilanganda xabar berish", icon: Check },
  { key: "reminders", label: "Eslatmalar", hint: "Eslatma vaqti yaqinlashganda xabar berish", icon: Bell },
  { key: "meetingReminders", label: "Uchrashuvlar", hint: "Uchrashuvdan oldin eslatish", icon: CalendarDays },
  { key: "aiReplies", label: "AI tavsiyalari", hint: "Qulay AI tavsiyalari haqida xabar berish", icon: Sparkles },
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
  onLogout: () => void;
  onBack?: () => void;
};

const SettingsRoot = ({ onSelect, onLogout, onBack }: SettingsRootProps) => (
  <section className="settings-root" aria-label="Sozlamalar">
    <header className="settings-root__header">
      {onBack && <button type="button" className="settings-root__back" onClick={onBack} aria-label="Profilga qaytish"><ArrowLeft size={18} /></button>}
      <div>
        <span className="settings-root__eyebrow">QULAY AI</span>
        <h1>Sozlamalar</h1>
      </div>
    </header>

    <div className="settings-root__group">
      <span className="settings-root__label">Akkaunt</span>
      <button type="button" onClick={() => onSelect("profile")}>
        <span className="settings-row-icon"><User size={18} /></span><span>Profil</span><ChevronRight size={18} />
      </button>
      <button type="button" className="is-disabled" disabled>
        <span className="settings-row-icon"><KeyRound size={18} /></span><span>Parolni o'zgartirish</span><small>Tez orada</small>
      </button>
      <button type="button" className="is-danger" onClick={onLogout}>
        <span className="settings-row-icon"><LogOut size={18} /></span><span>Chiqish</span><ChevronRight size={18} />
      </button>
    </div>

    <div className="settings-root__group">
      {sections.map((section) => {
        const Icon = section.icon;
          return (
            <button type="button" key={section.id} onClick={() => onSelect(section.id)}>
              <span className="settings-row-icon"><Icon size={18} /></span>
              <span><strong>{section.label}</strong><small>{section.description}</small></span>
            <ChevronRight size={18} />
          </button>
        );
      })}
    </div>
  </section>
);

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
  const { name, email, bio, avatar, setName, setBio, setAvatar } = useProfile();
  const { integrations } = useIntegrations();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => getSettings().theme === "dark" ? "dark" : "light");
  const [language, setLanguage] = useState(() => getSettings().language === "O'zbekcha" ? "O'zbekcha" : "Русский");
  const [notifications, setNotifications] = useState(() => getSettings().notifications);
  const [firstName, setFirstName] = useState(() => splitName(name).firstName);
  const [lastName, setLastName] = useState(() => splitName(name).lastName);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    const parts = splitName(name);
    setFirstName(parts.firstName);
    setLastName(parts.lastName);
  }, [name]);

  useEffect(() => {
    updateSettings({ theme, notifications });
  }, [theme, notifications]);

  useEffect(() => {
    const backendLanguage = language === "O'zbekcha" ? "uz" : "ru";
    updateSettings({ language });
    void updateProfile({ language: backendLanguage }).catch(() => undefined);
  }, [language]);

  const handleProfileSave = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (fullName.length < 2) {
      showToast("Ism kamida 2 ta belgidan iborat bo'lsin", "error");
      return;
    }

    setName(fullName);
    try {
      await updateProfile({ name: fullName, bio, avatar });
      showToast("Profil saqlandi", "success");
    } catch {
      showToast("Profilni serverda saqlab bo'lmadi", "error");
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Faqat rasm faylini tanlang", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Avatar hajmi 2 MB dan oshmasin", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        showToast("Avatar yangilandi", "success");
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

  const title = active === "profile" ? "Profil" : sections.find((section) => section.id === active)?.label ?? "Sozlamalar";

  return (
    <main className={`settings-page settings-page--${active ?? "root"}`}>
      {!active ? (
        <SettingsRoot onSelect={setActive} onLogout={() => setConfirmingLogout(true)} onBack={fromProfile ? goToProfile : undefined} />
      ) : (
        <section className="settings-subpage">
          <header className="settings-header">
            <button type="button" className="settings-header__back" onClick={goToRoot} aria-label="Sozlamalarga qaytish">
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="settings-header__eyebrow">SOZLAMALAR</span>
              <h1>{title}</h1>
              <p>Qulay AI afzalliklaringizni boshqaring.</p>
            </div>
            {active === "profile" ? (
              <button type="button" className="settings-header__save" onClick={() => void handleProfileSave()}>
                <Save size={15} /> Saqlash
              </button>
            ) : <span className="settings-header__placeholder" aria-hidden="true" />}
          </header>

          <section className="settings-panel">
            {active === "profile" && (
              <div className="settings-card">
                <h2>Profil ma'lumotlari</h2>
                <p>Avatar, ism va bio ma'lumotlaringizni yangilang.</p>

                <div className="settings-avatar">
                  <div className="settings-avatar__preview">
                    {avatar ? <img src={avatar} alt={`${name} avatari`} /> : <span>{name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="settings-avatar__actions">
                    <button type="button" className="settings-avatar__upload" onClick={() => fileInputRef.current?.click()}>
                      <Camera size={14} /> Rasmni almashtirish
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    {avatar && <button type="button" className="settings-avatar__remove" onClick={() => setAvatar(null)}>O'chirish</button>}
                  </div>
                </div>

                <label>Ism<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
                <label>Familiya<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
                <label>Email<input type="email" value={email} readOnly aria-readonly="true" /></label>
                <label>Bio<textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} /></label>

                <div className="settings-profile-actions">
                  <button type="button" className="settings-card__submit" onClick={() => void handleProfileSave()}>
                    <Check size={14} /> Saqlash
                  </button>
                  <button type="button" className="settings-danger-btn" onClick={() => setConfirmingLogout(true)}>
                    <LogOut size={14} /> Akkauntdan chiqish
                  </button>
                </div>

                <button type="button" className="settings-profile-settings" onClick={() => navigate("/settings", { state: { fromProfile: true } })}>
                  <span className="settings-profile-settings__icon"><SettingsIcon size={16} /></span>
                  <span><strong>Sozlamalar</strong><small>Profil va ilova afzalliklari</small></span>
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {active === "appearance" && (
              <div className="settings-card">
                <h2>Ko'rinish</h2>
                <p>Interfeys mavzusini tanlang.</p>
                <div className="settings-theme settings-theme--compact" role="group" aria-label="Mavzu">
                  <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")}>
                    <span className="settings-row-icon"><Sun size={17} /></span><strong>Yorug'</strong>{theme === "light" && <Check size={14} />}
                  </button>
                  <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")}>
                    <span className="settings-row-icon"><Moon size={17} /></span><strong>Qorong'i</strong>{theme === "dark" && <Check size={14} />}
                  </button>
                </div>
              </div>
            )}

            {active === "language" && (
              <div className="settings-card">
                <h2>Til</h2>
                <p>Qulay AI interfeysi uchun tilni tanlang.</p>
                <div className="settings-language-list" role="radiogroup" aria-label="Til">
                  {languageOptions.map((option) => (
                    <button type="button" key={option.value} className={language === option.value ? "is-active" : ""} onClick={() => setLanguage(option.value)} role="radio" aria-checked={language === option.value}>
                      <span className="settings-row-icon"><Languages size={17} /></span><span>{option.label}</span>{language === option.value && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active === "notifications" && (
              <div className="settings-card">
                <h2>Bildirishnomalar</h2>
                <p>Qaysi xabarlarni olishni xohlaysiz.</p>
                <div className="settings-toggle-list">
                  {notificationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="settings-toggle-row" key={item.key}>
                        <div className="settings-toggle-row__icon"><Icon size={16} /></div>
                        <div><strong>{item.label}</strong><span>{item.hint}</span></div>
                        <button type="button" className={`settings-switch ${notifications[item.key] ? "is-on" : ""}`} onClick={() => setNotifications((current) => ({ ...current, [item.key]: !current[item.key] }))} role="switch" aria-checked={notifications[item.key]} aria-label={item.label}><i /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {active === "integrations" && (
              <div className="settings-card settings-card--wide">
                <div className="settings-integrations__header">
                  <div><h2>Integratsiyalar</h2><p>Telegram, Google Calendar va Google Drive.</p></div>
                  <span className="settings-integrations__stats">{integrations.filter((item) => item.connected).length} ta ulangan</span>
                </div>
                <IntegrationHub columns={1} />
              </div>
            )}
          </section>
        </section>
      )}

      {confirmingLogout && (
        <ConfirmDialog
          title="Akkauntdan chiqmoqchimisiz?"
          description="Sessiyangiz va qurilmadagi tokenlar tozalanadi."
          confirmLabel="Chiqish"
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={() => void handleLogout()}
        />
      )}
    </main>
  );
};

export default Settings;
