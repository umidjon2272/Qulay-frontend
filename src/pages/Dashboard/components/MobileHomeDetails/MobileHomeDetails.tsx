import { CalendarDays, Check, Clock3, MapPin, MoreHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDateKey } from "../../../../services/dateUtils";
import { getCalendarEvents, loadCalendarEvents } from "../../../../services/meetingService";
import { getTasks, loadTasks, updateTask } from "../../../../services/taskService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import type { Task } from "../../../../types/workspace";
import "./MobileHomeDetails.scss";

const priorityLabel = (priority: Task["priority"]) => {
  if (priority === "Muhim") return "Yuqori";
  if (priority === "O‘rta") return "O‘rta";
  return "Past";
};

const MobileHomeDetails = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(getTasks);
  const [events, setEvents] = useState(getCalendarEvents);

  useEffect(() => subscribeToWorkspaceData(["tasks", "calendarEvents"], () => {
    setTasks(getTasks());
    setEvents(getCalendarEvents());
  }), []);
  useEffect(() => { void Promise.all([loadTasks(), loadCalendarEvents()]).catch(() => undefined); }, []);

  const today = getDateKey();
  const todayTasks = tasks.filter((task) => !task.date || task.date === today);
  const todayEvents = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const nextMeeting = useMemo(() => {
    const now = new Date().toTimeString().slice(0, 5);
    return todayEvents.find((event) => event.time >= now) ?? todayEvents[0];
  }, [todayEvents]);

  const toggleTask = async (task: Task) => {
    try { await updateTask(task.id, { completed: !task.completed }); setTasks(getTasks()); } catch { /* dashboard action is non-blocking */ }
  };

  return (
    <section className="mobile-home-details">
      <div className="mobile-home-details__meeting">
        <div className="mobile-home-details__meeting-icon"><CalendarDays size={21} /></div>
        <div className="mobile-home-details__meeting-copy">
          <span className="mobile-home-details__eyebrow">KEYINGI UCHRASHUV</span>
          <strong>{nextMeeting?.title ?? "Bugun uchrashuv yo‘q"}</strong>
          <span>{nextMeeting ? `Bugun, ${nextMeeting.time} · ${nextMeeting.participant ?? "Yechim jamoasi"}` : "Bo‘sh kuningizdan zavqlaning"}</span>
          {nextMeeting?.location && <small><MapPin size={12} />{nextMeeting.location}</small>}
        </div>
        <span className="mobile-home-details__meeting-badge">{nextMeeting?.time ?? "—"}</span>
      </div>

      <div className="mobile-home-details__tasks-header">
        <div><span className="mobile-home-details__eyebrow">BUGUN</span><h2>Bugungi vazifalar</h2></div>
        <button type="button" onClick={() => navigate("/tasks")}>Barchasini ko‘rish</button>
      </div>

      <div className="mobile-home-details__tasks">
        {todayTasks.slice(0, 4).map((task) => (
          <article className={`mobile-task-row ${task.completed ? "is-completed" : ""}`} key={task.id}>
            <button type="button" className="mobile-task-row__check" onClick={() => toggleTask(task)} aria-label={`${task.title} holatini o‘zgartirish`}>
              {task.completed && <Check size={14} />}
            </button>
            <button type="button" className="mobile-task-row__body" onClick={() => navigate("/tasks")}>
              <strong>{task.title}</strong>
              <span className={`mobile-task-row__priority mobile-task-row__priority--${task.priority === "Muhim" ? "high" : task.priority === "O‘rta" ? "medium" : "low"}`}><i />{priorityLabel(task.priority)}</span>
            </button>
            <span className="mobile-task-row__time"><Clock3 size={13} />{task.time}</span>
            <button type="button" className="mobile-task-row__more" onClick={() => navigate("/tasks")} aria-label="Vazifa amallari"><MoreHorizontal size={18} /></button>
          </article>
        ))}
        {!todayTasks.length && <div className="mobile-home-details__empty"><Sparkles size={18} />Bugun uchun vazifalar yo‘q.</div>}
      </div>
    </section>
  );
};

export default MobileHomeDetails;
