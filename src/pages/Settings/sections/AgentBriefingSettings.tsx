import { useEffect, useState } from "react";
import { AlarmClock, MessageCircle, Moon, Sparkles, Sunrise, TrendingUp } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { agentSettingsApi, type AgentSettings } from "../../../services/api/agentSettingsApi";
import { useI18n } from "../../../i18n/useI18n";

const DEFAULTS: AgentSettings = {
  replyStyle: 'Professional',
  replyLength: "O'rta",
  saveHistory: true,
  confirmExternalActions: true,
  voiceReply: true,
  morningBriefingEnabled: true,
  morningBriefingTime: "08:00",
  eveningSummaryEnabled: true,
  eveningSummaryTime: "21:00",
  telegramDelivery: false,
  inAppDelivery: true,
  proactiveEnabled: true,
  financialAlertsEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "Asia/Tashkent",
};

const TIMEZONE_OPTIONS = [
  { value: "Asia/Tashkent", label: "Toshkent (UTC+5)" },
  { value: "Asia/Samarkand", label: "Samarqand (UTC+5)" },
  { value: "Asia/Almaty", label: "Almaty (UTC+6)" },
  { value: "Asia/Bishkek", label: "Bishkek (UTC+6)" },
  { value: "Asia/Dushanbe", label: "Dushanbe (UTC+5)" },
  { value: "Asia/Ashgabat", label: "Ashxabod (UTC+5)" },
  { value: "Europe/Moscow", label: "Moskva (UTC+3)" },
  { value: "UTC", label: "UTC" },
];

