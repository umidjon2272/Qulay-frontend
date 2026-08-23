import { CalendarDays, Check, Clock3, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDateKey } from "../../../../services/dateUtils";
import { getCalendarEvents, loadCalendarEvents } from "../../../../services/meetingService";
import { getReminders, loadReminders } from "../../../../services/reminderService";
import { getTasks, loadTasks, updateTask } from "../../../../services/taskService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import type { Task } from "../../../../types/workspace";
import "./MobileHomeDetails.scss";

const priorityLabel = (priority: Task["priority"]) => {
  if (priority === "Muhim") return "Yuqori";
  if (priority === "Oddiy") return "Past";
  return "O‘rta";
};

const MobileHomeDetails = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(getTasks);
  const [events, setEvents] = useState(getCalendarEvents);
  const [reminders, setReminders] = useState(getReminders);

  useEffect(() => subscribeToWorkspaceData(["tasks", "calendarEvents", "reminders"], () => {
    setTasks(getTasks());
    setEvents(getCalendarEvents());
    setReminders(getReminders());
  }), []);

  useEffect(() => {
    void Promise.all([loadTasks(), loadCalendarEvents(), loadReminders()]).catch(() => undefined);
  }, []);

  const today = getDateKey();
  const todayTasks = tasks.filter((task) => !task.date || task.date === today);
  const todayEvents = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const todayReminders = reminders
    .filter((reminder) => !reminder.completed && (!reminder.dateKey || reminder.dateKey === today))
    .sort((a, b) => a.time.localeCompare(b.time));
  const nextMeeting = useMemo(() => {
    const now = new Date().toTimeString().slice(0, 5);
    return todayEvents.find((event) => event.time >= now) ?? todayEvents[0];
  }, [todayEvents]);
  const nextReminder = todayReminders[0];
  const nextItem = nextMeeting ?? nextReminder;

  const toggleTask = async (task: Task) => {
    try {
      await updateTask(task.id, { completed: !task.completed });
      setTasks(getTasks());
    } catch {
      // The dashboard stays usable when a background update fails.
    }
  };

  return (
    <section className="mobile-home-details">
      {nextItem && (
        <div className="mobile-home-details__meeting">
          <div className="mobile-home-details__meeting-icon"><CalendarDays size={19} /></div>
          <div className="mobile-home-details__meeting-copy">
            <span className="mobile-home-details__eyebrow">{nextMeeting ? "KEYINGI UCHRASHUV" : "KEYINGI ESLATMA"}</span>
            <strong>{nextItem.title}</strong>
            <span>{`Bugun, ${nextItem.time}${nextMeeting?.participant ? ` · ${nextMeeting.participant}` : ""}`}</span>
            {nextMeeting?.location && <small><MapPin size={12} />{nextMeeting.location}</small>}
          </div>
          <span className="mobile-home-details__meeting-badge">{nextItem.time}</span>
        </div>
      )}

      <div className="mobile-home-details__tasks-header">
        <div><span className="mobile-home-details__eyebrow">BUGUN</span><h2>Bugungi vazifalar</h2></div>
        <button type="button" onClick={() => navigate("/tasks")}>Barchasi</button>
      </div>

      <div className="mobile-home-details__tasks">
        {todayTasks.slice(0, 3).map((task) => (
          <article className={`mobile-task-row ${task.completed ? "is-completed" : ""}`} key={task.id}>
            <button type="button" className="mobile-task-row__check" onClick={() => toggleTask(task)} aria-label={`${task.title} holatini o‘zgartirish`}>
              {task.completed && <Check size={14} />}
            </button>
            <button type="button" className="mobile-task-row__body" onClick={() => navigate("/tasks")}>
              <strong>{task.title}</strong>
              <span className={`mobile-task-row__priority mobile-task-row__priority--${task.priority === "Muhim" ? "high" : task.priority === "Oddiy" ? "low" : "medium"}`}><i />{priorityLabel(task.priority)}</span>
            </button>
            <span className="mobile-task-row__time"><Clock3 size={13} />{task.time}</span>
          </article>
        ))}
        {!todayTasks.length && <div className="mobile-home-details__empty"><Sparkles size={18} />Bugun uchun vazifalar yo‘q.</div>}
      </div>
    </section>
  );
};

export default MobileHomeDetails;
