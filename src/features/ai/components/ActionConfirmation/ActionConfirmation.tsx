import { Bell, CalendarDays, Check, Flag, ListTodo, NotebookPen, X } from "lucide-react";

import type { AIAction } from "../../actions/actionTypes";

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

const getActionDetails = (action: AIAction): ActionDetails => {
  switch (action.type) {
    case "createTask":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        priority: action.payload.priority,
        target: "Vazifalar",
        summary: action.payload.description,
      };
    case "createReminder":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        priority: action.payload.priority,
        target: "Eslatmalar",
        summary: action.payload.description,
      };
    case "createMeeting":
      return {
        title: action.payload.title,
        date: action.payload.dateLabel,
        time: action.payload.time,
        target: "Kalendar",
        summary: [action.payload.participant, action.payload.location, action.payload.reminder].filter(Boolean).join(" · ") || "Calendar uchrashuvi",
      };
    case "createNote":
      return {
        title: action.payload.title,
        target: "Qaydlar",
        summary: action.payload.content,
      };
    case "getTodayPlan":
      return {
        title: "Bugungi reja",
        date: "Bugun",
        target: "Bugungi reja",
        summary: "Task, reminder va uchrashuvlar jamlanadi.",
      };
  }
};

const getActionIcon = (action: AIAction) => {
  if (action.type === "createTask") return ListTodo;
  if (action.type === "createReminder") return Bell;
  if (action.type === "createMeeting") return CalendarDays;
  if (action.type === "createNote") return NotebookPen;
  return Flag;
};

const ActionConfirmation = ({ action, status, onConfirm, onDismiss }: ActionConfirmationProps) => {
  const details = getActionDetails(action);
  const Icon = getActionIcon(action);
  const resolved = status === "success" || status === "cancelled";

  return (
    <div className={`action-confirmation action-confirmation--${status}`}>
      <div className="action-confirmation__icon">
        {status === "success" ? <Check size={14} /> : status === "cancelled" ? <X size={14} /> : <Icon size={14} />}
      </div>

      <div className="action-confirmation__content">
        <strong className="action-confirmation__name">{status === "success" ? "Bajarildi" : status === "cancelled" ? "Bekor qilindi" : action.label}</strong>
        <span className="action-confirmation__title">{details.title}</span>
        {(details.date || details.time) && (
          <span className="action-confirmation__meta">
            {[details.date, details.time].filter(Boolean).join(" · ")}
          </span>
        )}
        <span className="action-confirmation__meta">{details.target}{details.priority ? ` · ${details.priority}` : ""}</span>
        <span className="action-confirmation__summary">{details.summary}</span>
      </div>

      {!resolved && <div className="action-confirmation__actions">
        <button type="button" className="action-confirmation__confirm" onClick={onConfirm} disabled={status === "loading"}>
          <Check size={13} />
          {status === "loading" ? "Saqlanmoqda..." : "Tasdiqlash"}
        </button>

        <button
          type="button"
          className="action-confirmation__dismiss"
          onClick={onDismiss}
          aria-label="Bekor qilish"
        >
          <X size={13} />
          <span>Bekor qilish</span>
        </button>
      </div>}
    </div>
  );
};

export default ActionConfirmation;
