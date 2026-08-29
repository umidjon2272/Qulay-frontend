import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock3,
  Mic,
  NotebookPen,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { useProfile } from "../../../../hooks/useProfile";
import { getDateKey } from "../../../../services/dateUtils";
import { getCalendarEvents, loadCalendarEvents } from "../../../../services/meetingService";
import { getNotes, loadNotes } from "../../../../services/noteService";
import { getReminders, loadReminders } from "../../../../services/reminderService";
import { getTasks, loadTasks } from "../../../../services/taskService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import { financeApi, type FinanceSummary } from "../../../../services/api/financeApi";

import "./MobileDashboardHome.scss";

const quickActions = [
  { label: "Bugungi reja", hint: "Rejani ko'rish", icon: CalendarDays, route: "/calendar" },
  { label: "Vazifa yaratish", hint: "Yangi ish qo'shish", icon: CheckSquare, prompt: "Yangi vazifa yarat" },
  { label: "Eslatma qo'shish", hint: "Muhim narsani eslat", icon: Bell, prompt: "Yangi eslatma qo'sh" },
];

const formatRemaining = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diff >= 0 && diff < 60) return `${Math.max(diff, 1)} daqiqa qoldi`;
  return time;
};

const MobileDashboardHome = () => {
  const navigate = useNavigate();
  const { open: openAIChat, sendMessage } = useAIChat();
  const { name, avatar } = useProfile();
  const firstName = name.trim().split(/\s+/)[0] || "Do'stim";
  const [tasks, setTasks] = useState(getTasks);
  const [reminders, setReminders] = useState(getReminders);
  const [meetings, setMeetings] = useState(getCalendarEvents);
  const [notes, setNotes] = useState(getNotes);
  const [loading, setLoading] = useState(true);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);

  const refresh = () => {
    setTasks(getTasks());
    setReminders(getReminders());
    setMeetings(getCalendarEvents());
    setNotes(getNotes());
  };

  useEffect(() => subscribeToWorkspaceData(["tasks", "reminders", "calendarEvents", "notes"], refresh), []);

  useEffect(() => {
    let mounted = true;
    void Promise.all([loadTasks(), loadReminders(), loadCalendarEvents(), loadNotes()])
      .catch(() => undefined)
      .finally(() => {
        if (mounted) {
          refresh();
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    void financeApi.summary(from, new Date(now.getTime() + 60000).toISOString(), "UZS").then(setFinance).catch(() => undefined);
  }, []);

  const today = getDateKey();
  const todayTasks = useMemo(() => tasks.filter((task) => !task.date || task.date === today), [tasks, today]);
  const activeReminders = useMemo(() => reminders.filter((reminder) => !reminder.completed && (!reminder.dateKey || reminder.dateKey === today)), [reminders, today]);
  const todayMeetings = useMemo(() => meetings.filter((meeting) => meeting.date === today).sort((a, b) => a.time.localeCompare(b.time)), [meetings, today]);
  const nextMeeting = useMemo(() => {
    const now = new Date().toTimeString().slice(0, 5);
    return todayMeetings.find((meeting) => meeting.time >= now) ?? todayMeetings[0] ?? null;
  }, [todayMeetings]);
  const completedTasks = todayTasks.filter((task) => task.completed).length;
  const notificationCount = Math.min(activeReminders.length, 9);

  return (
    <section className="dashboard-mobile-home" aria-label="Qulay AI bosh sahifasi">
      <header className="dashboard-mobile-home__header">
        <button type="button" className="dashboard-mobile-home__brand" onClick={() => navigate("/dashboard")} aria-label="Bosh sahifa">
          <span className="dashboard-mobile-home__brand-mark"><Sparkles size={16} /></span>
          <strong>QULAY AI</strong>
        </button>
        <div className="dashboard-mobile-home__header-actions">
          <button type="button" className="dashboard-mobile-home__notification" onClick={() => navigate("/reminders")} aria-label="Bildirishnomalar">
            <Bell size={19} />
            {notificationCount > 0 && <span>{notificationCount}</span>}
          </button>
          <button type="button" className="dashboard-mobile-home__avatar" onClick={() => navigate("/settings?tab=profile")} aria-label="Profil">
            {avatar ? <img src={avatar} alt={`${firstName} avatari`} /> : firstName.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <section className="dashboard-mobile-home__greeting">
        <span>Xush kelibsiz,</span>
        <h1>{firstName} <span aria-hidden="true">👋</span></h1>
        <p>Bugungi kuningiz unumli bo'lsin ✨</p>
      </section>

      <section className="dashboard-mobile-home__hero">
        <div className="dashboard-mobile-home__hero-row">
          <span className="dashboard-mobile-home__hero-icon"><Sparkles size={18} /></span>
          <div className="dashboard-mobile-home__hero-copy">
            <div className="dashboard-mobile-home__eyebrow"><i /> AI YORDAMCHI <span>ONLAYN</span></div>
            <h2>AI bilan gaplashing</h2>
            <p>Savol bering yoki topshiriq ayting.</p>
          </div>
        </div>
        <button type="button" className="dashboard-mobile-home__hero-cta" onClick={() => navigate("/ai-assistant")}>
          <Mic size={15} />
          <span>AI bilan gaplashish</span>
          <ArrowUpRight size={15} />
        </button>
        <div className="dashboard-mobile-home__quick-actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button type="button" key={action.label} onClick={() => action.route ? navigate(action.route) : (openAIChat(), sendMessage(action.prompt ?? ""))}>
                <span><Icon size={16} /></span>
                <strong>{action.label}</strong>
                <small>{action.hint}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dashboard-mobile-home__section">
        <header className="dashboard-mobile-home__section-header">
          <h2>Bugun</h2>
          <button type="button" onClick={() => navigate("/tasks")}>Batafsil <ArrowUpRight size={14} /></button>
        </header>
        <div className="dashboard-mobile-home__stats">
          {[
            { label: "Vazifalar", value: todayTasks.length, hint: `${completedTasks} ta bajarildi`, icon: CheckSquare, route: "/tasks", tone: "purple" },
            { label: "Eslatmalar", value: activeReminders.length, hint: "Faol eslatmalar", icon: Bell, route: "/reminders", tone: "orange" },
            { label: "Uchrashuvlar", value: todayMeetings.length, hint: "Bugun rejalashtirilgan", icon: CalendarDays, route: "/calendar", tone: "blue" },
            { label: "Izohlar", value: notes.length, hint: "Saqlangan qaydlar", icon: NotebookPen, route: "/files", tone: "green" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <button type="button" className={`dashboard-mobile-home__stat dashboard-mobile-home__stat--${stat.tone}`} key={stat.label} onClick={() => navigate(stat.route)}>
                <span className="dashboard-mobile-home__stat-icon"><Icon size={17} /></span>
                <span className="dashboard-mobile-home__stat-copy"><strong>{stat.label}</strong><b className={loading ? "is-loading" : ""}>{loading ? "" : stat.value}</b><small>{stat.hint}</small></span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="dashboard-mobile-home__section">
        <header className="dashboard-mobile-home__section-header"><h2>Joriy oy moliyasi</h2><button type="button" onClick={() => navigate("/finance")}>Batafsil <ArrowUpRight size={14}/></button></header>
        <button type="button" className="dashboard-mobile-home__finance" onClick={() => navigate("/finance")}>
          <span className="dashboard-mobile-home__finance-icon"><WalletCards size={20}/></span>
          <span><small>Daromad</small><strong>{Number(finance?.totalIncome ?? 0).toLocaleString("uz-UZ")}</strong></span>
          <span><small>Xarajat</small><strong>{Number(finance?.totalExpense ?? 0).toLocaleString("uz-UZ")}</strong></span>
          <span><small>Sof foyda</small><strong>{Number(finance?.netProfit ?? 0).toLocaleString("uz-UZ")} so'm</strong></span>
          <ChevronRight size={17}/>
        </button>
      </section>

      <section className="dashboard-mobile-home__section dashboard-mobile-home__next">
        <header className="dashboard-mobile-home__section-header">
          <h2>Keyingi uchrashuv</h2>
          <button type="button" onClick={() => navigate("/calendar")}>Kalendar <ArrowUpRight size={14} /></button>
        </header>
        {nextMeeting ? (
          <button type="button" className="dashboard-mobile-home__meeting" onClick={() => navigate("/calendar")}>
            <span className="dashboard-mobile-home__meeting-icon"><CalendarDays size={19} /></span>
            <span className="dashboard-mobile-home__meeting-copy"><strong>{nextMeeting.title}</strong><small>{nextMeeting.time}{nextMeeting.participant ? ` · ${nextMeeting.participant}` : nextMeeting.location ? ` · ${nextMeeting.location}` : ""}</small></span>
            <span className="dashboard-mobile-home__meeting-badge"><Clock3 size={12} />{formatRemaining(nextMeeting.time)}</span>
          </button>
        ) : (
          <div className="dashboard-mobile-home__empty-meeting"><CalendarDays size={20} /><span>Bugun uchrashuv rejalashtirilmagan</span></div>
        )}
      </section>
    </section>
  );
};

export default MobileDashboardHome;
