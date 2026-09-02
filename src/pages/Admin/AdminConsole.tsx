import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, ArrowUpDown, BarChart3, Bell, Bot, Check, ChevronLeft, ChevronRight, CircleHelp, FileText, Globe2, HeartPulse, LayoutDashboard, LogOut, Menu, Moon, Search, Settings2, Shield, Sun, Users, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api/apiClient";
import { adminApi, type AdminActivity, type AdminConnectionCounts, type AdminFiles, type AdminIntegrations, type AdminNotifications, type AdminOverview, type AdminPlan, type AdminRange, type AdminSettingsSection, type AdminSystem, type AdminUsage, type AdminUser, type AdminUserDetail, type NormalizedAdminSettings } from "../../services/api/adminApi";
import { notifyPlatformNameChanged, usePlatform } from "../../context/PlatformContext";
import { getLocale, useI18n } from "../../i18n/useI18n";
import "./AdminConsole.scss";

type TFn = (key: string, fallback: string, params?: Record<string, string | number>) => string;

const adminIntlLocale = () => (getLocale() === "ru" ? "ru-RU" : "uz-UZ");

type NavItem = { label: string; path: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };
const getNavGroups = (t: TFn): NavGroup[] => [
  { label: t("admin.nav.group.control", "BOSHQARUV"), items: [
    { label: t("admin.nav.overview", "Umumiy ko'rinish"), path: "/admin", icon: LayoutDashboard, exact: true },
    { label: t("admin.nav.users", "Foydalanuvchilar"), path: "/admin/users", icon: Users },
    { label: t("admin.nav.usage", "Foydalanish"), path: "/admin/usage", icon: BarChart3 },
  ] },
  { label: t("admin.nav.group.system", "TIZIM"), items: [
    { label: t("admin.nav.integrations", "Integratsiyalar"), path: "/admin/integrations", icon: Globe2 },
    { label: t("admin.nav.notifications", "Bildirishnomalar"), path: "/admin/notifications", icon: Bell },
    { label: t("admin.nav.files", "Fayllar"), path: "/admin/files", icon: FileText },
    { label: t("admin.nav.activity", "Faoliyat jurnali"), path: "/admin/activity", icon: Activity },
    { label: t("admin.nav.system", "Tizim holati"), path: "/admin/system", icon: HeartPulse },
  ] },
  { label: t("admin.nav.group.setup", "SOZLASH"), items: [
    { label: t("admin.nav.settings", "Sozlamalar"), path: "/admin/settings", icon: Settings2 },
  ] },
];
const rangeOptions: AdminRange[] = [7, 30, 90];

const roleLabels = (t: TFn): Record<string, string> => ({ ADMIN: t("admin.role.admin", "Administrator"), USER: t("admin.role.user", "Foydalanuvchi") });
const statusLabels = (t: TFn): Record<string, string> => ({ ACTIVE: t("admin.status.active", "Faol"), BLOCKED: t("admin.status.blocked", "Bloklangan") });
const connectionLabels = (t: TFn): Record<string, string> => ({ connected: t("admin.connection.connected", "Ulangan"), disconnected: t("admin.connection.disconnected", "Ulanmagan"), error: t("admin.connection.error", "Xato") });
const notificationTotalLabels = (t: TFn): Record<string, string> => ({ total: t("admin.notif.total", "Jami"), pending: t("admin.notif.pending", "Kutilmoqda"), sent: t("admin.notif.sent", "Yuborildi"), failed: t("admin.notif.failed", "Xato"), read: t("admin.notif.read", "O'qildi") });
const sourceLabels = (t: TFn): Record<string, string> => ({ upload: t("admin.source.upload", "Yuklangan"), google_drive: t("admin.source.googleDrive", "Google Drive"), telegram: t("admin.source.telegram", "Telegram"), system: t("admin.source.system", "Tizim") });
const storageProviderLabels = (t: TFn): Record<string, string> => ({ LOCAL: t("admin.storage.local", "Lokal disk"), S3: t("admin.storage.s3", "Amazon S3") });
const healthLabels = (t: TFn): Record<string, string> => ({ ok: t("admin.health.ok", "Ishlayapti"), running: t("admin.health.running", "Ishlayapti"), unreachable: t("admin.health.unreachable", "Ulanmagan"), stopped: t("admin.health.stopped", "To'xtagan") });
const envLabels = (t: TFn): Record<string, string> => ({ production: t("admin.env.production", "Ishlab chiqarish"), development: t("admin.env.development", "Test muhiti"), test: t("admin.env.test", "Sinov muhiti") });
const actionLabels = (t: TFn): Record<string, string> => ({
  TASK_CREATED: t("admin.action.taskCreated", "Vazifa yaratildi"), TASK_COMPLETED: t("admin.action.taskCompleted", "Vazifa bajarildi"), REMINDER_CREATED: t("admin.action.reminderCreated", "Eslatma yaratildi"), MEETING_CREATED: t("admin.action.meetingCreated", "Uchrashuv yaratildi"),
  NOTE_CREATED: t("admin.action.noteCreated", "Izoh yaratildi"), CONTACT_CREATED: t("admin.action.contactCreated", "Kontakt yaratildi"), CONTACT_UPDATED: t("admin.action.contactUpdated", "Kontakt yangilandi"), CONTACT_DELETED: t("admin.action.contactDeleted", "Kontakt o'chirildi"),
  MEMORY_CREATED: t("admin.action.memoryCreated", "Xotira yaratildi"), MEMORY_UPDATED: t("admin.action.memoryUpdated", "Xotira yangilandi"), MEMORY_DELETED: t("admin.action.memoryDeleted", "Xotira o'chirildi"),
  FINANCE_TRANSACTION_CREATED: t("admin.action.financeTxCreated", "Moliyaviy yozuv yaratildi"), FINANCE_TRANSACTION_UPDATED: t("admin.action.financeTxUpdated", "Moliyaviy yozuv yangilandi"), FINANCE_TRANSACTION_DELETED: t("admin.action.financeTxDeleted", "Moliyaviy yozuv o'chirildi"),
  FINANCE_CATEGORY_CREATED: t("admin.action.financeCatCreated", "Moliya toifasi yaratildi"), FINANCE_CATEGORY_UPDATED: t("admin.action.financeCatUpdated", "Moliya toifasi yangilandi"), FINANCE_CATEGORY_DELETED: t("admin.action.financeCatDeleted", "Moliya toifasi o'chirildi"),
  AI_TOOL_EXECUTED: t("admin.action.aiToolExecuted", "AI vositasi ishlatildi"), TELEGRAM_CONNECTED: t("admin.action.telegramConnected", "Telegram ulandi"), TELEGRAM_DISCONNECTED: t("admin.action.telegramDisconnected", "Telegram uzildi"), TELEGRAM_MESSAGE_SENT: t("admin.action.telegramMessageSent", "Telegram xabari yuborildi"),
  NOTIFICATION_SENT: t("admin.action.notificationSent", "Bildirishnoma yuborildi"), NOTIFICATION_FAILED: t("admin.action.notificationFailed", "Bildirishnoma yuborilmadi"), GOOGLE_CONNECTED: t("admin.action.googleConnected", "Google ulandi"), GOOGLE_DISCONNECTED: t("admin.action.googleDisconnected", "Google uzildi"),
  GOOGLE_CALENDAR_EVENT_CREATED: t("admin.action.gcalCreated", "Google kalendar tadbiri yaratildi"), GOOGLE_CALENDAR_EVENT_UPDATED: t("admin.action.gcalUpdated", "Google kalendar tadbiri yangilandi"), GOOGLE_CALENDAR_EVENT_DELETED: t("admin.action.gcalDeleted", "Google kalendar tadbiri o'chirildi"),
  FILE_UPLOADED: t("admin.action.fileUploaded", "Fayl yuklandi"), FILE_DELETED: t("admin.action.fileDeleted", "Fayl o'chirildi"), PASSWORD_RESET_REQUESTED: t("admin.action.pwResetRequested", "Parolni tiklash so'raldi"), PASSWORD_RESET_COMPLETED: t("admin.action.pwResetCompleted", "Parol tiklandi"),
  LOGIN_FAILED: t("admin.action.loginFailed", "Kirish muvaffaqiyatsiz"), LOGIN_SUCCEEDED: t("admin.action.loginSucceeded", "Tizimga kirildi"), LOGIN_BLOCKED: t("admin.action.loginBlocked", "Kirish bloklandi"), REGISTERED: t("admin.action.registered", "Ro'yxatdan o'tildi"),
  REGISTER_FAILED: t("admin.action.registerFailed", "Ro'yxatdan o'tish muvaffaqiyatsiz"), REFRESH_SUCCEEDED: t("admin.action.refreshSucceeded", "Sessiya yangilandi"), LOGOUT_COMPLETED: t("admin.action.logoutCompleted", "Tizimdan chiqildi"), PASSWORD_CHANGED: t("admin.action.passwordChanged", "Parol o'zgartirildi"),
  FOLDER_CREATED: t("admin.action.folderCreated", "Papka yaratildi"), FOLDER_UPDATED: t("admin.action.folderUpdated", "Papka yangilandi"), FOLDER_DELETED: t("admin.action.folderDeleted", "Papka o'chirildi"),
  ADMIN_USER_BLOCKED: t("admin.action.userBlocked", "Foydalanuvchi bloklandi"), ADMIN_USER_UNBLOCKED: t("admin.action.userUnblocked", "Foydalanuvchi blokdan chiqarildi"), ADMIN_ROLE_CHANGED: t("admin.action.roleChanged", "Rol o'zgartirildi"),
});
const entityLabels = (t: TFn): Record<string, string> => ({ USER: t("admin.entity.user", "Foydalanuvchi"), TASK: t("admin.entity.task", "Vazifa"), REMINDER: t("admin.entity.reminder", "Eslatma"), MEETING: t("admin.entity.meeting", "Uchrashuv"), NOTE: t("admin.entity.note", "Izoh"), CONTACT: t("admin.entity.contact", "Kontakt"), FILE: t("admin.entity.file", "Fayl"), NOTIFICATION: t("admin.entity.notification", "Bildirishnoma"), AUTH: t("admin.entity.auth", "Autentifikatsiya"), MEMORY: t("admin.entity.memory", "Xotira"), FOLDER: t("admin.entity.folder", "Papka") });
const actionLabel = (t: TFn, action: string) => actionLabels(t)[action] ?? action.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
const entityLabel = (t: TFn, type?: string) => (type ? entityLabels(t)[type] ?? type : "");

