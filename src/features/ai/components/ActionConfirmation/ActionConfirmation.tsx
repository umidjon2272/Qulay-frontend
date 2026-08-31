import { Bell, CalendarDays, Check, Flag, ListTodo, NotebookPen, Send, Sparkles, X } from "lucide-react";

import type { AIAction } from "../../actions/actionTypes";
import { getLocale, translate } from "../../../../i18n/useI18n";

import "./ActionConfirmation.scss";

type ActionConfirmationProps = {
  action: AIAction;
  status: "pending" | "loading" | "success" | "cancelled";
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
      const summary = preview && typeof preview === "object"
        ? Object.entries(preview as Record<string, unknown>).slice(0, 5).map(([key, value]) => `${key}: ${String(value ?? "—")}`).join(" · ")
        : String(preview ?? t("ai.action.prepared", "AI tayyorlagan amal"));
      return { title: action.label, target: t("ai.action.agent", "AI agent"), summary };
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
  const resolved = status === "success" || status === "cancelled";

  return (
    <div className={`action-confirmation action-confirmation--${status}`}>
      <div className="action-confirmation__icon">
        {status === "success" ? <Check size={14} /> : status === "cancelled" ? <X size={14} /> : <Icon size={14} />}
      </div>

      <div className="action-confirmation__content">
        <strong className="action-confirmation__name">{status === "success" ? t("common.completed", "Bajarildi") : status === "cancelled" ? t("ai.action.cancelled", "Bekor qilindi") : action.label}</strong>
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