const AgentBriefingSettings = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AgentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    agentSettingsApi.get().then((result) => { if (active) setSettings(result); }).catch(() => {
      if (active) showToast(t("agentBriefing.loadError", "Agent sozlamalarini yuklab bo'lmadi"), "error");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast, t]);

  const patch = async (input: Partial<AgentSettings>) => {
    const previous = settings;
    const next = { ...settings, ...input };
    setSettings(next);
    try {
      const saved = await agentSettingsApi.update(input);
      setSettings(saved);
    } catch {
      setSettings(previous);
      showToast(t("agentBriefing.saveError", "Sozlamani saqlab bo'lmadi"), "error");
    }
  };

  const toggle = (key: keyof AgentSettings) => void patch({ [key]: !settings[key] } as Partial<AgentSettings>);

  if (loading) {
    return <div className="settings-card"><h2>{t("agentBriefing.title", "Agent va briefing")}</h2><p>{t("common.loading", "Yuklanmoqda...")}</p></div>;
  }

  return (
    <div className="settings-card">
      <h2>{t("agentBriefing.title", "Agent va briefing")}</h2>
      <p>{t("agentBriefing.subtitle", "Ertalabki briefing, kechki yakun va proaktiv tavsiyalarni sozlang.")}</p>

      <div className="settings-toggle-list">
        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><Sunrise size={16} /></div>
          <div><strong>{t("agentBriefing.morning", "Ertalabki briefing")}</strong><span>{t("agentBriefing.morningHint", "Har kuni tanlangan vaqtda kunlik reja yuboriladi")}</span></div>
          <button type="button" className={`settings-switch ${settings.morningBriefingEnabled ? "is-on" : ""}`} onClick={() => toggle("morningBriefingEnabled")} role="switch" aria-checked={settings.morningBriefingEnabled}><i /></button>
        </div>
        {settings.morningBriefingEnabled && (
          <div className="settings-time-range">
            <label>{t("agentBriefing.time", "Vaqt")}<input type="time" value={settings.morningBriefingTime} onChange={(event) => void patch({ morningBriefingTime: event.target.value })} /></label>
          </div>
        )}

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><Moon size={16} /></div>
          <div><strong>{t("agentBriefing.evening", "Kechki yakun")}</strong><span>{t("agentBriefing.eveningHint", "Kun oxirida bajarilgan va bajarilmagan ishlar yakuni")}</span></div>
          <button type="button" className={`settings-switch ${settings.eveningSummaryEnabled ? "is-on" : ""}`} onClick={() => toggle("eveningSummaryEnabled")} role="switch" aria-checked={settings.eveningSummaryEnabled}><i /></button>
        </div>
        {settings.eveningSummaryEnabled && (
          <div className="settings-time-range">
            <label>{t("agentBriefing.time", "Vaqt")}<input type="time" value={settings.eveningSummaryTime} onChange={(event) => void patch({ eveningSummaryTime: event.target.value })} /></label>
          </div>
        )}

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><AlarmClock size={16} /></div>
          <div><strong>{t("agentBriefing.inApp", "Platforma ichida olish")}</strong><span>{t("agentBriefing.inAppHint", "Dashboard va bildirishnomalar markazida ko'rsatish")}</span></div>
          <button type="button" className={`settings-switch ${settings.inAppDelivery ? "is-on" : ""}`} onClick={() => toggle("inAppDelivery")} role="switch" aria-checked={settings.inAppDelivery}><i /></button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><MessageCircle size={16} /></div>
          <div><strong>{t("agentBriefing.telegram", "Telegram orqali olish")}</strong><span>{t("agentBriefing.telegramHint", "Ulangan Telegram akkauntingizga ham yuborish")}</span></div>
          <button type="button" className={`settings-switch ${settings.telegramDelivery ? "is-on" : ""}`} onClick={() => toggle("telegramDelivery")} role="switch" aria-checked={settings.telegramDelivery}><i /></button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><Sparkles size={16} /></div>
          <div><strong>{t("agentBriefing.proactive", "Proaktiv tavsiyalar")}</strong><span>{t("agentBriefing.proactiveHint", "AI muhim holatlarni o'zi aniqlab tavsiya bersin")}</span></div>
          <button type="button" className={`settings-switch ${settings.proactiveEnabled ? "is-on" : ""}`} onClick={() => toggle("proactiveEnabled")} role="switch" aria-checked={settings.proactiveEnabled}><i /></button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><TrendingUp size={16} /></div>
          <div><strong>{t("agentBriefing.financial", "Moliyaviy ogohlantirishlar")}</strong><span>{t("agentBriefing.financialHint", "Xarajat keskin oshsa yoki budjetdan oshilsa xabar berish")}</span></div>
          <button type="button" className={`settings-switch ${settings.financialAlertsEnabled ? "is-on" : ""}`} onClick={() => toggle("financialAlertsEnabled")} role="switch" aria-checked={settings.financialAlertsEnabled}><i /></button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-row__icon"><Moon size={16} /></div>
          <div><strong>{t("agentBriefing.quietHours", "Agent uchun tinch vaqt")}</strong><span>{t("agentBriefing.quietHoursHint", "Tanlangan vaqt oralig'ida proaktiv xabar yuborilmaydi")}</span></div>
          <button type="button" className={`settings-switch ${settings.quietHoursStart ? "is-on" : ""}`} onClick={() => void patch(settings.quietHoursStart ? { quietHoursStart: null, quietHoursEnd: null } : { quietHoursStart: "22:00", quietHoursEnd: "07:00" })} role="switch" aria-checked={Boolean(settings.quietHoursStart)}><i /></button>
        </div>
        {settings.quietHoursStart && (
          <div className="settings-time-range">
            <label>{t("agentBriefing.quietStart", "Boshlanish")}<input type="time" value={settings.quietHoursStart} onChange={(event) => void patch({ quietHoursStart: event.target.value })} /></label>
            <span>&rarr;</span>
            <label>{t("agentBriefing.quietEnd", "Tugash")}<input type="time" value={settings.quietHoursEnd ?? "07:00"} onChange={(event) => void patch({ quietHoursEnd: event.target.value })} /></label>
          </div>
        )}
      </div>

      <div className="settings-field-grid">
        <label>{t("agentBriefing.timezone", "Vaqt zonasi")}
          <select value={settings.timezone} onChange={(event) => void patch({ timezone: event.target.value })}>
            {TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
};

export default AgentBriefingSettings;
