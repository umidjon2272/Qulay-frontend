import { Bell, CalendarDays, CheckCircle2, ListTodo, NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCalendarEvents, loadCalendarEvents } from "../../../../services/meetingService";
import { getNotes, loadNotes } from "../../../../services/noteService";
import { getReminders, loadReminders } from "../../../../services/reminderService";
import { getTasks, loadTasks } from "../../../../services/taskService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import { useI18n } from "../../../../i18n/useI18n";
import "./RecentActivity.scss";

type Activity = { id: string; title: string; meta: string; icon: typeof ListTodo };

const RecentActivity = () => {
  const { t } = useI18n();
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeToWorkspaceData(["tasks", "reminders", "calendarEvents", "notes"], () => setVersion((value) => value + 1)), []);
  useEffect(() => { void Promise.all([loadTasks(), loadReminders(), loadCalendarEvents(), loadNotes()]).catch(() => undefined); }, []);

  const activities = useMemo<Activity[]>(() => {
    void version;
    const tasks = getTasks().slice(0, 2).map((task) => ({ id: `task-${task.id}`, title: task.title, meta: task.completed ? "Vazifa · Bajarildi" : "Vazifa · Faol", icon: task.completed ? CheckCircle2 : ListTodo }));
    const reminders = getReminders().slice(0, 2).map((reminder) => ({ id: `reminder-${reminder.id}`, title: reminder.title, meta: `Eslatma · ${reminder.time}`, icon: Bell }));
    const meetings = getCalendarEvents().slice(0, 2).map((meeting) => ({ id: `meeting-${meeting.id}`, title: meeting.title, meta: `Uchrashuv · ${meeting.time}`, icon: CalendarDays }));
    const notes = getNotes().slice(0, 2).map((note) => ({ id: `note-${note.id}`, title: note.title, meta: "Qayd · Saqlandi", icon: NotebookPen }));
    return [...tasks, ...reminders, ...meetings, ...notes].slice(0, 6);
  }, [version]);

  return (
    <section className="recent-activity">
      <div className="recent-activity__header"><div><h2>{t("dashboard.activity.title", "So'nggi faoliyat")}</h2><p>{t("dashboard.activity.description", "Workspace ma'lumotlaridagi oxirgi yozuvlar")}</p></div></div>
      {activities.length ? <div className="recent-activity__list">{activities.map((item) => { const Icon = item.icon; return <div className="recent-activity__item" key={item.id}><span className="recent-activity__icon"><Icon size={15} /></span><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>; })}</div> : <div className="recent-activity__empty">{t("dashboard.activity.empty", "Hali faoliyat mavjud emas.")}</div>}
    </section>
  );
};

export default RecentActivity;
