import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SlidersHorizontal,
  User,
  Palette,
  Bell,
  Sparkles,
  Link2,
  Lock,
  ShieldCheck,
  Check,
  Moon,
  Sun,
  Monitor,
  Save,
  Camera,
  Download,
  Trash2,
  KeyRound,
  LogOut,
} from "lucide-react";

import { useToast } from "../../hooks/useToast";
import { useProfile } from "../../hooks/useProfile";
import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useIntegrations } from "../../hooks/useIntegrations";
import IntegrationHub from "../../components/IntegrationHub/IntegrationHub";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { readStorageString, removeStorage, writeStorage } from "../../services/storage";
import { defaultSettings, getSettings, updateSettings } from "../../services/settingsService";
import { clearMockSession } from "../../services/authService";
import { updateProfile } from "../../services/profileService";
import { subscribeToWorkspaceData, notifyWorkspaceDataChanged } from "../../services/workspaceEvents";

import "./Settings.scss";

type SectionId =
  | "general"
  | "profile"
  | "appearance"
  | "notifications"
  | "ai"
  | "integrations"
  | "privacy"
  | "security";

type Section = {
  id: SectionId;
  label: string;
  icon: ComponentType<{ size?: number }>;
};

const sections: Section[] = [
  { id: "general", label: "Umumiy", icon: SlidersHorizontal },
  { id: "profile", label: "Profil", icon: User },
  { id: "appearance", label: "Ko'rinish", icon: Palette },
  { id: "notifications", label: "Bildirishnomalar", icon: Bell },
  { id: "ai", label: "AI sozlamalari", icon: Sparkles },
  { id: "integrations", label: "Integratsiyalar", icon: Link2 },
  { id: "privacy", label: "Maxfiylik", icon: Lock },
  { id: "security", label: "Xavfsizlik", icon: ShieldCheck },
];

const isSectionId = (value: string | null): value is SectionId =>
  Boolean(value) && sections.some((section) => section.id === value);

const languages = ["O'zbekcha", "Русский", "English"];
const timezones = ["Toshkent (GMT+5)", "Moskva (GMT+3)", "London (GMT+0)"];
const dateFormats = ["12 Avgust 2026", "12.08.2026", "2026-08-12"];
const defaultPages = ["Bosh sahifa", "AI yordamchi", "Vazifalar"];

