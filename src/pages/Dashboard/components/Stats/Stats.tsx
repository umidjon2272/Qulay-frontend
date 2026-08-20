import { ArrowUpRight, Bell, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDateKey } from "../../../../services/dateUtils";
import { getCalendarEvents } from "../../../../services/meetingService";
import { getReminders } from "../../../../services/reminderService";
import { getTasks } from "../../../../services/taskService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import "./Stats.scss";

const Stats = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(getTasks);
  const [reminders, setReminders] = useState(getReminders);
  const [events, setEvents] = useState(getCalendarEvents);

  useEffect(() => subscribeToWorkspaceData(["tasks", "reminders", "calendarEvents"], () => {
    setTasks(getTasks());
    setReminders(getReminders());
    setEvents(getCalendarEvents());
  }), []);

  const today = getDateKey();
  const todayTasks = tasks.filter((task) => !task.date || task.date === today);
  const completed = todayTasks.filter((task) => task.completed).length;
  const todayEvents = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const activeReminders = reminders.filter((reminder) => !reminder.completed);
  const nextMeeting = useMemo(() => todayEvents.find((event) => event.time >= new Date().toTimeString().slice(0, 5)) ?? todayEvents[0], [todayEvents]);

  const stats = [
    { title: "Bugungi vazifalar", value: String(todayTasks.length), subtitle: `${completed} ta bajarildi`, progress: todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0, trend: `${completed}/${todayTasks.length}`, icon: CheckCircle2, route: "/tasks" },
    { title: "Uchrashuvlar", value: String(todayEvents.length), subtitle: "Bugun rejalashtirilgan", progress: todayEvents.length ? 100 : 0, trend: nextMeeting?.time ?? "—", icon: CalendarDays, route: "/calendar" },
    { title: "Keyingi uchrashuv", value: nextMeeting?.time ?? "—", subtitle: nextMeeting?.title ?? "Bugun uchun uchrashuv yo‘q", progress: nextMeeting ? 100 : 0, trend: nextMeeting ? "Bugun" : "Bo‘sh", icon: Clock3, route: "/calendar" },
    { title: "Aktiv eslatmalar", value: String(activeReminders.length), subtitle: "Bajarilmagan eslatmalar", progress: activeReminders.length ? 100 : 0, trend: activeReminders[0]?.time ?? "—", icon: Bell, route: "/reminders" },
  ];

  return (
    <section className="stats">
      <div className="stats__header"><div className="stats__heading"><h2>Bugun</h2><span>Bugungi ishlaringiz va natijalaringiz</span></div><button type="button" className="stats__view" onClick={() => navigate("/tasks")}>Batafsil<ArrowUpRight size={14} /></button></div>
      <div className="stats__grid">{stats.map((stat) => { const Icon = stat.icon; return <button type="button" className="stats__card" key={stat.title} onClick={() => navigate(stat.route)}><div className="stats__card-top"><div className="stats__icon"><Icon size={16} /></div><span className="stats__trend">{stat.trend}</span></div><div className="stats__value">{stat.value}</div><h3>{stat.title}</h3><p>{stat.subtitle}</p><div className="stats__progress"><div className="stats__progress-value" style={{ width: `${stat.progress}%` }} /></div></button>; })}</div>
    </section>
  );
};

export default Stats;
