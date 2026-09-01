import { Bell, CalendarDays, Check, Flag, ListTodo, NotebookPen, Send, Sparkles, X } from "lucide-react";

import type { AIAction } from "../../actions/actionTypes";
import { getLocale, translate } from "../../../../i18n/useI18n";

import "./ActionConfirmation.scss";

type ActionConfirmationProps = {
  action: AIAction;
  status: "pending" | "loading" | "success" | "cancelled" | "failed";
  onConfirm: () => void | Promise<void>;
  onDismiss: () => void;
};

type ActionDetails = {
  title: string;
  date?: string;
  time?: string;
  priority?: string;
  target: string;
  summary: string;
};

const getActionDetails = (action: AIAction, t: (key:string,fallback:string)=>string): ActionDetails => {
  switch (action.type) {
    case "createTask":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        priority: action.payload.priority,
        target: t("nav.tasks", "Vazifalar"),
        summary: action.payload.description,
      };
    case "createReminder":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        priority: action.payload.priority,
        target: t("nav.reminders", "Eslatmalar"),
        summary: action.payload.description,
      };
    case "createMeeting":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        target: t("nav.calendar", "Kalendar"),
        summary: [action.payload.participant, action.payload.location, action.payload.reminder].filter(Boolean).join(" · ") || t("ai.action.calendarMeeting", "Kalendar uchrashuvi"),
      };
    case "createNote":
      return {
        title: action.payload.title,
        target: t("nav.notes", "Qaydlar"),
        summary: action.payload.content,
      };
    case "getTodayPlan":
      return {
        title: t("briefing.title", "Bugungi reja"),
        date: t("common.today", "Bugun"),
        target: t("briefing.title", "Bugungi reja"),
        summary: t("ai.action.todaySummary", "Vazifa, eslatma va uchrashuvlar jamlanadi."),
      };
    case "sendTelegramMessage":
      return {
        title: action.payload.recipientUsername
          ? `${action.payload.recipientName} (@${action.payload.recipientUsername})`
          : action.payload.recipientName,
        target: "Telegram",
        summary: `“${action.payload.text}”`,
      };
    case "confirmAgentAction": {
      const preview = action.payload.preview;
      const ru = getLocale() === 'ru';
      const fieldLabels: Record<string, string> = { title: ru ? 'Название' : 'Nomi', amount: ru ? 'Сумма' : 'Summa', currency: ru ? 'Валюта' : 'Valyuta', type: ru ? 'Тип' : 'Turi', transactionDate: ru ? 'Дата' : 'Sana', recipient: ru ? 'Получатель' : 'Qabul qiluvchi', text: ru ? 'Сообщение' : 'Xabar', value: ru ? 'Сведения' : 'Ma’lumot', firstName: ru ? 'Имя' : 'Ism', lastName: ru ? 'Фамилия' : 'Familiya', dueAt: ru ? 'Срок' : 'Muddat', remindAt: ru ? 'Время' : 'Vaqt', startAt: ru ? 'Начало' : 'Boshlanish', endAt: ru ? 'Окончание' : 'Tugash', start: ru ? 'Начало' : 'Boshlanish', end: ru ? 'Окончание' : 'Tugash', description: ru ? 'Описание' : 'Izoh', content: ru ? 'Текст' : 'Matn', note: ru ? 'Заметка' : 'Izoh', location: ru ? 'Место' : 'Joy', phone: ru ? 'Телефон' : 'Telefon', email: 'Email', displayName: ru ? 'Имя' : 'Ism', key: ru ? 'Тема' : 'Mavzu', priority: ru ? 'Приоритет' : 'Muhimlik' };
      const format = (value: unknown): string => {
        if (Array.isArray(value)) return value.map((item, index) => `${index + 1}. ${format(item && typeof item === 'object' && 'preview' in item ? item.preview : item)}`).join('\n\n');
        if (!value || typeof value !== 'object') return String(value ?? '');
        const item = value as Record<string, unknown>;
        return Object.entries(item).filter(([key, val]) => val != null && fieldLabels[key]).map(([key, val]) => {
          let display = String(val);
          if (key === 'amount') display = Number(val).toLocaleString(ru ? 'ru-RU' : 'uz-UZ', { maximumFractionDigits: 2 });
          if (key === 'type') display = val === 'INCOME' ? (ru ? 'Доход' : 'Daromad') : val === 'EXPENSE' ? (ru ? 'Расход' : 'Xarajat') : String(val);
          if (/^(transactionDate|dueAt|remindAt|startAt|endAt|start|end)$/.test(key) && !Number.isNaN(Date.parse(String(val)))) display = new Date(String(val)).toLocaleString(ru ? 'ru-RU' : 'uz-UZ', { timeZone: typeof item.timezone === 'string' ? item.timezone : undefined });
          return `${fieldLabels[key]}: ${display}`;
        }).join('\n') || (item.changes ? format(item.changes) : t('ai.action.prepared', 'AI tayyorlagan amal'));
      };
      return { title: action.payload.tool === '__batch__' ? (ru ? 'Несколько действий' : 'Bir nechta amal') : '', target: t('ai.action.agent', 'AI agent'), summary: format(preview) };
    }
  }
};