const formatNumber = (value: number | undefined) => new Intl.NumberFormat(adminIntlLocale()).format(value ?? 0);
const formatDate = (t: TFn, value?: string | null) => value ? new Intl.DateTimeFormat(adminIntlLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : t("admin.noActivityYet", "Hali faollik yo'q");
const formatBytes = (value: number | undefined) => { const bytes = value ?? 0; if (bytes < 1024) return `${bytes} B`; const units = ["KB", "MB", "GB", "TB"]; let size = bytes / 1024; let i = 0; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`; };
const formatUptime = (t: TFn, totalSeconds: number | undefined) => { const seconds = totalSeconds ?? 0; const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60); if (days > 0) return t("admin.uptime.daysHours", "{days} kun {hours} soat", { days, hours }); if (hours > 0) return t("admin.uptime.hoursMinutes", "{hours} soat {minutes} daqiqa", { hours, minutes }); return t("admin.uptime.minutes", "{minutes} daqiqa", { minutes }); };
const initials = (user: { firstName?: string; lastName?: string; email?: string }) => `${user.firstName?.[0] ?? user.email?.[0] ?? "Q"}${user.lastName?.[0] ?? ""}`.toUpperCase();

const EmptyState = ({ title, text }: { title: string; text?: string }) => { const { t } = useI18n(); return <div className="admin-empty"><div className="admin-empty__icon"><CircleHelp size={20} /></div><strong>{title}</strong><span>{text ?? t("admin.noDataForPeriod", "Tanlangan davr uchun real ma'lumot mavjud emas.")}</span></div>; };
const ErrorState = ({ error, retry }: { error: string; retry: () => void }) => { const { t } = useI18n(); return <div className="admin-error"><strong>{t("admin.loadFailed", "Ma'lumotni yuklab bo'lmadi")}</strong><span>{error}</span><button type="button" onClick={retry}>{t("common.retry", "Qayta urinish")}</button></div>; };
const Loading = () => <div className="admin-loading"><span /><span /><span /></div>;

type ConfirmState = { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary"; onConfirm: () => void } | null;
const ConfirmDialog = ({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) => {
  const { t } = useI18n();
  if (!state) return null;
  return <div className="admin-modal-overlay" role="presentation" onClick={onCancel}>
    <div className="admin-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <h3>{state.title}</h3>
      <p>{state.description}</p>
      <div className="admin-modal__actions">
        <button type="button" className="admin-button admin-button--ghost" onClick={onCancel}>{t("common.cancel", "Bekor qilish")}</button>
        <button type="button" className={`admin-button ${state.tone === "danger" ? "admin-button--danger" : ""}`} onClick={() => { state.onConfirm(); onCancel(); }}>{state.confirmLabel}</button>
      </div>
    </div>
  </div>;
};

const TrendChart = ({ data, label }: { data: Array<{ date: string; count: number }>; label: string }) => {
  const { t } = useI18n();
  if (!data.length) return <EmptyState title={t("admin.noDynamicsForPeriod", "Bu davr uchun dinamika yo'q")} />;
  const max = Math.max(...data.map((item) => item.count), 1);
  return <div className="admin-chart" aria-label={label}>
    <div className="admin-chart__bars">{data.map((item) => <div className="admin-chart__bar-wrap" key={item.date} title={`${item.date}: ${item.count}`}><div className="admin-chart__bar" style={{ height: `${Math.max(4, item.count / max * 100)}%` }} /><small>{new Date(item.date).toLocaleDateString(adminIntlLocale(), { month: "short", day: "numeric" })}</small></div>)}</div>
  </div>;
};

const KpiCard = ({ label, value, icon: Icon, accent = "violet" }: { label: string; value: number | string | undefined; icon: LucideIcon; accent?: string }) => { const { t } = useI18n(); return <div className={`admin-kpi admin-kpi--${accent}`}><div className="admin-kpi__top"><span>{label}</span><Icon size={17} /></div><strong>{typeof value === "number" ? formatNumber(value) : value ?? "0"}</strong><small>{t("admin.realMetricFromDb", "Baza asosidagi real ko'rsatkich")}</small></div>; };

const AdminOverviewPage = () => {
  const { t } = useI18n();
  const [range, setRange] = useState<AdminRange>(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setError(null); void adminApi.overview(range).then(setData).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [range]);
  const kpis = data?.kpis ?? {};
  const activity = data?.activityOverview ?? {};
  const activityItems: Array<[string, string]> = [
    [t("admin.item.tasks", "Vazifalar"), "tasks"], [t("admin.item.reminders", "Eslatmalar"), "reminders"], [t("admin.item.meetings", "Uchrashuvlar"), "meetings"],
    [t("admin.item.notes", "Izohlar"), "notes"], [t("admin.item.contacts", "Kontaktlar"), "contacts"], [t("admin.item.financeTransactions", "Moliyaviy yozuvlar"), "financeTransactions"], [t("admin.item.filesUploaded", "Yuklangan fayllar"), "filesUploaded"],
  ];
  return <div className="admin-page admin-fade-in">
    <PageHeader eyebrow={t("admin.overview.eyebrow", "PLATFORMA STATISTIKASI")} title={t("admin.overview.title", "Xayrli kun, administrator")} description={t("admin.overview.description", "Qulay AI platformasining real vaqtdagi operatsion ko'rinishi.")}><RangeSelector value={range} onChange={setRange} /></PageHeader>
    {error ? <ErrorState error={error} retry={load} /> : loading && !data ? <Loading /> : <>
      <div className="admin-kpi-grid">
        <KpiCard label={t("admin.kpi.totalUsers", "Jami foydalanuvchilar")} value={kpis.users} icon={Users} /><KpiCard label={t("admin.kpi.activeUsers", "Faol foydalanuvchilar")} value={kpis.activeUsers} icon={Zap} accent="blue" /><KpiCard label={t("admin.kpi.joinedToday", "Bugun qo'shilganlar")} value={kpis.registeredToday} icon={Activity} accent="green" /><KpiCard label={t("admin.kpi.joinedThisMonth", "Shu oy qo'shilganlar")} value={kpis.registeredThisMonth} icon={BarChart3} /><KpiCard label={t("admin.kpi.blocked", "Bloklanganlar")} value={kpis.blockedUsers} icon={Shield} accent="red" /><KpiCard label={t("admin.kpi.totalAiRequests", "Jami AI so'rovlar")} value={kpis.aiUsageRequests} icon={Bot} accent="blue" /><KpiCard label={t("admin.kpi.totalFiles", "Jami fayllar")} value={kpis.files} icon={FileText} accent="green" /><KpiCard label={t("admin.kpi.totalNotifications", "Jami bildirishnomalar")} value={kpis.notifications} icon={Bell} />
      </div>
      <div className="admin-grid admin-grid--charts"><section className="admin-card"><CardHeading title={t("admin.chart.userGrowth", "Foydalanuvchilar o'sishi")} detail={t("admin.lastNDays", "Oxirgi {range} kun", { range })} /><TrendChart data={data?.userGrowth ?? []} label={t("admin.chart.userGrowth", "Foydalanuvchilar o'sishi")} /></section><section className="admin-card"><CardHeading title={t("admin.chart.activityTrend", "Faollik dinamikasi")} detail={t("admin.lastNDays", "Oxirgi {range} kun", { range })} /><TrendChart data={data?.activityTrend ?? []} label={t("admin.chart.activityTrend", "Faollik dinamikasi")} /></section></div>
      <section className="admin-card"><CardHeading title={t("admin.activityOverview.title", "Faoliyat ko'rinishi")} detail={t("admin.activityOverview.detail", "Tanlangan davrda yaratilgan obyektlar")} /><div className="admin-activity-grid">{activityItems.map(([name, key]) => <div className="admin-activity-stat" key={key}><span>{name}</span><strong>{formatNumber(activity[key])}</strong></div>)}</div></section>
      <div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title={t("admin.connectionsSection.title", "Ulanishlar")} detail={t("admin.connectionsSection.detail", "Faqat umumiy statistika")} /><div className="admin-mini-list"><MiniMetric icon={<Zap size={16} />} label={t("admin.mini.telegramConnected", "Telegram ulangan")} value={kpis.telegramConnectedUsers} /><MiniMetric icon={<Globe2 size={16} />} label={t("admin.mini.googleConnected", "Google ulangan")} value={kpis.googleConnectedUsers} /><MiniMetric icon={<Bell size={16} />} label={t("admin.mini.activeReminders", "Faol eslatmalar")} value={kpis.activeReminders} /><MiniMetric icon={<Activity size={16} />} label={t("admin.mini.upcomingMeetings", "Yaqin uchrashuvlar")} value={kpis.upcomingMeetings} /></div></section><section className="admin-card admin-card--accent"><div className="admin-card__eyebrow">{t("admin.operations.eyebrow", "OPERATSIYALAR")}</div><h3>{t("admin.operations.title", "Platformani shaffof va nazorat ostida tuting.")}</h3><p>{t("admin.operations.body", "Auditlar uchun faoliyat jurnalidan, kirishni boshqarish uchun foydalanuvchi amallaridan va kelajakdagi hisob-kitob tayyorgarligi uchun foydalanish ma'lumotlaridan foydalaning.")}</p><Link className="admin-button admin-button--ghost" to="/admin/activity">{t("admin.operations.openActivity", "Faoliyat jurnalini ochish")} <ArrowLeft size={15} className="admin-flip" /></Link></section></div>
    </>}
  </div>;
};

const PageHeader = ({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) => <header className="admin-page-header"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</header>;
const CardHeading = ({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) => <div className="admin-card-heading"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{children}</div>;
const RangeSelector = ({ value, onChange }: { value: AdminRange; onChange: (value: AdminRange) => void }) => { const { t } = useI18n(); return <div className="admin-segmented">{rangeOptions.map((option) => <button type="button" className={value === option ? "is-active" : ""} onClick={() => onChange(option)} key={option}>{t("admin.rangeDays", "{count} kun", { count: option })}</button>)}</div>; };
const MiniMetric = ({ icon, label, value }: { icon: ReactNode; label: string; value: number | undefined }) => <div className="admin-mini-metric"><span className="admin-mini-metric__icon">{icon}</span><span>{label}</span><strong>{formatNumber(value)}</strong></div>;

const UsersPage = () => {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminPageState<AdminUser> | null>(null); const [page, setPage] = useState(1); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [role, setRole] = useState(""); const [sort, setSort] = useState<"createdAt" | "lastActivity">("createdAt"); const [order, setOrder] = useState<"asc" | "desc">("desc"); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = () => { setLoading(true); setError(null); void adminApi.users({ page, search, status, role, sort, order }).then(setUsers).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [page, search, status, role, sort, order]);
  const thUser = t("admin.th.user", "Foydalanuvchi"); const thEmail = t("admin.th.email", "Email"); const thRole = t("admin.th.role", "Rol"); const thStatus = t("admin.th.status", "Holat"); const thRegistered = t("admin.th.registered", "Ro'yxatdan o'tgan"); const thLastActivity = t("admin.th.lastActivity", "Oxirgi faollik"); const thIntegrations = t("admin.th.integrations", "Integratsiyalar");
  return <div className="admin-page admin-fade-in"><PageHeader eyebrow={t("admin.users.eyebrow", "KATALOG")} title={t("admin.nav.users", "Foydalanuvchilar")} description={t("admin.users.description", "Platforma kirish huquqlarini, rollarni va foydalanuvchi faolligini boshqaring.")} /><section className="admin-card">
    <div className="admin-toolbar">
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput); }}><Search size={17} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("admin.users.searchPlaceholder", "Ism yoki email bo'yicha qidirish")} /></form>
      <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}><option value="">{t("admin.filter.allRoles", "Barcha rollar")}</option><option value="USER">{t("admin.role.user", "Foydalanuvchi")}</option><option value="ADMIN">{t("admin.role.admin", "Administrator")}</option></select>
      <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">{t("admin.filter.allStatuses", "Barcha holatlar")}</option><option value="ACTIVE">{t("admin.status.active", "Faol")}</option><option value="BLOCKED">{t("admin.status.blocked", "Bloklangan")}</option></select>
      <select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as "createdAt" | "lastActivity"); }}><option value="createdAt">{t("admin.sort.createdAt", "Ro'yxatdan o'tgan sana")}</option><option value="lastActivity">{t("admin.sort.lastActivity", "Oxirgi faollik")}</option></select>
      <button type="button" className="admin-sort-toggle" onClick={() => setOrder((value) => value === "asc" ? "desc" : "asc")} aria-label={t("admin.sort.toggleAria", "Tartibni almashtirish")} title={order === "asc" ? t("admin.sort.asc", "O'sish tartibida") : t("admin.sort.desc", "Kamayish tartibida")}><ArrowUpDown size={15} /></button>
    </div>
    {error ? <ErrorState error={error} retry={load} /> : loading && !users ? <Loading /> : <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{thUser}</th><th>{thEmail}</th><th>{thRole}</th><th>{thStatus}</th><th>{thRegistered}</th><th>{thLastActivity}</th><th>{thIntegrations}</th><th /></tr></thead><tbody>{users?.items.map((user) => <tr key={user.id}>
      <td data-label={thUser}><Link className="admin-user-cell" to={`/admin/users/${user.id}`}><span className="admin-avatar">{initials(user)}</span><strong>{user.firstName} {user.lastName}</strong></Link></td>
      <td data-label={thEmail}>{user.email}</td>
      <td data-label={thRole}><span className={`admin-pill admin-pill--${user.role.toLowerCase()}`}>{roleLabels(t)[user.role] ?? user.role}</span></td>
      <td data-label={thStatus}><span className={`admin-status admin-status--${user.status.toLowerCase()}`}><i />{statusLabels(t)[user.status] ?? user.status}</span></td>
      <td data-label={thRegistered}>{formatDate(t, user.createdAt)}</td>
      <td data-label={thLastActivity}>{formatDate(t, user.lastActivity)}</td>
      <td data-label={thIntegrations}><span className="admin-integrations">{user.integrations?.telegram && "TG"}{user.integrations?.google && "G"}{!user.integrations?.telegram && !user.integrations?.google && "—"}</span></td>
      <td data-label=""><Link className="admin-table-link" to={`/admin/users/${user.id}`}>{t("admin.viewDetails", "Batafsil")}</Link></td>
    </tr>)}</tbody></table></div>{!users?.items.length && <EmptyState title={t("admin.users.emptyTitle", "Hech qanday foydalanuvchi topilmadi")} text={t("admin.users.emptyHint", "Boshqa ism, email, rol yoki holatni tanlab ko'ring.")} />}<Pagination meta={users?.meta} page={page} onPage={setPage} /></>}
  </section></div>;
};
type AdminPageState<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

const UserDetailPage = ({ id }: { id: string }) => {
  const { t } = useI18n();
  const navigate = useNavigate(); const [user, setUser] = useState<AdminUserDetail | null>(null); const [plans,setPlans]=useState<AdminPlan[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState<ConfirmState>(null);
  const load = () => { setLoading(true); setError(null); void adminApi.user(id).then(setUser).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [id]); useEffect(()=>{void adminApi.plans().then(setPlans).catch(()=>undefined)},[]);
  const askStatus = (status: "ACTIVE" | "BLOCKED") => { if (!user) return; setConfirm({ title: status === "BLOCKED" ? t("admin.confirmBlock.title", "Foydalanuvchini bloklash") : t("admin.confirmUnblock.title", "Blokdan chiqarish"), description: status === "BLOCKED" ? t("admin.confirmBlock.description", "{email} bloklansinmi?", { email: user.email }) : t("admin.confirmUnblock.description", "{email} blokdan chiqarilsinmi?", { email: user.email }), confirmLabel: status === "BLOCKED" ? t("admin.block", "Bloklash") : t("admin.unblock", "Blokdan chiqarish"), tone: status === "BLOCKED" ? "danger" : "primary", onConfirm: () => { setSaving(true); void adminApi.status(id, status).then(load).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setSaving(false)); } }); };
  const askRole = (role: "USER" | "ADMIN") => { if (!user || role === user.role) return; setConfirm({ title: t("admin.changeRole.title", "Rolni o'zgartirish"), description: t("admin.changeRole.description", "Ushbu foydalanuvchining roli \"{role}\" ga o'zgartirilsinmi?", { role: roleLabels(t)[role] }), confirmLabel: t("admin.changeAction", "O'zgartirish"), tone: "primary", onConfirm: () => { setSaving(true); void adminApi.role(id, role).then(load).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setSaving(false)); } }); };
  if (loading && !user) return <div className="admin-page"><Loading /></div>; if (error && !user) return <div className="admin-page"><ErrorState error={error} retry={load} /></div>; if (!user) return null;
  return <div className="admin-page admin-fade-in">
    <button type="button" className="admin-back" onClick={() => navigate("/admin/users")}><ChevronLeft size={16} /> {t("admin.backToUsers", "Foydalanuvchilarga qaytish")}</button>
    <PageHeader eyebrow={t("admin.userDetail.eyebrow", "FOYDALANUVCHI TAFSILOTI")} title={`${user.firstName} ${user.lastName}`} description={user.email} />
    <div className="admin-detail-grid">
      <section className="admin-card admin-profile"><span className="admin-card__eyebrow">{t("admin.profile.eyebrow", "PROFIL")}</span><div className="admin-profile__top"><span className="admin-avatar admin-avatar--large">{initials(user)}</span><div><h2>{user.firstName} {user.lastName}</h2><span>{user.email}</span></div></div><DetailRow label={t("admin.th.role", "Rol")}><span className={`admin-pill admin-pill--${user.role.toLowerCase()}`}>{roleLabels(t)[user.role] ?? user.role}</span></DetailRow><DetailRow label={t("admin.th.status", "Holat")}><span className={`admin-status admin-status--${user.status.toLowerCase()}`}><i />{statusLabels(t)[user.status] ?? user.status}</span></DetailRow><DetailRow label={t("admin.th.registered", "Ro'yxatdan o'tgan")}>{formatDate(t, user.createdAt)}</DetailRow><DetailRow label={t("admin.th.lastActivity", "Oxirgi faollik")}>{formatDate(t, user.lastActivity)}</DetailRow></section>
      <section className="admin-card"><span className="admin-card__eyebrow">{t("admin.usageSection.eyebrow", "FOYDALANISH")}</span><CardHeading title={t("admin.usageSection.title", "Foydalanish ko'rinishi")} detail={t("admin.usageSection.detail", "Ushbu foydalanuvchi uchun barcha vaqt bo'yicha hisob")} /><div className="admin-detail-stats">{[[t("admin.item.tasks", "Vazifalar"), "tasks"], [t("admin.item.reminders", "Eslatmalar"), "reminders"], [t("admin.item.meetings", "Uchrashuvlar"), "meetings"], [t("admin.item.notes", "Izohlar"), "notes"], [t("admin.item.contacts", "Kontaktlar"), "contacts"], [t("admin.item.financeTransactions", "Moliyaviy yozuvlar"), "financeTransactions"], [t("admin.item.files", "Fayllar"), "files"], [t("admin.item.aiRequests", "AI so'rovlari"), "aiRequests"]].map(([label, key]) => <div key={key}><span>{label}</span><strong>{formatNumber(user.usage[key])}</strong></div>)}</div></section>
    </div>
    <section className="admin-card admin-actions-card"><span className="admin-card__eyebrow">{t("admin.actionsCard.eyebrow", "ADMIN AMALLARI")}</span><CardHeading title={t("admin.actionsCard.title", "Kirish, rol va tarifni boshqarish")} detail={t("admin.actionsCard.detail", "O'zgarishlar real akkauntga qo'llanadi")} /><div className="admin-actions-row"><div className="admin-actions-row__field"><label>{t("admin.changeRole.label", "Rolni o'zgartirish")}</label><select className="admin-inline-select" value={user.role} disabled={saving} onChange={(event) => askRole(event.target.value as "USER" | "ADMIN")}><option value="USER">{t("admin.role.user", "Foydalanuvchi")}</option><option value="ADMIN">{t("admin.role.admin", "Administrator")}</option></select></div><div className="admin-actions-row__field"><label>{t('admin.plan.assign','Tarifni biriktirish')}</label><select className="admin-inline-select" value={user.subscription?.tier ?? 'STARTER'} disabled={saving} onChange={(event)=>{setSaving(true);void adminApi.assignSubscription(id,event.target.value as AdminPlan['tier']).then(load).catch((reason:unknown)=>setError(getApiErrorMessage(reason))).finally(()=>setSaving(false))}}>{plans.map((plan)=><option key={plan.tier} value={plan.tier}>{plan.name}</option>)}</select></div>{user.status === "BLOCKED" ? <button className="admin-button admin-button--success" disabled={saving} onClick={() => askStatus("ACTIVE")}><Check size={15} /> {t("admin.unblock", "Blokdan chiqarish")}</button> : <button className="admin-button admin-button--danger" disabled={saving} onClick={() => askStatus("BLOCKED")}><X size={15} /> {t("admin.block", "Bloklash")}</button>}</div></section>
    <div className="admin-detail-grid">
      <section className="admin-card"><span className="admin-card__eyebrow">{t("admin.nav.integrations", "INTEGRATSIYALAR")}</span><CardHeading title={t("admin.connectedServices.title", "Ulangan xizmatlar")} detail={t("admin.metadataOnly", "Faqat metama'lumot")} /><div className="admin-connection-row"><span>Telegram</span><b className={user.integrations.telegram.connected ? "is-connected" : ""}>{user.integrations.telegram.connected ? t("admin.connection.connected", "Ulangan") : connectionLabels(t)[user.integrations.telegram.status?.toLowerCase()] ?? connectionLabels(t).disconnected}</b></div><div className="admin-connection-row"><span>Google</span><b className={user.integrations.google.connected ? "is-connected" : ""}>{user.integrations.google.connected ? t("admin.connection.connected", "Ulangan") : connectionLabels(t)[user.integrations.google.status?.toLowerCase()] ?? connectionLabels(t).disconnected}</b></div></section>
      <section className="admin-card"><span className="admin-card__eyebrow">{t("admin.security.eyebrow", "XAVFSIZLIK")}</span><CardHeading title={t("admin.security.title", "Hisob xavfsizligi")} detail={t("admin.sensitiveHidden", "Nozik qiymatlar yashiringan")} /><div className="admin-connection-row"><span>{t("admin.th.status", "Holat")}</span><b className={user.status === "ACTIVE" ? "is-connected" : ""}>{statusLabels(t)[user.status] ?? user.status}</b></div><div className="admin-connection-row"><span>{t("admin.security.activeSessions", "Faol sessiyalar")}</span><b>{user.security.activeRefreshSessions}</b></div><div className="admin-connection-row"><span>{t("admin.security.resetRequests", "Parolni tiklash so'rovlari")}</span><b>{user.security.passwordResetRequests}</b></div></section>
    </div>
    <section className="admin-card"><span className="admin-card__eyebrow">{t("admin.nav.activity", "FAOLIYAT")}</span><CardHeading title={t("admin.recentActivity.title", "So'nggi faoliyat")} detail={t("admin.sensitiveDataHidden", "Nozik ma'lumotlar yashiringan")} />{user.activity.length ? <div className="admin-timeline">{user.activity.map((item) => <div key={item.id}><i /><span><strong>{actionLabel(t, item.action)}</strong><small>{entityLabel(t, item.entityType)} · {formatDate(t, item.createdAt)}</small></span></div>)}</div> : <EmptyState title={t("admin.recentActivity.empty", "So'nggi faoliyat yo'q")} />}</section>
    <ConfirmDialog state={confirm} onCancel={() => setConfirm(null)} />
  </div>;
};
const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => <div className="admin-detail-row"><span>{label}</span><strong>{children}</strong></div>;

const DataPage = ({ kind }: { kind: "usage" | "integrations" | "notifications" | "files" | "system" | "settings" }) => {
  const { t } = useI18n();
  const [range, setRange] = useState<AdminRange>(30);
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [fileSource, setFileSource] = useState("");
  const [fileStorage, setFileStorage] = useState("");
  const [fileType, setFileType] = useState("");

  const load = () => {
    setLoading(true); setError(null);
    const call = kind === "usage" ? adminApi.usage(range)
      : kind === "integrations" ? adminApi.integrations()
        : kind === "notifications" ? adminApi.notifications(range)
          : kind === "files" ? adminApi.files({ page, search: fileSearch, source: fileSource, storageProvider: fileStorage, type: fileType })
            : kind === "system" ? adminApi.system()
              : adminApi.settings();
    void call.then(setData).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false));
  };
  useEffect(load, [kind, range, page, fileSearch, fileSource, fileStorage, fileType]);
  const meta = data?.meta;
  if (error && !data) return <div className="admin-page"><PageHeader eyebrow={eyebrowFor(t, kind)} title={titleFor(t, kind)} description={descriptionFor(t, kind)} /><ErrorState error={error} retry={load} /></div>;
  return <div className="admin-page admin-fade-in">
    <PageHeader eyebrow={eyebrowFor(t, kind)} title={titleFor(t, kind)} description={descriptionFor(t, kind)}>{["usage", "notifications"].includes(kind) && <RangeSelector value={range} onChange={setRange} />}</PageHeader>
    {kind === "files" && <section className="admin-card admin-activity-filters"><div className="admin-toolbar"><div className="admin-search"><Search size={17} /><input value={fileSearch} onChange={(event) => { setPage(1); setFileSearch(event.target.value); }} placeholder={t("admin.files.searchPlaceholder", "Fayl nomi bo'yicha qidirish")} /></div><select value={fileSource} onChange={(event) => { setPage(1); setFileSource(event.target.value); }}><option value="">{t("admin.filter.allSources", "Barcha manbalar")}</option><option value="UPLOAD">{t("admin.source.upload", "Yuklangan")}</option><option value="GOOGLE_DRIVE">Google Drive</option><option value="TELEGRAM">Telegram</option><option value="SYSTEM">{t("admin.source.system", "Tizim")}</option></select><select value={fileStorage} onChange={(event) => { setPage(1); setFileStorage(event.target.value); }}><option value="">{t("admin.filter.allStorage", "Barcha storage")}</option><option value="LOCAL">{t("admin.filter.storageLocal", "Lokal")}</option><option value="S3">Amazon S3</option></select><select value={fileType} onChange={(event) => { setPage(1); setFileType(event.target.value); }}><option value="">{t("admin.filter.allTypes", "Barcha turlar")}</option><option value="image">{t("admin.type.image", "Rasm")}</option><option value="pdf">PDF</option><option value="document">{t("admin.type.document", "Hujjat")}</option></select></div></section>}
    {loading && !data ? <Loading /> : <>{kind === "usage" && <UsageView data={data} />} {kind === "integrations" && <IntegrationsView data={data} />} {kind === "notifications" && <NotificationsView data={data} />} {kind === "files" && <FilesView data={data} />} {kind === "system" && <SystemView data={data} />} {kind === "settings" && <SettingsView data={data} />}{meta && <Pagination meta={meta} page={page} onPage={setPage} />}</>}
  </div>;
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const ActivityPage = () => {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminActivity | null>(null);
  const [page, setPage] = useState(1);
  const [userIdInput, setUserIdInput] = useState(""); const [userId, setUserId] = useState("");
  const [action, setAction] = useState(""); const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const validUserId = !userIdInput || isUuid(userIdInput);
  const load = () => { setLoading(true); setError(null); void adminApi.activity({ page, userId, action, entityType, from, to: to ? `${to}T23:59:59.999Z` : "" }).then(setItems).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [page, userId, action, entityType, from, to]);
  return <div className="admin-page admin-fade-in"><PageHeader eyebrow={t("admin.activityPage.eyebrow", "AUDIT JURNALI")} title={t("admin.nav.activity", "Faoliyat jurnali")} description={t("admin.activityPage.description", "Auditlanadigan amallar; nozik qiymatlar ataylab yashiringan.")} />
    <section className="admin-card admin-activity-filters">
      <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); if (validUserId) { setPage(1); setUserId(userIdInput); } }}>
        <div className="admin-search"><Search size={17} /><input value={userIdInput} onChange={(event) => setUserIdInput(event.target.value)} placeholder={t("admin.activityPage.userIdPlaceholder", "Foydalanuvchi ID (UUID)")} /></div>
        <input className="admin-toolbar-input" value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }} placeholder={t("admin.activityPage.actionPlaceholder", "Amal turi (masalan, LOGIN)")} />
        <input className="admin-toolbar-input" value={entityType} onChange={(event) => { setPage(1); setEntityType(event.target.value); }} placeholder={t("admin.activityPage.entityPlaceholder", "Obyekt turi (masalan, USER)")} />
        <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} aria-label={t("admin.fromDate", "Sanadan")} />
        <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} aria-label={t("admin.toDate", "Sanagacha")} />
        <button type="submit" className="admin-button admin-button--ghost" disabled={!validUserId}>{t("common.search", "Qidirish")}</button>
      </form>
      {!validUserId && <p className="admin-field-hint">{t("admin.activityPage.uuidHint", "Foydalanuvchi ID UUID formatida bo'lishi kerak (masalan, 3fa85f64-5717-4562-b3fc-2c963f66afa6).")}</p>}
    </section>
    {error ? <ErrorState error={error} retry={load} /> : loading && !items ? <Loading /> : <><ActivityView data={items!} /><Pagination meta={items?.meta} page={page} onPage={setPage} /></>}
  </div>;
};
const sectionTitles = (t: TFn): Record<string, string> => ({ overview: t("admin.nav.overview", "Umumiy ko'rinish"), users: t("admin.nav.users", "Foydalanuvchilar"), user: t("admin.section.userDetail", "Foydalanuvchi tafsiloti"), usage: t("admin.nav.usage", "Foydalanish"), integrations: t("admin.nav.integrations", "Integratsiyalar"), notifications: t("admin.nav.notifications", "Bildirishnomalar"), files: t("admin.nav.files", "Fayllar"), activity: t("admin.nav.activity", "Faoliyat jurnali"), system: t("admin.nav.system", "Tizim holati"), settings: t("admin.nav.settings", "Sozlamalar") });
const titleFor = (t: TFn, kind: string) => sectionTitles(t)[kind] ?? "Admin";
const sectionEyebrows = (t: TFn): Record<string, string> => ({ usage: t("admin.eyebrow.usage", "FOYDALANISH STATISTIKASI"), integrations: t("admin.eyebrow.integrations", "INTEGRATSIYALAR"), notifications: t("admin.eyebrow.notifications", "BILDIRISHNOMALAR"), files: t("admin.eyebrow.files", "FAYLLAR"), system: t("admin.eyebrow.system", "TIZIM HOLATI"), settings: t("admin.eyebrow.settings", "SOZLAMALAR") });
const eyebrowFor = (t: TFn, kind: string) => sectionEyebrows(t)[kind] ?? titleFor(t, kind).toUpperCase();
const sectionDescriptions = (t: TFn): Record<string, string> => ({
  usage: t("admin.desc.usage", "Foydalanish AiUsage yozuvlaridan hisoblanadi. Hech qanday taxminiy qiymat qo'shilmaydi."),
  integrations: t("admin.desc.integrations", "Maxfiy ma'lumot yoki tokenlarsiz ulanish holati."),
  notifications: t("admin.desc.notifications", "Yetkazib berish holati, xatolar va xavfsiz umumiy monitoring."),
  files: t("admin.desc.files", "Faqat metama'lumot va saqlash hajmi; asl kontent maxfiy qoladi."),
  system: t("admin.desc.system", "Qulay AI platformasi uchun operatsion signallar."),
  settings: t("admin.desc.settings", "Real backend ma'lumotlariga asoslangan xavfsiz platforma sozlamalari."),
});
const descriptionFor = (t: TFn, kind: string) => sectionDescriptions(t)[kind] ?? "";

const UsageView = ({ data }: { data: AdminUsage }) => { const { t } = useI18n(); return <><div className="admin-kpi-grid admin-kpi-grid--compact"><KpiCard label={t("admin.usage.totalRequests", "Jami so'rovlar")} value={data?.totals?.requests} icon={Bot} /><KpiCard label={t("admin.usage.inputTokens", "Input tokenlar")} value={data?.totals?.inputTokens} icon={BarChart3} accent="blue" /><KpiCard label={t("admin.usage.outputTokens", "Output tokenlar")} value={data?.totals?.outputTokens} icon={Zap} accent="green" /><KpiCard label={t("admin.usage.estimatedCost", "Taxminiy xarajat")} value={`$${Number(data?.totals?.estimatedCost ?? 0).toFixed(4)}`} icon={Activity} /></div><div className="admin-grid admin-grid--charts"><section className="admin-card"><CardHeading title={t("admin.usage.trendTitle", "Foydalanish dinamikasi")} detail={t("admin.usage.trendDetail", "Haqiqiy AiUsage qatorlari")} /><TrendChart data={data?.trend ?? []} label={t("admin.usage.trendTitle", "Foydalanish dinamikasi")} /></section><section className="admin-card"><CardHeading title={t("admin.usage.providerStatusTitle", "Provayder holati")} /><div className="admin-provider-state"><Bot size={26} /><strong>{data?.provider?.status === "configured" ? t("admin.usage.providerConnected", "Provayder ulangan") : t("admin.usage.providerNotConnected", "OpenAI hali ulanmagan")}</strong><span>{data?.provider?.status === "configured" ? t("admin.usage.providerConnectedDetail", "{tools} ta tool execution · {seconds} soniya audio", { tools: formatNumber(data?.totals?.tool?.requests), seconds: formatNumber(Math.round(data?.totals?.audioSeconds ?? 0)) }) : t("admin.usage.providerNotConnectedDetail", "OpenAI ulangandan keyin token, xarajat va javob statistikasi shu yerda ko'rinadi.")}</span></div></section></div><div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title={t("admin.kpi.activeUsers", "Faol foydalanuvchilar")} detail={t("admin.selectedPeriod", "Tanlangan davr")} />{data?.byUser?.length ? <div className="admin-simple-list">{data.byUser.map((row) => <div key={row.user.id}><span className="admin-avatar">{initials(row.user)}</span><span><strong>{row.user.firstName} {row.user.lastName}</strong><small>{row.user.email}</small></span><b>{t("admin.usage.requestsCount", "{count} so'rov", { count: row.requests })}</b></div>)}</div> : <EmptyState title={t("admin.usage.noUsage", "AI foydalanish qayd etilmagan")} text={t("admin.usage.noUsageHint", "Bu neytral holat — soxta foydalanish ko'rsatilmaydi.")} />}</section><section className="admin-card"><CardHeading title={t("admin.usage.topTools", "Eng ko'p ishlatilgan tool'lar")} detail={t("admin.usage.topToolsDetail", "AI Tool Registry activity loglari")} />{data?.tools?.length ? <div className="admin-simple-list">{data.tools.slice(0, 8).map((row) => <div key={row.tool ?? "unknown"}><span className="admin-kpi__icon"><Zap size={15} /></span><span><strong>{row.tool ?? t("admin.usage.unknownTool", "Noma'lum tool")}</strong><small>{t("admin.usage.toolExecution", "Tool execution")}</small></span><b>{formatNumber(row.count)}</b></div>)}</div> : <EmptyState title={t("admin.usage.noToolUsage", "Tool ishlatilishi qayd etilmagan")} />}</section></div></>; };
const IntegrationsView = ({ data }: { data: AdminIntegrations }) => { const { t } = useI18n(); return <><div className="admin-grid admin-grid--secondary"><ConnectionCard label="Telegram" data={data?.telegram} icon={<Zap size={21} />} /><ConnectionCard label="Google" data={data?.google} icon={<Globe2 size={21} />} /></div><div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title={t("admin.integrations.healthTitle", "Integratsiya salomatligi")} detail={t("admin.integrations.healthDetail", "Sirlarsiz real tizim holati")} /><div className="admin-health-list"><div><span>{t("admin.integrations.telegramLastCheck", "Telegram oxirgi tekshiruv")}</span><b>{data?.health?.telegram?.lastValidatedAt ? formatDate(t, data.health.telegram.lastValidatedAt) : t("admin.neverChecked", "Hali tekshirilmagan")}</b></div><div><span>{t("admin.integrations.telegramRecentErrors", "Telegram so'nggi xatolar")}</span><b className={(data?.health?.telegram?.recentErrors ?? 0) ? "is-warning" : "is-healthy"}>{formatNumber(data?.health?.telegram?.recentErrors)}</b></div><div><span>{t("admin.integrations.calendarEnabledUsers", "Calendar ruxsati faol userlar")}</span><b>{formatNumber(data?.health?.google?.calendarEnabledUsers)}</b></div><div><span>{t("admin.integrations.driveEnabledUsers", "Drive ruxsati faol userlar")}</span><b>{formatNumber(data?.health?.google?.driveEnabledUsers)}</b></div></div></section><section className="admin-card"><CardHeading title={t("admin.integrations.warningsTitle", "Muammoli integratsiyalar")} detail={t("admin.integrations.warningsDetail", "Oxirgi 24 soat / ERROR holati")} />{data?.warnings?.length ? <div className="admin-simple-list">{data.warnings.map((row) => <div key={`${row.provider}-${row.userId}-${row.at ?? row.code}`}><span className="admin-status admin-status--blocked"><i />{row.provider === "telegram" ? "Telegram" : "Google"}</span><span><strong>{row.email}</strong><small>{row.code} · {row.at ? formatDate(t, row.at) : t("admin.timeUnknown", "vaqt noma'lum")}</small></span></div>)}</div> : <EmptyState title={t("admin.integrations.noWarnings", "Muammoli integratsiya yo'q")} text={t("admin.integrations.allHealthy", "Ulanishlar normal ishlayapti.")} />}</section></div></>; };
const ConnectionCard = ({ label, data, icon }: { label: string; data: AdminConnectionCounts | undefined; icon: ReactNode }) => { const { t } = useI18n(); return <section className="admin-card"><div className="admin-connection-heading"><span className="admin-kpi__icon">{icon}</span><div><h2>{label}</h2><span>{t("admin.connectionCard.subtitle", "Umumiy tizim statistikasi")}</span></div></div><div className="admin-status-grid">{(["connected", "disconnected", "error"] as const).map((key) => <div key={key}><span>{connectionLabels(t)[key]}</span><strong>{formatNumber(data?.[key])}</strong></div>)}</div></section>; };
const NotificationsView = ({ data }: { data: AdminNotifications }) => {
  const { t } = useI18n();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retried, setRetried] = useState<Set<string>>(() => new Set());
  const totalDelivered = (data?.totals?.sent ?? 0) + (data?.totals?.read ?? 0);
  const attempted = totalDelivered + (data?.totals?.failed ?? 0);
  const successRate = attempted ? Math.round(totalDelivered / attempted * 100) : 100;
  const retry = async (id: string) => {
    if (retrying) return;
    setRetrying(id);
    try {
      await adminApi.retryNotification(id);
      setRetried((current) => new Set([...current, id]));
    } finally { setRetrying(null); }
  };
  return <>
    <section className="admin-card"><CardHeading title={t("admin.notifications.deliveryStatus", "Yetkazib berish holati")} detail={t("admin.notifications.successRate", "Muvaffaqiyat {rate}%", { rate: successRate })} /><div className="admin-status-grid admin-status-grid--wide">{Object.entries(data?.totals ?? {}).map(([key, value]) => <div key={key}><span>{notificationTotalLabels(t)[key] ?? key}</span><strong>{formatNumber(value)}</strong></div>)}</div></section>
    <section className="admin-card"><CardHeading title={t("admin.notifications.recentFailedTitle", "So'nggi muvaffaqiyatsiz bildirishnomalar")} detail={t("admin.notifications.recentFailedDetail", "Kontent yashiringan · qayta yuborish xavfsiz navbatga qo'yadi")} />{data?.failed?.length ? <div className="admin-simple-list">{data.failed.map((row) => <div key={row.id}><span className="admin-status admin-status--blocked"><i />{t("admin.notifications.errorBadge", "XATO")}</span><span><strong>{row.type} · {row.channel}</strong><small>{row.user?.email} · {formatDate(t, row.failedAt ?? row.createdAt)}</small></span><span className="admin-inline-action"><b>{t("admin.notifications.attemptsCount", "{count} urinish", { count: row.retryCount })}</b><button type="button" disabled={retrying === row.id || retried.has(row.id)} onClick={() => void retry(row.id)}>{retried.has(row.id) ? t("admin.notifications.queued", "Navbatga qo'yildi") : retrying === row.id ? t("admin.notifications.pendingRetry", "Kutilmoqda...") : t("admin.notifications.resend", "Qayta yuborish")}</button></span></div>)}</div> : <EmptyState title={t("admin.notifications.noFailed", "Muvaffaqiyatsiz bildirishnoma yo'q")} />}</section>
  </>;
};
const FilesView = ({ data }: { data: AdminFiles }) => { const { t } = useI18n(); return <><section className="admin-card"><CardHeading title={t("admin.files.storageTitle", "Saqlash hajmi")} detail={t("admin.files.storageDetail", "O'chirilgan yozuvlar hisobga olinmagan")} /><div className="admin-status-grid admin-status-grid--wide">{[[t("admin.files.total", "Jami fayllar"), formatNumber(data?.stats?.total)], [t("admin.files.totalSize", "Jami hajm"), formatBytes(data?.stats?.totalSizeBytes)], [t("admin.files.images", "Rasmlar"), formatNumber(data?.stats?.images)], ["PDF", formatNumber(data?.stats?.pdfs)], [t("admin.files.docs", "Hujjatlar"), formatNumber(data?.stats?.docs)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section><div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title={t("admin.files.providerTitle", "Saqlash provayderi")} /><div className="admin-status-grid">{["local", "s3"].map((key) => <div key={key}><span>{key === "local" ? t("admin.filter.storageLocal", "Lokal") : "Amazon S3"}</span><strong>{formatNumber(data?.stats?.storage?.[key])}</strong></div>)}</div></section><section className="admin-card"><CardHeading title={t("admin.files.bySource", "Manba bo'yicha")} /><div className="admin-status-grid">{Object.keys(sourceLabels(t)).map((key) => <div key={key}><span>{sourceLabels(t)[key]}</span><strong>{formatNumber(data?.stats?.sources?.[key])}</strong></div>)}</div></section></div><section className="admin-card"><CardHeading title={t("admin.files.recentTitle", "So'nggi fayllar")} detail={t("admin.metadataOnly", "Faqat metama'lumot")} />{data?.items?.length ? <div className="admin-simple-list">{data.items.map((row) => <div key={row.id}><span className="admin-file-icon"><FileText size={17} /></span><span><strong>{row.originalName}</strong><small>{row.owner?.email} · {row.mimeType} · {sourceLabels(t)[row.source?.toLowerCase()] ?? row.source}</small></span><b>{formatBytes(row.sizeBytes)}</b></div>)}</div> : <EmptyState title={t("admin.files.noFiles", "Hech qanday fayl yuklanmagan")} />}</section></>; };
const ActivityView = ({ data }: { data: AdminActivity }) => { const { t } = useI18n(); return <section className="admin-card"><CardHeading title={t("admin.activityView.title", "Audit izi")} detail={t("admin.sensitiveHidden", "Nozik qiymatlar yashiringan")} />{data?.items?.length ? <div className="admin-simple-list">{data.items.map((row) => <div key={row.id}><span className="admin-avatar">{initials(row.user)}</span><span><strong>{actionLabel(t, row.action)}</strong><small>{row.user?.email} · {entityLabel(t, row.entity?.type)} · {formatDate(t, row.time)}</small></span><b>{row.source === "AI_TOOL" ? t("admin.aiTool", "AI vositasi") : t("admin.appSource", "Ilova")}</b></div>)}</div> : <EmptyState title={t("admin.activityView.empty", "Faoliyat qayd etilmagan")} />}</section>; };
const SystemView = ({ data }: { data: AdminSystem }) => { const { t } = useI18n(); return <div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title={t("admin.system.uptimeInfoTitle", "Ishlash vaqti ma'lumotlari")} /><div className="admin-health-list">{[["API", healthLabels(t)[data?.api?.status] ?? data?.api?.status, data?.api?.status === "ok"], [t("admin.system.database", "Ma'lumotlar bazasi"), healthLabels(t)[data?.database?.status] ?? data?.database?.status, data?.database?.status === "ok"], [t("admin.system.dbLatency", "Baza kechikishi"), `${formatNumber(data?.database?.latencyMs)} ms`, true], [t("admin.system.notificationWorker", "Bildirishnoma workeri"), healthLabels(t)[data?.notificationWorker?.status] ?? data?.notificationWorker?.status, data?.notificationWorker?.status === "running"], [t("admin.system.environment", "Muhit"), envLabels(t)[data?.environment] ?? data?.environment, true], [t("admin.system.uptime", "Ishlash vaqti"), formatUptime(t, data?.uptimeSeconds), true], [t("admin.system.migrations", "Migratsiyalar"), t("admin.system.migrationsManaged", "Prisma orqali boshqariladi"), true]].map(([label, value, healthy]) => <div key={label as string}><span>{label}</span><b className={healthy ? "is-healthy" : ""}>{String(value ?? "—")}</b></div>)}</div></section><section className="admin-card"><CardHeading title={t("admin.system.integrationsTitle", "Integratsiya holati")} detail={t("admin.system.noDataExposed", "Hech qanday ma'lumot ochilmaydi")} /><ConnectionCard label="Telegram" data={data?.integrations?.telegram} icon={<Zap size={21} />} /><ConnectionCard label="Google" data={data?.integrations?.google} icon={<Globe2 size={21} />} /></section></div>; };

const SettingsRow = ({ label, value, healthy }: { label: string; value: ReactNode; healthy?: boolean }) => <div><span>{label}</span><b className={healthy ? "is-healthy" : ""}>{value}</b></div>;
const SettingsMissing = () => { const { t } = useI18n(); return <div className="admin-settings-missing">{t("admin.noDataAvailable", "Ma'lumot mavjud emas.")}</div>; };

const PlanEditor = () => {
  const { t } = useI18n(); const [plans,setPlans]=useState<AdminPlan[]>([]); const [saving,setSaving]=useState<string|null>(null); const [message,setMessage]=useState('');
  useEffect(()=>{void adminApi.plans().then(setPlans).catch((error:unknown)=>setMessage(getApiErrorMessage(error)))},[]);
  const update=(tier:AdminPlan['tier'], patch:Partial<AdminPlan>)=>setPlans((rows)=>rows.map((row)=>row.tier===tier?{...row,...patch,limits:{...row.limits,...(patch.limits??{})}}:row));
  const save=async(plan:AdminPlan)=>{setSaving(plan.tier);setMessage('');try{const next=await adminApi.updatePlan(plan.tier,{name:plan.name,monthlyPrice:plan.monthlyPrice,currency:plan.currency,isActive:plan.isActive,...plan.limits});setPlans((rows)=>rows.map((row)=>row.tier===next.tier?next:row));setMessage(t('admin.plan.saved','Tarif saqlandi'));}catch(error){setMessage(getApiErrorMessage(error))}finally{setSaving(null)}};
  return <section className="admin-card admin-settings-editable"><CardHeading title={t('admin.plan.title','Tariflar va real limitlar')} detail={t('admin.plan.detail','Bu qiymatlar foydalanuvchi tarif sahifasi va backend cheklovlariga qo‘llanadi')} /><div className="admin-plan-grid">{plans.map((plan)=><article className="admin-plan-editor" key={plan.tier}><strong>{plan.tier}</strong><label><span>{t('admin.plan.name','Nomi')}</span><input value={plan.name} onChange={(e)=>update(plan.tier,{name:e.target.value})}/></label><div className="admin-plan-row"><label><span>{t('admin.plan.price','Narxi')}</span><input type="number" min="0" value={plan.monthlyPrice} onChange={(e)=>update(plan.tier,{monthlyPrice:Number(e.target.value)})}/></label><label><span>{t('admin.plan.currency','Valyuta')}</span><select value={plan.currency} onChange={(e)=>update(plan.tier,{currency:e.target.value as AdminPlan['currency']})}><option>UZS</option><option>USD</option></select></label></div>{([['aiCreditsPerMonth',t('billing.aiCredits','AI kreditlari')],['toolActionsPerMonth',t('billing.toolActions','Agent amallari')],['voiceMinutesPerMonth',t('billing.voiceMinutes','Ovozli daqiqalar')],['files',t('nav.files','Fayllar')],['storageMb','Storage MB'],['memories',t('billing.memory','Xotira')]] as Array<[keyof AdminPlan['limits'],string]>).map(([key,label])=><label key={key}><span>{label}</span><input type="number" min="0" value={plan.limits[key]} onChange={(e)=>update(plan.tier,{limits:{...plan.limits,[key]:Number(e.target.value)}})}/></label>)}<label className="admin-plan-active"><input type="checkbox" checked={plan.isActive} onChange={(e)=>update(plan.tier,{isActive:e.target.checked})}/><span>{t('common.active','Faol')}</span></label><button className="admin-button" disabled={saving===plan.tier} onClick={()=>void save(plan)}>{saving===plan.tier?t('common.saving','Saqlanmoqda...'):t('common.save','Saqlash')}</button></article>)}</div>{message&&<p>{message}</p>}</section>;
};
const SettingsSection = ({ title, detail, missing, children }: { title: string; detail: string; missing: boolean; children: ReactNode }) => <section className="admin-card"><CardHeading title={title} detail={detail} />{missing ? <SettingsMissing /> : <div className="admin-health-list">{children}</div>}</section>;
export const SettingsView = ({ data }: { data: NormalizedAdminSettings | null }) => {
  const { t } = useI18n();
  const [platformName, setPlatformName] = useState("Qulay AI");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [telegramDiagnosticBusy, setTelegramDiagnosticBusy] = useState(false);
  const [telegramDiagnosticMessage, setTelegramDiagnosticMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPlatformName(data.data.platform.name || "Qulay AI");
    setRegistrationEnabled(data.data.platform.registrationEnabled);
  }, [data]);

  if (!data) return null;
  const { data: settings, missingSections } = data;
  const isMissing = (section: AdminSettingsSection) => missingSections.includes(section);
  const savePlatform = async () => {
    const name = platformName.trim();
    if (name.length < 2 || saving) return;
    setSaving(true); setSaveMessage(null);
    try {
      const result = await adminApi.updatePlatformSettings({ name, registrationEnabled });
      setPlatformName(result.name);
      setRegistrationEnabled(result.registrationEnabled);
      notifyPlatformNameChanged(result.name);
      setSaveMessage(t("admin.settings.platformSaved", "Platforma sozlamalari saqlandi"));
    } catch (error) {
      setSaveMessage(getApiErrorMessage(error));
    } finally { setSaving(false); }
  };
  const runTelegramDiagnostic = async () => {
    if (telegramDiagnosticBusy) return;
    setTelegramDiagnosticBusy(true); setTelegramDiagnosticMessage(null);
    try {
      const result = await adminApi.runTelegramLoginDiagnostic();
      setTelegramDiagnosticMessage(`So‘rov yuborildi · deployment ${result.deploymentVersion} · ID ${result.diagnosticId}`);
    } catch (error) {
      setTelegramDiagnosticMessage(getApiErrorMessage(error));
    } finally { setTelegramDiagnosticBusy(false); }
  };

  return <div className="admin-grid admin-grid--settings">
    <PlanEditor />
    <section className="admin-card admin-settings-editable"><CardHeading title={t("admin.settings.platformTitle", "Platforma sozlamalari")} detail={t("admin.settings.platformDetail", "O'zgarishlar real platformaga qo'llanadi")} />
      <div className="admin-settings-form">
        <label><span>{t("admin.settings.platformName", "Platforma nomi")}</span><input value={platformName} maxLength={100} onChange={(event) => setPlatformName(event.target.value)} /></label>
        <div className="admin-settings-toggle-row"><div><strong>{t("admin.settings.registrationTitle", "Yangi ro'yxatdan o'tish")}</strong><small>{t("admin.settings.registrationHint", "O'chirilsa yangi foydalanuvchilar akkaunt yarata olmaydi.")}</small></div><button type="button" role="switch" aria-checked={registrationEnabled} className={`admin-switch ${registrationEnabled ? "is-on" : ""}`} onClick={() => setRegistrationEnabled((value) => !value)}><i /></button></div>
        <div className="admin-settings-readonly"><span>{t("admin.settings.defaultStatus", "Standart holat")}</span><b>{statusLabels(t)[settings.platform.defaultUserStatus] ?? settings.platform.defaultUserStatus}</b></div>
        <div className="admin-settings-save-row"><button type="button" className="admin-button" disabled={saving || platformName.trim().length < 2} onClick={() => void savePlatform()}>{saving ? t("common.saving", "Saqlanmoqda...") : t("common.save", "Saqlash")}</button>{saveMessage && <span>{saveMessage}</span>}</div>
      </div>
    </section>
    <SettingsSection title={t("admin.securitySection.title", "Xavfsizlik")} detail={t("admin.readonlyRealValues", "Real, hozirda amal qiluvchi qiymatlar (read-only)")} missing={isMissing("security")}>
      <SettingsRow label={t("admin.settings.accessTokenTtl", "Access token muddati")} value={settings.security.accessTokenExpiresIn} />
      <SettingsRow label={t("admin.settings.refreshTokenTtl", "Refresh token muddati")} value={settings.security.refreshTokenExpiresIn} />
      <SettingsRow label={t("admin.settings.loginAttemptsIp", "Login urinishlari (IP)")} value={t("admin.perMinutes", "{max} / {window} daqiqa", { max: settings.security.rateLimits.loginPerIp.max, window: settings.security.rateLimits.loginPerIp.windowMinutes })} />
      <SettingsRow label={t("admin.settings.loginAttemptsEmail", "Login urinishlari (email)")} value={t("admin.perMinutes", "{max} / {window} daqiqa", { max: settings.security.rateLimits.loginPerEmail.max, window: settings.security.rateLimits.loginPerEmail.windowMinutes })} />
      <SettingsRow label={t("admin.settings.registerAttempts", "Ro'yxatdan o'tish urinishlari")} value={t("admin.perMinutesIp", "{max} / {window} daqiqa (IP)", { max: settings.security.rateLimits.registerPerIp.max, window: settings.security.rateLimits.registerPerIp.windowMinutes })} />
      <SettingsRow label={t("admin.settings.resetAttempts", "Parolni tiklash urinishlari")} value={t("admin.perMinutes", "{max} / {window} daqiqa", { max: settings.security.rateLimits.passwordReset.max, window: settings.security.rateLimits.passwordReset.windowMinutes })} />
      <SettingsRow label={t("admin.settings.globalRateLimit", "Umumiy so'rov chegarasi")} value={t("admin.perSecondsIp", "{max} / {window} soniya (IP)", { max: settings.security.rateLimits.globalPerIp.max, window: settings.security.rateLimits.globalPerIp.windowSeconds })} />
      <SettingsRow label={t("admin.settings.bruteForce", "Login qo'pol kuch himoyasi")} value={t("admin.bruteForceValue", "{fails} xato → {lock} daqiqa bloklash", { fails: settings.security.loginBruteForce.maxFailures, lock: settings.security.loginBruteForce.lockMinutes })} />
    </SettingsSection>
    <SettingsSection title={t("settings.notifications", "Bildirishnomalar")} detail={t("admin.settings.workerConfigReadonly", "Worker konfiguratsiyasi (read-only)")} missing={isMissing("notifications")}>
      <SettingsRow label={t("admin.settings.workerStatus", "Worker holati")} value={healthLabels(t)[settings.notifications.workerStatus] ?? settings.notifications.workerStatus} healthy={settings.notifications.workerStatus === "running"} />
      <SettingsRow label={t("admin.settings.checkInterval", "Tekshirish oralig'i")} value={t("admin.seconds", "{count} soniya", { count: settings.notifications.intervalSeconds })} />
      <SettingsRow label={t("admin.settings.batchSize", "Partiya hajmi")} value={settings.notifications.batchSize} />
      <SettingsRow label={t("admin.settings.retryLimit", "Qayta urinish chegarasi")} value={settings.notifications.retryLimit} />
    </SettingsSection>
    <SettingsSection title={t("admin.nav.integrations", "Integratsiyalar")} detail={t("admin.settings.integrationsDetail", "Sozlangan/sozlanmagan holat, sirlarsiz")} missing={isMissing("integrations")}>
      <SettingsRow label="Telegram" value={settings.integrations.telegram.configured ? t("admin.configured", "Sozlangan") : t("admin.notConfigured", "Sozlanmagan")} healthy={settings.integrations.telegram.configured} />
      {settings.integrations.telegram.loginDiagnosticEnabled && <div className="admin-settings-save-row"><button type="button" className="admin-button" disabled={telegramDiagnosticBusy} onClick={() => void runTelegramDiagnostic()}>{telegramDiagnosticBusy ? "Tekshirilmoqda..." : "Telegram login diagnostikasini ishga tushirish"}</button>{telegramDiagnosticMessage && <span role="status">{telegramDiagnosticMessage}</span>}</div>}
      <SettingsRow label="Google" value={settings.integrations.google.configured ? t("admin.configured", "Sozlangan") : t("admin.notConfigured", "Sozlanmagan")} healthy={settings.integrations.google.configured} />
      <SettingsRow label="OpenAI" value={settings.integrations.openai.configured ? t("admin.configured", "Sozlangan") : t("admin.notConfigured", "Sozlanmagan")} healthy={settings.integrations.openai.configured} />
    </SettingsSection>
    <section className="admin-card"><CardHeading title={t("admin.settings.storageTitle", "Saqlash joyi")} detail={t("admin.settings.storageDetail", "Fayl saqlash konfiguratsiyasi (read-only)")} />{isMissing("storage") ? <SettingsMissing /> : <><div className="admin-health-list">
      <SettingsRow label={t("admin.settings.currentProvider", "Joriy provayder")} value={storageProviderLabels(t)[settings.storage.provider] ?? settings.storage.provider} />
      <SettingsRow label={t("admin.settings.maxFileSize", "Fayl hajmi chegarasi")} value={formatBytes(settings.storage.maxFileSizeBytes)} />
    </div>{settings.storage.localWarning && <div className="admin-settings-warning">{settings.storage.localWarning}</div>}</>}</section>
    <SettingsSection title={t("admin.nav.system", "Tizim")} detail={t("admin.settings.systemDetail", "Muhit va backend holati (read-only)")} missing={isMissing("system")}>
      <SettingsRow label={t("admin.system.environment", "Muhit")} value={envLabels(t)[settings.system.environment] ?? settings.system.environment} />
      <SettingsRow label={t("admin.settings.version", "Versiya")} value={settings.system.version ?? t("admin.unknown", "Noma'lum")} />
      <SettingsRow label={t("admin.settings.backendStatus", "Backend holati")} value={healthLabels(t)[settings.system.api.status] ?? settings.system.api.status} healthy={settings.system.api.status === "ok"} />
      <SettingsRow label={t("admin.settings.dbStatus", "Ma'lumotlar bazasi holati")} value={healthLabels(t)[settings.system.database.status] ?? settings.system.database.status} healthy={settings.system.database.status === "ok"} />
    </SettingsSection>
  </div>;
};

const Pagination = ({ meta, page, onPage }: { meta?: { page: number; total: number; totalPages: number }; page: number; onPage: (page: number) => void }) => { const { t } = useI18n(); return !meta || !meta.totalPages ? null : <div className="admin-pagination"><span>{t("admin.recordsCount", "{count} ta yozuv", { count: meta.total })}</span><div><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button><strong>{page} / {meta.totalPages}</strong><button type="button" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button></div></div>; };

const AdminConsole = () => {
  const { t } = useI18n();
  const location = useLocation(); const navigate = useNavigate(); const { user, logout } = useAuth(); const { name: platformName } = usePlatform(); const [theme, setTheme] = useState(document.documentElement.dataset.theme === "dark"); const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { if (user?.role !== "ADMIN") navigate("/admin/login", { replace: true, state: { accessDenied: true } }); }, [user, navigate]);
  if (!user || user.role !== "ADMIN") return null;
  const path = location.pathname; const detailMatch = path.match(/^\/admin\/users\/([^/]+)/); const section = detailMatch ? "user" : path === "/admin" ? "overview" : path.split("/")[2] ?? "overview";
  const content = section === "overview" ? <AdminOverviewPage /> : section === "users" && !detailMatch ? <UsersPage /> : section === "user" && detailMatch ? <UserDetailPage id={detailMatch[1]} key={detailMatch[1]} /> : section === "activity" ? <ActivityPage key={section} /> : ["usage", "integrations", "notifications", "files", "system", "settings"].includes(section) ? <DataPage kind={section as "usage"} key={section} /> : <AdminOverviewPage />;
  const toggleTheme = () => { const next = !theme; document.documentElement.dataset.theme = next ? "dark" : "light"; setTheme(next); };
  return <div className="admin-console"><aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}><div className="admin-brand"><span className="admin-brand__mark">Q</span><div><strong>{platformName}</strong><small>{t("admin.adminPanel", "Administrator paneli")}</small></div><button className="admin-mobile-close" type="button" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><nav>{getNavGroups(t).map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-group__label">{group.label}</span>{group.items.map(({ label, path: itemPath, icon: Icon, exact }) => <Link key={itemPath} onClick={() => setMobileOpen(false)} className={`admin-nav-item ${exact ? path === itemPath : path.startsWith(itemPath) ? "is-active" : ""}`} to={itemPath}><Icon size={17} /><span>{label}</span></Link>)}</div>)}</nav><div className="admin-sidebar__bottom"><Link className="admin-back-app" to="/dashboard"><ArrowLeft size={15} /> {t("admin.backToApp", "Asosiy ilovaga qaytish")}</Link><div className="admin-sidebar__user"><span className="admin-avatar">{initials(user)}</span><span><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></span><button type="button" aria-label={t("nav.logout", "Chiqish")} title={t("nav.logout", "Chiqish")} onClick={() => { void logout().then(() => navigate("/login")); }}><LogOut size={15} /></button></div></div></aside><main className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" type="button" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="admin-breadcrumb"><span>{platformName}</span><b>/</b><strong>{titleFor(t, section)}</strong></div><div className="admin-topbar__actions"><button type="button" className="admin-icon-button" onClick={toggleTheme} aria-label={t("admin.toggleTheme", "Mavzuni almashtirish")}>{theme ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>{content}</main></div>;
};
export default AdminConsole;