const replyStyles = ["Professional", "Do'stona", "Qisqa", "Batafsil"];
const replyLengths = ["Qisqa", "O'rta", "Batafsil"];
const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeParam = searchParams.get("tab");
  const active: SectionId = isSectionId(activeParam) ? activeParam : "general";

  const setActive = (id: SectionId) => {
    setSearchParams({ tab: id });
  };

  const { showToast } = useToast();
  const { name, email, bio, avatar, setName, setEmail, setBio, setAvatar } = useProfile();
  const { clearChat } = useAIChat();
  const { integrations, connectedCount } = useIntegrations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => getSettings().theme);

  const [language, setLanguage] = useState(() => getSettings().language);
  const [timezone, setTimezone] = useState(() => getSettings().timezone);
  const [dateFormat, setDateFormat] = useState(() => getSettings().dateFormat);
  const [defaultPage, setDefaultPage] = useState(() => getSettings().defaultPage);

  const [notifications, setNotifications] = useState(() => getSettings().notifications);

  const [replyStyle, setReplyStyle] = useState(() => getSettings().replyStyle);
  const [replyLength, setReplyLength] = useState(() => getSettings().replyLength);

  const [ai, setAi] = useState(() => getSettings().ai);

  const [twoFactor, setTwoFactor] = useState(() => getSettings().twoFactor);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleAi = (key: keyof typeof ai) => {
    setAi((current) => ({ ...current, [key]: !current[key] }));
  };

  useEffect(() => {
    updateSettings({ theme, language, timezone, dateFormat, defaultPage, notifications, replyStyle, replyLength, ai, twoFactor });
  }, [theme, language, timezone, dateFormat, defaultPage, notifications, replyStyle, replyLength, ai, twoFactor]);

  useEffect(() => {
    const backendLanguage = language === "O'zbekcha" ? "uz" : language === "English" ? "en" : "ru";
    const backendTimezone = timezone.startsWith("Toshkent") ? "Asia/Tashkent" : timezone.startsWith("Moskva") ? "Europe/Moscow" : "Europe/London";
    void updateProfile({ language: backendLanguage, timezone: backendTimezone }).catch(() => undefined);
  }, [language, timezone]);

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setTheme(getSettings().theme);
  }), []);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      showToast("Ism kamida 2 ta belgidan iborat bo'lsin", "error");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      showToast("To'g'ri email manzilini kiriting", "error");
      return;
    }

    updateSettings({ theme, language, timezone, dateFormat, defaultPage, notifications, replyStyle, replyLength, ai, twoFactor });
    const backendLanguage = language === "O'zbekcha" ? "uz" : language === "English" ? "en" : "ru";
    const backendTimezone = timezone.startsWith("Toshkent") ? "Asia/Tashkent" : timezone.startsWith("Moskva") ? "Europe/Moscow" : "Europe/London";
    try {
      await updateProfile({ name, bio, avatar, language: backendLanguage, timezone: backendTimezone });
      showToast("Sozlamalar saqlandi", "success");
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

  const handleExportData = () => {
    const data = {
      profile: { name, email, bio },
      integrations: integrations
        .filter((item) => item.connected)
        .map((item) => ({ id: item.id, name: item.name, username: item.username })),
      settings: readStorageString(STORAGE_KEYS.settings) || null,
      tasks: readStorageString(STORAGE_KEYS.tasks) || null,
      reminders: readStorageString(STORAGE_KEYS.reminders) || null,
      calendarEvents: readStorageString(STORAGE_KEYS.calendarEvents) || null,
      notes: readStorageString(STORAGE_KEYS.notes) || null,
      files: readStorageString(STORAGE_KEYS.files) || null,
      chatHistory: readStorageString(STORAGE_KEYS.aiChatHistory) || null,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "yechim-ai-malumotlari.json";
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Ma'lumotlar eksport qilindi", "success");
  };

  const handleClearHistory = () => {
    clearChat();
    showToast("Chat tarixi tozalandi", "success");
  };

  const handleDeleteAccount = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setName("Yechim foydalanuvchi");
    setEmail("user@yechim.ai");
    setBio("Yechim AI foydalanuvchisi");
    setAvatar(null);
    clearChat();
    clearMockSession();
    [
      STORAGE_KEYS.files,
      STORAGE_KEYS.integrations,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.aiChatHistory,
    ].forEach(removeStorage);

    writeStorage(STORAGE_KEYS.files, []);
    writeStorage(STORAGE_KEYS.integrations, {});
    updateSettings(defaultSettings);
    notifyWorkspaceDataChanged("files");
    notifyWorkspaceDataChanged("integrations");

    setConfirmingDelete(false);
    showToast("Hisob ma'lumotlari o'chirildi", "success");
    navigate("/login", { replace: true });
  };

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <span className="settings-header__eyebrow">ISH MAYDONI</span>
          <h1>Sozlamalar</h1>
          <p>Profil, ko'rinish va AI afzalliklaringizni boshqaring.</p>
        </div>

        <button type="button" className="settings-header__save" onClick={handleSave}>
          <Save size={15} />
          Saqlash
        </button>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = active === section.id;

            return (
              <button
                type="button"
                key={section.id}
                className={`settings-nav__item ${isActive ? "is-active" : ""}`}
                onClick={() => setActive(section.id)}
              >
                <Icon size={17} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="settings-panel">
          {active === "general" && (
            <div className="settings-card">
              <h2>Umumiy sozlamalar</h2>
              <p>Ish maydoningiz uchun asosiy afzalliklar.</p>

              <div className="settings-row-list">
                <div className="settings-row">
                  <div>
                    <strong>Til</strong>
                    <span>Interfeys tilini tanlang</span>
                  </div>

                  <div className="settings-chips">
                    {languages.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={language === item ? "is-active" : ""}
                        onClick={() => {
                          setLanguage(item);
                          showToast(`Til: ${item}`, "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Vaqt zonasi</strong>
                    <span>Sana va vaqtlar shu zonada ko'rsatiladi</span>
                  </div>

                  <div className="settings-chips">
                    {timezones.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={timezone === item ? "is-active" : ""}
                        onClick={() => {
                          setTimezone(item);
                          showToast("Vaqt zonasi yangilandi", "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Sana formati</strong>
                    <span>Masalan: {dateFormat}</span>
                  </div>

                  <div className="settings-chips">
                    {dateFormats.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={dateFormat === item ? "is-active" : ""}
                        onClick={() => {
                          setDateFormat(item);
                          showToast("Sana formati yangilandi", "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Standart sahifa</strong>
                    <span>Kirganingizda ochiladigan sahifa</span>
                  </div>

                  <div className="settings-chips">
                    {defaultPages.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={defaultPage === item ? "is-active" : ""}
                        onClick={() => {
                          setDefaultPage(item);
                          showToast("Standart sahifa yangilandi", "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === "profile" && (
            <div className="settings-card">
              <h2>Profil ma'lumotlari</h2>
              <p>Ismingiz, email va profil rasmingizni yangilang.</p>

              <div className="settings-avatar">
                <div className="settings-avatar__preview">
                  {avatar ? (
                    <img src={avatar} alt={`${name} avatari`} />
                  ) : (
                    <span>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="settings-avatar__actions">
                  <button
                    type="button"
                    className="settings-avatar__upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={14} />
                    Rasmni almashtirish
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />

                  {avatar && (
                    <button
                      type="button"
                      className="settings-avatar__remove"
                      onClick={() => {
                        setAvatar(null);
                        showToast("Avatar o'chirildi", "success");
                      }}
                    >
                      O'chirish
                    </button>
                  )}
                </div>
              </div>

              <label>
                Ism
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  disabled
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label>
                Bio
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="settings-card__submit"
                onClick={() => showToast("Profil saqlandi", "success")}
              >
                <Check size={14} />
                Saqlash
              </button>
            </div>
          )}

          {active === "appearance" && (
            <div className="settings-card">
              <h2>Ko'rinish</h2>
              <p>Interfeys mavzusini tanlang.</p>

              <div className="settings-theme">
                {[
                  { id: "light" as const, label: "Yorug'", hint: "Tavsiya etiladi", icon: Sun },
                  { id: "dark" as const, label: "Qorong'i", hint: "Ko'zga yumshoq", icon: Moon },
                  { id: "system" as const, label: "Tizim", hint: "Avtomatik moslashadi", icon: Monitor },
                ].map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.id;

                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={`settings-theme__item ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        setTheme(option.id);
                        showToast(`${option.label} tema tanlandi`, "success");
                      }}
                    >
                      <div
                        className={`settings-theme__preview settings-theme__preview--${option.id}`}
                      >
                        <Icon size={16} />
                      </div>

                      <strong>{option.label}</strong>
                      <span>{option.hint}</span>

                      {isActive && <Check size={14} className="settings-theme__check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="settings-card">
              <h2>Bildirishnomalar</h2>
              <p>Qanday bildirishnomalar olishni xohlaysiz.</p>

              <div className="settings-toggle-list">
                {(
                  [
                    { key: "aiReplies" as const, label: "AI javoblari", hint: "AI javob bergani haqida bildirishnoma" },
                    { key: "newTasks" as const, label: "Yangi vazifalar", hint: "Yangi vazifa yaratilganda xabar berish" },
                    { key: "meetingReminders" as const, label: "Uchrashuv eslatmalari", hint: "Uchrashuvdan oldin eslatish" },
                    { key: "telegram" as const, label: "Telegram xabarlari", hint: "Telegram orqali bildirishnomalar" },
                    { key: "email" as const, label: "Email bildirishnomalari", hint: "Muhim yangiliklar email orqali" },
                    { key: "weekly" as const, label: "Haftalik hisobot", hint: "Har hafta faoliyat xulosasi" },
                  ]
                ).map((item) => (
                  <div className="settings-toggle-row" key={item.key}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </div>

                    <button
                      type="button"
                      className={`settings-switch ${notifications[item.key] ? "is-on" : ""}`}
                      onClick={() => toggleNotification(item.key)}
                      role="switch"
                      aria-checked={notifications[item.key]}
                      aria-label={item.label}
                    >
                      <i />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "ai" && (
            <div className="settings-card">
              <h2>AI sozlamalari</h2>
              <p>Yechim AI qanday ishlashini sozlang.</p>

              <div className="settings-row-list">
                <div className="settings-row">
                  <div>
                    <strong>AI javob uslubi</strong>
                    <span>Javoblar qanday ohangda bo'lsin</span>
                  </div>

                  <div className="settings-chips">
                    {replyStyles.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={replyStyle === item ? "is-active" : ""}
                        onClick={() => {
                          setReplyStyle(item);
                          showToast("AI javob uslubi yangilandi", "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>AI javob uzunligi</strong>
                    <span>Javoblar qancha batafsil bo'lsin</span>
                  </div>

                  <div className="settings-chips">
                    {replyLengths.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={replyLength === item ? "is-active" : ""}
                        onClick={() => {
                          setReplyLength(item);
                          showToast("AI javob uzunligi yangilandi", "success");
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Ovoz tili</strong>
                    <span>Ovozli kiritish va javob tili</span>
                  </div>

                  <div className="settings-chips">
                    <button type="button" className="is-active">
                      O'zbekcha
                    </button>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Mikrofon</strong>
                    <span>Ovozli xabar yozish uchun ruxsat</span>
                  </div>

                  <button
                    type="button"
                    className="settings-outline-btn"
                    onClick={async () => {
                      if (!navigator.mediaDevices?.getUserMedia) {
                        showToast("Bu brauzer mikrofon ruxsatini qo'llab-quvvatlamaydi", "error");
                        return;
                      }

                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach((track) => track.stop());
                        showToast("Mikrofonga ruxsat berildi", "success");
                      } catch {
                        showToast("Mikrofonga ruxsat berilmadi", "error");
                      }
                    }}
                  >
                    Ruxsat berish
                  </button>
                </div>
              </div>

              <div className="settings-toggle-list settings-toggle-list--spaced">
                {(
                  [
                    { key: "voiceReply" as const, label: "Ovozli javob", hint: "AI javobini ovozda o'qish imkoniyati" },
                    { key: "autoSpeak" as const, label: "Avtomatik ovoz", hint: "AI javob berganda avtomatik o'qiladi" },
                    { key: "saveHistory" as const, label: "AI suhbat tarixini saqlash", hint: "Suhbatlar shu qurilmada saqlanadi" },
                  ]
                ).map((item) => (
                  <div className="settings-toggle-row" key={item.key}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </div>

                    <button
                      type="button"
                      className={`settings-switch ${ai[item.key] ? "is-on" : ""}`}
                      onClick={() => toggleAi(item.key)}
                      role="switch"
                      aria-checked={ai[item.key]}
                      aria-label={item.label}
                    >
                      <i />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "integrations" && (
            <div className="settings-card settings-card--wide">
              <div className="settings-integrations__header">
                <div>
                  <h2>Integratsiyalar</h2>
                  <p>Yechim AI'ni kundalik xizmatlaringiz bilan bog'lang.</p>
                </div>

                <div className="settings-integrations__stats">
                  <strong>{connectedCount}</strong> ta ulangan ·{" "}
                  <strong>{integrations.length - connectedCount}</strong> ta mavjud
                </div>
              </div>

              <IntegrationHub columns={3} />
            </div>
          )}

          {active === "privacy" && (
            <div className="settings-card">
              <h2>Maxfiylik</h2>
              <p>Ma'lumotlaringiz qanday saqlanishini boshqaring.</p>

              <div className="settings-info-list">
                <div className="settings-info-row">
                  <strong>Chat tarixini saqlash</strong>
                  <span>AI suhbatlari shu brauzerda lokal ravishda saqlanadi.</span>
                </div>

                <div className="settings-info-row">
                  <strong>Faoliyat ma'lumotlari</strong>
                  <span>AI xizmatlarini yaxshilash uchun ishlatiladi.</span>
                </div>

                <div className="settings-info-row">
                  <strong>Shaxsiy ma'lumotlar</strong>
                  <span>Profil ma'lumotlaringizni istalgan vaqtda boshqarishingiz mumkin.</span>
                </div>
              </div>

              <div className="settings-actions">
                <button type="button" className="settings-outline-btn" onClick={handleExportData}>
                  <Download size={14} />
                  Ma'lumotlarni eksport qilish
                </button>

                <button type="button" className="settings-outline-btn" onClick={handleClearHistory}>
                  <Trash2 size={14} />
                  Chat tarixini tozalash
                </button>

                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={handleDeleteAccount}
                  onBlur={() => setConfirmingDelete(false)}
                >
                  <Trash2 size={14} />
                  {confirmingDelete ? "Tasdiqlash uchun qayta bosing" : "Hisob ma'lumotlarini o'chirish"}
                </button>
              </div>
            </div>
          )}

          {active === "security" && (
            <div className="settings-card">
              <h2>Xavfsizlik</h2>
              <p>Hisobingiz xavfsizligini boshqaring.</p>

              <div className="settings-toggle-list">
                <div className="settings-toggle-row">
                  <div>
                    <strong>Parol</strong>
                    <span>Hisobingiz parolini yangilang</span>
                  </div>

                  <button
                    type="button"
                    className="settings-outline-btn"
                    onClick={() => showToast("Parolni almashtirish mock rejimda tasdiqlandi", "success")}
                  >
                    <KeyRound size={14} />
                    Parolni o'zgartirish
                  </button>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <strong>Ikki bosqichli himoya</strong>
                    <span>Qo'shimcha xavfsizlik qatlami</span>
                  </div>

                  <button
                    type="button"
                    className={`settings-switch ${twoFactor ? "is-on" : ""}`}
                    onClick={() => {
                      setTwoFactor((value) => !value);
                      showToast(twoFactor ? "Ikki bosqichli himoya o'chirildi" : "Ikki bosqichli himoya yoqildi", "success");
                    }}
                    role="switch"
                    aria-checked={twoFactor}
                    aria-label="Ikki bosqichli himoya"
                  >
                    <i />
                  </button>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <strong>Faol sessiyalar</strong>
                    <span>2 ta faol sessiya</span>
                  </div>

                  <button
                    type="button"
                    className="settings-outline-btn"
                    onClick={() => {
                      clearMockSession();
                      showToast("Sessiya yakunlandi", "success");
                      navigate("/login");
                    }}
                  >
                    <LogOut size={14} />
                    Chiqish
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Settings;