const getActionIcon = (action: AIAction) => {
  if (action.type === "createTask") return ListTodo;
  if (action.type === "createReminder") return Bell;
  if (action.type === "createMeeting") return CalendarDays;
  if (action.type === "createNote") return NotebookPen;
  if (action.type === "sendTelegramMessage") return Send;
  if (action.type === "confirmAgentAction") return Sparkles;
  return Flag;
};

const ActionConfirmation = ({ action, status, onConfirm, onDismiss }: ActionConfirmationProps) => {
  const t = (key: string, fallback: string) => translate(key, fallback, getLocale());
  const details = getActionDetails(action, t);
  const Icon = getActionIcon(action);
  const resolved = status === "success" || status === "cancelled" || status === "failed";

  return (
    <div className={`action-confirmation action-confirmation--${status}`}>
      <div className="action-confirmation__icon">
        {status === "success" ? <Check size={14} /> : status === "cancelled" ? <X size={14} /> : <Icon size={14} />}
      </div>

      <div className="action-confirmation__content">
        <strong className="action-confirmation__name">{status === "success" ? t("common.completed", "Bajarildi") : status === "cancelled" ? t("ai.action.cancelled", "Bekor qilindi") : status === "failed" ? t("ai.action.failed", "Bajarilmadi — holatini tekshiring") : action.label}</strong>
        <span className="action-confirmation__title">
          {action.type === "sendTelegramMessage" ? `${t("ai.action.recipient", "Qabul qiluvchi")}: ${details.title}` : details.title}
        </span>
        {(details.date || details.time) && (
          <span className="action-confirmation__meta">
            {[details.date, details.time].filter(Boolean).join(" · ")}
          </span>
        )}
        <span className="action-confirmation__meta">{details.target}{details.priority ? ` · ${details.priority}` : ""}</span>
        <span className="action-confirmation__summary">
          {action.type === "sendTelegramMessage" ? `${t("ai.action.message", "Xabar")}: ${details.summary}` : details.summary}
        </span>
      </div>

      {!resolved && <div className="action-confirmation__actions">
        <button type="button" className="action-confirmation__confirm" onClick={onConfirm} disabled={status === "loading"}>
          <Check size={13} />
          {status === "loading" ? t("common.saving", "Saqlanmoqda...") : t("common.confirm", "Tasdiqlash")}
        </button>

        <button
          type="button"
          className="action-confirmation__dismiss"
          onClick={onDismiss}
          disabled={status === "loading"}
          aria-label={t("common.cancel", "Bekor qilish")}
        >
          <X size={13} />
          <span>{t("common.cancel", "Bekor qilish")}</span>
        </button>
      </div>}
    </div>
  );
};

export default ActionConfirmation;
