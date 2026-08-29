import {
  BellPlus,
  Bot,
  CalendarPlus,
  CheckSquare,
  FolderOpen,
  Send,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { useI18n } from "../../../../i18n/useI18n";
import "./QuickActions.scss";

type QuickAction = {
  id: string;
  titleKey: string;
  title: string;
  subtitleKey: string;
  subtitle: string;
  icon: typeof Send;
  route?: string;
  prompt?: string;
};

const actions: QuickAction[] = [
  {
    id: "telegram",
    titleKey: "quick.telegram",
    title: "Telegramga yozish",
    subtitleKey: "quick.telegramHelp",
    subtitle: "AI orqali kontakt toping va tasdiqlab yuboring",
    icon: Send,
    prompt: "Telegram orqali xabar yubormoqchiman",
  },
  {
    id: "calendar",
    titleKey: "quick.calendar",
    title: "Uchrashuv yaratish",
    subtitleKey: "quick.calendarHelp",
    subtitle: "Kalendar uchun yangi uchrashuv",
    icon: CalendarPlus,
    route: "/calendar?create=1",
  },
  {
    id: "task",
    titleKey: "quick.task",
    title: "Vazifa yaratish",
    subtitleKey: "quick.taskHelp",
    subtitle: "Muddat va muhimlik bilan vazifa",
    icon: CheckSquare,
    route: "/tasks?create=1",
  },
  {
    id: "reminder",
    titleKey: "quick.reminder",
    title: "Eslatma qo‘yish",
    subtitleKey: "quick.reminderHelp",
    subtitle: "Vaqti kelganda bildirishnoma oling",
    icon: BellPlus,
    route: "/reminders?create=1",
  },
  {
    id: "files",
    titleKey: "quick.files",
    title: "Fayllarni ochish",
    subtitleKey: "quick.filesHelp",
    subtitle: "Hujjat, PDF va Drive fayllari",
    icon: FolderOpen,
    route: "/files",
  },
  {
    id: "ai",
    titleKey: "quick.ai",
    title: "AI yordamchi",
    subtitleKey: "quick.aiHelp",
    subtitle: "Reja, savol yoki boshqa amal",
    icon: Bot,
    prompt: "Bugungi rejamni ayt",
  },
];

const QuickActions = () => {
  const navigate = useNavigate();
  const { open: openAIChat, sendMessage } = useAIChat();
  const { t } = useI18n();

  const runAction = (action: QuickAction) => {
    if (action.route) {
      navigate(action.route);
      return;
    }

    if (action.prompt) {
      openAIChat();
      window.setTimeout(() => sendMessage(action.prompt!), 80);
    }
  };

  return (
    <section className="quick-actions">
      <div className="quick-actions__header">
        <div>
          <h2>{t("quick.title", "Tezkor amallar")}</h2>
          <p>{t("quick.subtitle", "Ko‘p ishlatiladigan real funksiyalar")}</p>
        </div>
        <button type="button" onClick={() => navigate("/ai-assistant")}>
          {t("quick.all", "AI bilan boshqarish")}
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="quick-actions__grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              className="quick-actions__item"
              key={action.id}
              onClick={() => runAction(action)}
            >
              <div className="quick-actions__icon"><Icon size={17} /></div>
              <div className="quick-actions__text">
                <strong>{t(action.titleKey, action.title)}</strong>
                <span>{t(action.subtitleKey, action.subtitle)}</span>
              </div>
              <ArrowUpRight className="quick-actions__arrow" size={14} />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
