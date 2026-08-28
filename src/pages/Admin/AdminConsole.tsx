import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, ArrowUpDown, BarChart3, Bell, Bot, Check, ChevronLeft, ChevronRight, CircleHelp, FileText, Globe2, HeartPulse, LayoutDashboard, LogOut, Menu, Moon, Search, Settings2, Shield, Sun, Users, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api/apiClient";
import { adminApi, type AdminActivity, type AdminConnectionCounts, type AdminFiles, type AdminIntegrations, type AdminNotifications, type AdminOverview, type AdminRange, type AdminSettingsSection, type AdminSystem, type AdminUsage, type AdminUser, type AdminUserDetail, type NormalizedAdminSettings } from "../../services/api/adminApi";
import "./AdminConsole.scss";

type NavItem = { label: string; path: string; icon: LucideIcon; exact?: boolean };
const navItems: NavItem[] = [
  { label: "Umumiy ko'rinish", path: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Foydalanuvchilar", path: "/admin/users", icon: Users },
  { label: "Foydalanish", path: "/admin/usage", icon: BarChart3 },
  { label: "Integratsiyalar", path: "/admin/integrations", icon: Globe2 },
  { label: "Bildirishnomalar", path: "/admin/notifications", icon: Bell },
  { label: "Fayllar", path: "/admin/files", icon: FileText },
  { label: "Faoliyat jurnali", path: "/admin/activity", icon: Activity },
  { label: "Tizim holati", path: "/admin/system", icon: HeartPulse },
  { label: "Sozlamalar", path: "/admin/settings", icon: Settings2 },
];
const rangeOptions: AdminRange[] = [7, 30, 90];

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrator", USER: "Foydalanuvchi" };
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Faol", BLOCKED: "Bloklangan" };
const CONNECTION_LABELS: Record<string, string> = { connected: "Ulangan", disconnected: "Ulanmagan", error: "Xato" };
const NOTIFICATION_TOTAL_LABELS: Record<string, string> = { total: "Jami", pending: "Kutilmoqda", sent: "Yuborildi", failed: "Xato", read: "O'qildi" };
const SOURCE_LABELS: Record<string, string> = { upload: "Yuklangan", google_drive: "Google Drive", telegram: "Telegram", system: "Tizim" };
const STORAGE_PROVIDER_LABELS: Record<string, string> = { LOCAL: "Lokal disk", S3: "Amazon S3" };
const HEALTH_LABELS: Record<string, string> = { ok: "Ishlayapti", running: "Ishlayapti", unreachable: "Ulanmagan", stopped: "To'xtagan" };
const ENV_LABELS: Record<string, string> = { production: "Ishlab chiqarish", development: "Test muhiti", test: "Sinov muhiti" };
const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: "Vazifa yaratildi", TASK_COMPLETED: "Vazifa bajarildi", REMINDER_CREATED: "Eslatma yaratildi", MEETING_CREATED: "Uchrashuv yaratildi",
  NOTE_CREATED: "Izoh yaratildi", CONTACT_CREATED: "Kontakt yaratildi", CONTACT_UPDATED: "Kontakt yangilandi", CONTACT_DELETED: "Kontakt o'chirildi",
  MEMORY_CREATED: "Xotira yaratildi", MEMORY_UPDATED: "Xotira yangilandi", MEMORY_DELETED: "Xotira o'chirildi",
  FINANCE_TRANSACTION_CREATED: "Moliyaviy yozuv yaratildi", FINANCE_TRANSACTION_UPDATED: "Moliyaviy yozuv yangilandi", FINANCE_TRANSACTION_DELETED: "Moliyaviy yozuv o'chirildi",
  FINANCE_CATEGORY_CREATED: "Moliya toifasi yaratildi", FINANCE_CATEGORY_UPDATED: "Moliya toifasi yangilandi", FINANCE_CATEGORY_DELETED: "Moliya toifasi o'chirildi",
  AI_TOOL_EXECUTED: "AI vositasi ishlatildi", TELEGRAM_CONNECTED: "Telegram ulandi", TELEGRAM_DISCONNECTED: "Telegram uzildi", TELEGRAM_MESSAGE_SENT: "Telegram xabari yuborildi",
  NOTIFICATION_SENT: "Bildirishnoma yuborildi", NOTIFICATION_FAILED: "Bildirishnoma yuborilmadi", GOOGLE_CONNECTED: "Google ulandi", GOOGLE_DISCONNECTED: "Google uzildi",
  GOOGLE_CALENDAR_EVENT_CREATED: "Google kalendar tadbiri yaratildi", GOOGLE_CALENDAR_EVENT_UPDATED: "Google kalendar tadbiri yangilandi", GOOGLE_CALENDAR_EVENT_DELETED: "Google kalendar tadbiri o'chirildi",
  FILE_UPLOADED: "Fayl yuklandi", FILE_DELETED: "Fayl o'chirildi", PASSWORD_RESET_REQUESTED: "Parolni tiklash so'raldi", PASSWORD_RESET_COMPLETED: "Parol tiklandi",
  LOGIN_FAILED: "Kirish muvaffaqiyatsiz", LOGIN_SUCCEEDED: "Tizimga kirildi", LOGIN_BLOCKED: "Kirish bloklandi", REGISTERED: "Ro'yxatdan o'tildi",
  REGISTER_FAILED: "Ro'yxatdan o'tish muvaffaqiyatsiz", REFRESH_SUCCEEDED: "Sessiya yangilandi", LOGOUT_COMPLETED: "Tizimdan chiqildi", PASSWORD_CHANGED: "Parol o'zgartirildi",
  FOLDER_CREATED: "Papka yaratildi", FOLDER_UPDATED: "Papka yangilandi", FOLDER_DELETED: "Papka o'chirildi",
  ADMIN_USER_BLOCKED: "Foydalanuvchi bloklandi", ADMIN_USER_UNBLOCKED: "Foydalanuvchi blokdan chiqarildi", ADMIN_ROLE_CHANGED: "Rol o'zgartirildi",
};
const ENTITY_LABELS: Record<string, string> = { USER: "Foydalanuvchi", TASK: "Vazifa", REMINDER: "Eslatma", MEETING: "Uchrashuv", NOTE: "Izoh", CONTACT: "Kontakt", FILE: "Fayl", NOTIFICATION: "Bildirishnoma", AUTH: "Autentifikatsiya", MEMORY: "Xotira", FOLDER: "Papka" };
const actionLabel = (action: string) => ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
const entityLabel = (type?: string) => (type ? ENTITY_LABELS[type] ?? type : "");

const formatNumber = (value: number | undefined) => new Intl.NumberFormat("uz-Latn").format(value ?? 0);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("uz-Latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Hali faollik yo'q";
const formatBytes = (value: number | undefined) => { const bytes = value ?? 0; if (bytes < 1024) return `${bytes} B`; const units = ["KB", "MB", "GB", "TB"]; let size = bytes / 1024; let i = 0; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`; };
const formatUptime = (totalSeconds: number | undefined) => { const seconds = totalSeconds ?? 0; const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60); if (days > 0) return `${days} kun ${hours} soat`; if (hours > 0) return `${hours} soat ${minutes} daqiqa`; return `${minutes} daqiqa`; };
const initials = (user: { firstName?: string; lastName?: string; email?: string }) => `${user.firstName?.[0] ?? user.email?.[0] ?? "Q"}${user.lastName?.[0] ?? ""}`.toUpperCase();

const EmptyState = ({ title, text = "Tanlangan davr uchun real ma'lumot mavjud emas." }: { title: string; text?: string }) => <div className="admin-empty"><div className="admin-empty__icon"><CircleHelp size={20} /></div><strong>{title}</strong><span>{text}</span></div>;
const ErrorState = ({ error, retry }: { error: string; retry: () => void }) => <div className="admin-error"><strong>Ma'lumotni yuklab bo'lmadi</strong><span>{error}</span><button type="button" onClick={retry}>Qayta urinish</button></div>;
const Loading = () => <div className="admin-loading"><span /><span /><span /></div>;

type ConfirmState = { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary"; onConfirm: () => void } | null;
const ConfirmDialog = ({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) => {
  if (!state) return null;
  return <div className="admin-modal-overlay" role="presentation" onClick={onCancel}>
    <div className="admin-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <h3>{state.title}</h3>
      <p>{state.description}</p>
      <div className="admin-modal__actions">
        <button type="button" className="admin-button admin-button--ghost" onClick={onCancel}>Bekor qilish</button>
        <button type="button" className={`admin-button ${state.tone === "danger" ? "admin-button--danger" : ""}`} onClick={() => { state.onConfirm(); onCancel(); }}>{state.confirmLabel}</button>
      </div>
    </div>
  </div>;
};

const TrendChart = ({ data, label }: { data: Array<{ date: string; count: number }>; label: string }) => {
  if (!data.length) return <EmptyState title="Bu davr uchun dinamika yo'q" />;
  const max = Math.max(...data.map((item) => item.count), 1);
  return <div className="admin-chart" aria-label={label}>
    <div className="admin-chart__bars">{data.map((item) => <div className="admin-chart__bar-wrap" key={item.date} title={`${item.date}: ${item.count}`}><div className="admin-chart__bar" style={{ height: `${Math.max(4, item.count / max * 100)}%` }} /><small>{new Date(item.date).toLocaleDateString("uz-Latn", { month: "short", day: "numeric" })}</small></div>)}</div>
  </div>;
};

const KpiCard = ({ label, value, icon: Icon, accent = "violet" }: { label: string; value: number; icon: LucideIcon; accent?: string }) => <div className={`admin-kpi admin-kpi--${accent}`}><div className="admin-kpi__top"><span>{label}</span><Icon size={17} /></div><strong>{formatNumber(value)}</strong><small>Baza asosidagi real ko'rsatkich</small></div>;

const AdminOverviewPage = () => {
  const [range, setRange] = useState<AdminRange>(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setError(null); void adminApi.overview(range).then(setData).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [range]);
  const kpis = data?.kpis ?? {};
  const activity = data?.activityOverview ?? {};
  return <div className="admin-page admin-fade-in">
    <PageHeader eyebrow="PLATFORMA STATISTIKASI" title="Xayrli kun, administrator" description="Qulay AI platformasining real vaqtdagi operatsion ko'rinishi."><RangeSelector value={range} onChange={setRange} /></PageHeader>
    {error ? <ErrorState error={error} retry={load} /> : loading && !data ? <Loading /> : <>
      <div className="admin-kpi-grid">
        <KpiCard label="Jami foydalanuvchilar" value={kpis.users} icon={Users} /><KpiCard label="Faol foydalanuvchilar" value={kpis.activeUsers} icon={Zap} accent="blue" /><KpiCard label="Bugun qo'shilganlar" value={kpis.registeredToday} icon={Activity} accent="green" /><KpiCard label="Shu oy qo'shilganlar" value={kpis.registeredThisMonth} icon={BarChart3} /><KpiCard label="Bloklanganlar" value={kpis.blockedUsers} icon={Shield} accent="red" /><KpiCard label="Jami AI so'rovlar" value={kpis.aiUsageRequests} icon={Bot} accent="blue" /><KpiCard label="Jami fayllar" value={kpis.files} icon={FileText} accent="green" /><KpiCard label="Jami bildirishnomalar" value={kpis.notifications} icon={Bell} />
      </div>
      <div className="admin-grid admin-grid--charts"><section className="admin-card"><CardHeading title="Foydalanuvchilar o'sishi" detail={`Oxirgi ${range} kun`} /><TrendChart data={data?.userGrowth ?? []} label="Foydalanuvchilar o'sishi" /></section><section className="admin-card"><CardHeading title="Faollik dinamikasi" detail={`Oxirgi ${range} kun`} /><TrendChart data={data?.activityTrend ?? []} label="Faollik dinamikasi" /></section></div>
      <section className="admin-card"><CardHeading title="Faoliyat ko'rinishi" detail="Tanlangan davrda yaratilgan obyektlar" /><div className="admin-activity-grid">{[["Vazifalar", "tasks"], ["Eslatmalar", "reminders"], ["Uchrashuvlar", "meetings"], ["Izohlar", "notes"], ["Kontaktlar", "contacts"], ["Moliyaviy yozuvlar", "financeTransactions"], ["Yuklangan fayllar", "filesUploaded"]].map(([name, key]) => <div className="admin-activity-stat" key={key}><span>{name}</span><strong>{formatNumber(activity[key])}</strong></div>)}</div></section>
      <div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title="Ulanishlar" detail="Faqat umumiy statistika" /><div className="admin-mini-list"><MiniMetric icon={<Zap size={16} />} label="Telegram ulangan" value={kpis.telegramConnectedUsers} /><MiniMetric icon={<Globe2 size={16} />} label="Google ulangan" value={kpis.googleConnectedUsers} /><MiniMetric icon={<Bell size={16} />} label="Faol eslatmalar" value={kpis.activeReminders} /><MiniMetric icon={<Activity size={16} />} label="Yaqin uchrashuvlar" value={kpis.upcomingMeetings} /></div></section><section className="admin-card admin-card--accent"><div className="admin-card__eyebrow">OPERATSIYALAR</div><h3>Platformani shaffof va nazorat ostida tuting.</h3><p>Auditlar uchun faoliyat jurnalidan, kirishni boshqarish uchun foydalanuvchi amallaridan va kelajakdagi hisob-kitob tayyorgarligi uchun foydalanish ma'lumotlaridan foydalaning.</p><Link className="admin-button admin-button--ghost" to="/admin/activity">Faoliyat jurnalini ochish <ArrowLeft size={15} className="admin-flip" /></Link></section></div>
    </>}
  </div>;
};

const PageHeader = ({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) => <header className="admin-page-header"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</header>;
const CardHeading = ({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) => <div className="admin-card-heading"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{children}</div>;
const RangeSelector = ({ value, onChange }: { value: AdminRange; onChange: (value: AdminRange) => void }) => <div className="admin-segmented">{rangeOptions.map((option) => <button type="button" className={value === option ? "is-active" : ""} onClick={() => onChange(option)} key={option}>{option}k</button>)}</div>;
const MiniMetric = ({ icon, label, value }: { icon: ReactNode; label: string; value: number | undefined }) => <div className="admin-mini-metric"><span className="admin-mini-metric__icon">{icon}</span><span>{label}</span><strong>{formatNumber(value)}</strong></div>;

const UsersPage = () => {
  const [users, setUsers] = useState<AdminPageState<AdminUser> | null>(null); const [page, setPage] = useState(1); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [role, setRole] = useState(""); const [sort, setSort] = useState<"createdAt" | "lastActivity">("createdAt"); const [order, setOrder] = useState<"asc" | "desc">("desc"); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = () => { setLoading(true); setError(null); void adminApi.users({ page, search, status, role, sort, order }).then(setUsers).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [page, search, status, role, sort, order]);
  return <div className="admin-page admin-fade-in"><PageHeader eyebrow="KATALOG" title="Foydalanuvchilar" description="Platforma kirish huquqlarini, rollarni va foydalanuvchi faolligini boshqaring." /><section className="admin-card">
    <div className="admin-toolbar">
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput); }}><Search size={17} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Ism yoki email bo'yicha qidirish" /></form>
      <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}><option value="">Barcha rollar</option><option value="USER">Foydalanuvchi</option><option value="ADMIN">Administrator</option></select>
      <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">Barcha holatlar</option><option value="ACTIVE">Faol</option><option value="BLOCKED">Bloklangan</option></select>
      <select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as "createdAt" | "lastActivity"); }}><option value="createdAt">Ro'yxatdan o'tgan sana</option><option value="lastActivity">Oxirgi faollik</option></select>
      <button type="button" className="admin-sort-toggle" onClick={() => setOrder((value) => value === "asc" ? "desc" : "asc")} aria-label="Tartibni almashtirish" title={order === "asc" ? "O'sish tartibida" : "Kamayish tartibida"}><ArrowUpDown size={15} /></button>
    </div>
    {error ? <ErrorState error={error} retry={load} /> : loading && !users ? <Loading /> : <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Foydalanuvchi</th><th>Email</th><th>Rol</th><th>Holat</th><th>Ro'yxatdan o'tgan</th><th>Oxirgi faollik</th><th>Integratsiyalar</th><th /></tr></thead><tbody>{users?.items.map((user) => <tr key={user.id}>
      <td data-label="Foydalanuvchi"><Link className="admin-user-cell" to={`/admin/users/${user.id}`}><span className="admin-avatar">{initials(user)}</span><strong>{user.firstName} {user.lastName}</strong></Link></td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Rol"><span className={`admin-pill admin-pill--${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role] ?? user.role}</span></td>
      <td data-label="Holat"><span className={`admin-status admin-status--${user.status.toLowerCase()}`}><i />{STATUS_LABELS[user.status] ?? user.status}</span></td>
      <td data-label="Ro'yxatdan o'tgan">{formatDate(user.createdAt)}</td>
      <td data-label="Oxirgi faollik">{formatDate(user.lastActivity)}</td>
      <td data-label="Integratsiyalar"><span className="admin-integrations">{user.integrations?.telegram && "TG"}{user.integrations?.google && "G"}{!user.integrations?.telegram && !user.integrations?.google && "—"}</span></td>
      <td data-label=""><Link className="admin-table-link" to={`/admin/users/${user.id}`}>Batafsil</Link></td>
    </tr>)}</tbody></table></div>{!users?.items.length && <EmptyState title="Hech qanday foydalanuvchi topilmadi" text="Boshqa ism, email, rol yoki holatni tanlab ko'ring." />}<Pagination meta={users?.meta} page={page} onPage={setPage} /></>}
  </section></div>;
};
type AdminPageState<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

const UserDetailPage = ({ id }: { id: string }) => {
  const navigate = useNavigate(); const [user, setUser] = useState<AdminUserDetail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState<ConfirmState>(null);
  const load = () => { setLoading(true); setError(null); void adminApi.user(id).then(setUser).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [id]);
  const askStatus = (status: "ACTIVE" | "BLOCKED") => { if (!user) return; setConfirm({ title: status === "BLOCKED" ? "Foydalanuvchini bloklash" : "Blokdan chiqarish", description: `${user.email} ${status === "BLOCKED" ? "bloklansinmi" : "blokdan chiqarilsinmi"}?`, confirmLabel: status === "BLOCKED" ? "Bloklash" : "Blokdan chiqarish", tone: status === "BLOCKED" ? "danger" : "primary", onConfirm: () => { setSaving(true); void adminApi.status(id, status).then(load).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setSaving(false)); } }); };
  const askRole = (role: "USER" | "ADMIN") => { if (!user || role === user.role) return; setConfirm({ title: "Rolni o'zgartirish", description: `Ushbu foydalanuvchining roli "${ROLE_LABELS[role]}" ga o'zgartirilsinmi?`, confirmLabel: "O'zgartirish", tone: "primary", onConfirm: () => { setSaving(true); void adminApi.role(id, role).then(load).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setSaving(false)); } }); };
  if (loading && !user) return <div className="admin-page"><Loading /></div>; if (error && !user) return <div className="admin-page"><ErrorState error={error} retry={load} /></div>; if (!user) return null;
  return <div className="admin-page admin-fade-in">
    <button type="button" className="admin-back" onClick={() => navigate("/admin/users")}><ChevronLeft size={16} /> Foydalanuvchilarga qaytish</button>
    <PageHeader eyebrow="FOYDALANUVCHI TAFSILOTI" title={`${user.firstName} ${user.lastName}`} description={user.email} />
    <div className="admin-detail-grid">
      <section className="admin-card admin-profile"><span className="admin-card__eyebrow">PROFIL</span><div className="admin-profile__top"><span className="admin-avatar admin-avatar--large">{initials(user)}</span><div><h2>{user.firstName} {user.lastName}</h2><span>{user.email}</span></div></div><DetailRow label="Rol"><span className={`admin-pill admin-pill--${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role] ?? user.role}</span></DetailRow><DetailRow label="Holat"><span className={`admin-status admin-status--${user.status.toLowerCase()}`}><i />{STATUS_LABELS[user.status] ?? user.status}</span></DetailRow><DetailRow label="Ro'yxatdan o'tgan">{formatDate(user.createdAt)}</DetailRow><DetailRow label="Oxirgi faollik">{formatDate(user.lastActivity)}</DetailRow></section>
      <section className="admin-card"><span className="admin-card__eyebrow">FOYDALANISH</span><CardHeading title="Foydalanish ko'rinishi" detail="Ushbu foydalanuvchi uchun barcha vaqt bo'yicha hisob" /><div className="admin-detail-stats">{[["Vazifalar", "tasks"], ["Eslatmalar", "reminders"], ["Uchrashuvlar", "meetings"], ["Izohlar", "notes"], ["Kontaktlar", "contacts"], ["Moliyaviy yozuvlar", "financeTransactions"], ["Fayllar", "files"], ["AI so'rovlari", "aiRequests"]].map(([label, key]) => <div key={key}><span>{label}</span><strong>{formatNumber(user.usage[key])}</strong></div>)}</div></section>
    </div>
    <section className="admin-card admin-actions-card"><span className="admin-card__eyebrow">ADMIN AMALLARI</span><CardHeading title="Kirish va rolni boshqarish" detail="Har bir amal tasdiqlashni talab qiladi" /><div className="admin-actions-row"><div className="admin-actions-row__field"><label>Rolni o'zgartirish</label><select className="admin-inline-select" value={user.role} disabled={saving} onChange={(event) => askRole(event.target.value as "USER" | "ADMIN")}><option value="USER">Foydalanuvchi</option><option value="ADMIN">Administrator</option></select></div>{user.status === "BLOCKED" ? <button className="admin-button admin-button--success" disabled={saving} onClick={() => askStatus("ACTIVE")}><Check size={15} /> Blokdan chiqarish</button> : <button className="admin-button admin-button--danger" disabled={saving} onClick={() => askStatus("BLOCKED")}><X size={15} /> Bloklash</button>}</div></section>
    <div className="admin-detail-grid">
      <section className="admin-card"><span className="admin-card__eyebrow">INTEGRATSIYALAR</span><CardHeading title="Ulangan xizmatlar" detail="Faqat metama'lumot" /><div className="admin-connection-row"><span>Telegram</span><b className={user.integrations.telegram.connected ? "is-connected" : ""}>{user.integrations.telegram.connected ? "Ulangan" : CONNECTION_LABELS[user.integrations.telegram.status?.toLowerCase()] ?? "Ulanmagan"}</b></div><div className="admin-connection-row"><span>Google</span><b className={user.integrations.google.connected ? "is-connected" : ""}>{user.integrations.google.connected ? "Ulangan" : CONNECTION_LABELS[user.integrations.google.status?.toLowerCase()] ?? "Ulanmagan"}</b></div></section>
      <section className="admin-card"><span className="admin-card__eyebrow">XAVFSIZLIK</span><CardHeading title="Hisob xavfsizligi" detail="Nozik qiymatlar yashiringan" /><div className="admin-connection-row"><span>Holat</span><b className={user.status === "ACTIVE" ? "is-connected" : ""}>{STATUS_LABELS[user.status] ?? user.status}</b></div><div className="admin-connection-row"><span>Faol sessiyalar</span><b>{user.security.activeRefreshSessions}</b></div><div className="admin-connection-row"><span>Parolni tiklash so'rovlari</span><b>{user.security.passwordResetRequests}</b></div></section>
    </div>
    <section className="admin-card"><span className="admin-card__eyebrow">FAOLIYAT</span><CardHeading title="So'nggi faoliyat" detail="Nozik ma'lumotlar yashiringan" />{user.activity.length ? <div className="admin-timeline">{user.activity.map((item) => <div key={item.id}><i /><span><strong>{actionLabel(item.action)}</strong><small>{entityLabel(item.entityType)} · {formatDate(item.createdAt)}</small></span></div>)}</div> : <EmptyState title="So'nggi faoliyat yo'q" />}</section>
    <ConfirmDialog state={confirm} onCancel={() => setConfirm(null)} />
  </div>;
};
const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => <div className="admin-detail-row"><span>{label}</span><strong>{children}</strong></div>;

const DataPage = ({ kind }: { kind: "usage" | "integrations" | "notifications" | "files" | "system" | "settings" }) => {
  const [range, setRange] = useState<AdminRange>(30); const [data, setData] = useState<any>(null); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = () => { setLoading(true); setError(null); const call = kind === "usage" ? adminApi.usage(range) : kind === "integrations" ? adminApi.integrations() : kind === "notifications" ? adminApi.notifications(range) : kind === "files" ? adminApi.files(page) : kind === "system" ? adminApi.system() : adminApi.settings(); void call.then(setData).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [kind, range, page]);
  const meta = data?.meta;
  if (error && !data) return <div className="admin-page"><PageHeader eyebrow={eyebrowFor(kind)} title={titleFor(kind)} description={descriptionFor(kind)} /><ErrorState error={error} retry={load} /></div>;
  return <div className="admin-page admin-fade-in"><PageHeader eyebrow={eyebrowFor(kind)} title={titleFor(kind)} description={descriptionFor(kind)}>{["usage", "notifications"].includes(kind) && <RangeSelector value={range} onChange={setRange} />}</PageHeader>{loading && !data ? <Loading /> : <>{kind === "usage" && <UsageView data={data} />} {kind === "integrations" && <IntegrationsView data={data} />} {kind === "notifications" && <NotificationsView data={data} />} {kind === "files" && <FilesView data={data} />} {kind === "system" && <SystemView data={data} />} {kind === "settings" && <SettingsView data={data} />}{meta && <Pagination meta={meta} page={page} onPage={setPage} />}</>}</div>;
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const ActivityPage = () => {
  const [items, setItems] = useState<AdminActivity | null>(null);
  const [page, setPage] = useState(1);
  const [userIdInput, setUserIdInput] = useState(""); const [userId, setUserId] = useState("");
  const [action, setAction] = useState(""); const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const validUserId = !userIdInput || isUuid(userIdInput);
  const load = () => { setLoading(true); setError(null); void adminApi.activity({ page, userId, action, entityType, from, to: to ? `${to}T23:59:59.999Z` : "" }).then(setItems).catch((reason: unknown) => setError(getApiErrorMessage(reason))).finally(() => setLoading(false)); };
  useEffect(load, [page, userId, action, entityType, from, to]);
  return <div className="admin-page admin-fade-in"><PageHeader eyebrow="AUDIT JURNALI" title="Faoliyat jurnali" description="Auditlanadigan amallar; nozik qiymatlar ataylab yashiringan." />
    <section className="admin-card admin-activity-filters">
      <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); if (validUserId) { setPage(1); setUserId(userIdInput); } }}>
        <div className="admin-search"><Search size={17} /><input value={userIdInput} onChange={(event) => setUserIdInput(event.target.value)} placeholder="Foydalanuvchi ID (UUID)" /></div>
        <input className="admin-toolbar-input" value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }} placeholder="Amal turi (masalan, LOGIN)" />
        <input className="admin-toolbar-input" value={entityType} onChange={(event) => { setPage(1); setEntityType(event.target.value); }} placeholder="Obyekt turi (masalan, USER)" />
        <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} aria-label="Sanadan" />
        <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} aria-label="Sanagacha" />
        <button type="submit" className="admin-button admin-button--ghost" disabled={!validUserId}>Qidirish</button>
      </form>
      {!validUserId && <p className="admin-field-hint">Foydalanuvchi ID UUID formatida bo'lishi kerak (masalan, 3fa85f64-5717-4562-b3fc-2c963f66afa6).</p>}
    </section>
    {error ? <ErrorState error={error} retry={load} /> : loading && !items ? <Loading /> : <><ActivityView data={items!} /><Pagination meta={items?.meta} page={page} onPage={setPage} /></>}
  </div>;
};
const SECTION_TITLES: Record<string, string> = { overview: "Umumiy ko'rinish", users: "Foydalanuvchilar", user: "Foydalanuvchi tafsiloti", usage: "Foydalanish", integrations: "Integratsiyalar", notifications: "Bildirishnomalar", files: "Fayllar", activity: "Faoliyat jurnali", system: "Tizim holati", settings: "Sozlamalar" };
const titleFor = (kind: string) => SECTION_TITLES[kind] ?? "Admin";
const SECTION_EYEBROWS: Record<string, string> = { usage: "FOYDALANISH STATISTIKASI", integrations: "INTEGRATSIYALAR", notifications: "BILDIRISHNOMALAR", files: "FAYLLAR", system: "TIZIM HOLATI", settings: "SOZLAMALAR" };
const eyebrowFor = (kind: string) => SECTION_EYEBROWS[kind] ?? titleFor(kind).toUpperCase();
const SECTION_DESCRIPTIONS: Record<string, string> = {
  usage: "Foydalanish AiUsage yozuvlaridan hisoblanadi. Hech qanday taxminiy qiymat qo'shilmaydi.",
  integrations: "Maxfiy ma'lumot yoki tokenlarsiz ulanish holati.",
  notifications: "Yetkazib berish holati, xatolar va xavfsiz umumiy monitoring.",
  files: "Faqat metama'lumot va saqlash hajmi; asl kontent maxfiy qoladi.",
  system: "Qulay AI platformasi uchun operatsion signallar.",
  settings: "Real backend ma'lumotlariga asoslangan xavfsiz platforma sozlamalari.",
};
const descriptionFor = (kind: string) => SECTION_DESCRIPTIONS[kind] ?? "";

const UsageView = ({ data }: { data: AdminUsage }) => <><div className="admin-kpi-grid admin-kpi-grid--compact"><KpiCard label="Jami so'rovlar" value={data?.totals?.requests} icon={Bot} /><KpiCard label="Matn so'rovlari" value={data?.totals?.text?.requests} icon={BarChart3} accent="blue" /><KpiCard label="Vosita ishlatilishi" value={data?.totals?.tool?.requests} icon={Zap} accent="green" /></div><div className="admin-grid admin-grid--charts"><section className="admin-card"><CardHeading title="Foydalanish dinamikasi" detail="Haqiqiy AiUsage qatorlari" /><TrendChart data={data?.trend ?? []} label="Foydalanish dinamikasi" /></section><section className="admin-card"><CardHeading title="Provayder holati" /><div className="admin-provider-state"><Bot size={26} /><strong>{data?.provider?.status === "configured" ? "Provayder ulangan" : "OpenAI hali ulanmagan"}</strong><span>Bazada qayd etilgan qiymat bo'lmaganda token va xarajat ko'rsatkichlari nolga teng bo'lib qoladi.</span></div></section></div><section className="admin-card"><CardHeading title="Faol foydalanuvchilar" detail="Tanlangan davr" />{data?.byUser?.length ? <div className="admin-simple-list">{data.byUser.map((row) => <div key={row.user.id}><span className="admin-avatar">{initials(row.user)}</span><span><strong>{row.user.firstName} {row.user.lastName}</strong><small>{row.user.email}</small></span><b>{formatNumber(row.requests)} so'rov</b></div>)}</div> : <EmptyState title="AI foydalanish qayd etilmagan" text="Bu neytral holat — soxta foydalanish ko'rsatilmaydi." />}</section></>;
const IntegrationsView = ({ data }: { data: AdminIntegrations }) => <div className="admin-grid admin-grid--secondary"><ConnectionCard label="Telegram" data={data?.telegram} icon={<Zap size={21} />} /><ConnectionCard label="Google" data={data?.google} icon={<Globe2 size={21} />} /></div>;
const ConnectionCard = ({ label, data, icon }: { label: string; data: AdminConnectionCounts | undefined; icon: ReactNode }) => <section className="admin-card"><div className="admin-connection-heading"><span className="admin-kpi__icon">{icon}</span><div><h2>{label}</h2><span>Umumiy tizim statistikasi</span></div></div><div className="admin-status-grid">{(["connected", "disconnected", "error"] as const).map((key) => <div key={key}><span>{CONNECTION_LABELS[key]}</span><strong>{formatNumber(data?.[key])}</strong></div>)}</div></section>;
const NotificationsView = ({ data }: { data: AdminNotifications }) => <><section className="admin-card"><CardHeading title="Yetkazib berish holati" detail="Tanlangan davr" /><div className="admin-status-grid admin-status-grid--wide">{Object.entries(data?.totals ?? {}).map(([key, value]) => <div key={key}><span>{NOTIFICATION_TOTAL_LABELS[key] ?? key}</span><strong>{formatNumber(value)}</strong></div>)}</div></section><section className="admin-card"><CardHeading title="So'nggi muvaffaqiyatsiz bildirishnomalar" detail="Kontent yashiringan" />{data?.failed?.length ? <div className="admin-simple-list">{data.failed.map((row) => <div key={row.id}><span className="admin-status admin-status--blocked"><i />XATO</span><span><strong>{row.type} · {row.channel}</strong><small>{row.user?.email} · {formatDate(row.failedAt ?? row.createdAt)}</small></span><b>{row.retryCount} marta qayta urinildi</b></div>)}</div> : <EmptyState title="Muvaffaqiyatsiz bildirishnoma yo'q" />}</section></>;
const FilesView = ({ data }: { data: AdminFiles }) => <><section className="admin-card"><CardHeading title="Saqlash hajmi" detail="O'chirilgan yozuvlar hisobga olinmagan" /><div className="admin-status-grid admin-status-grid--wide">{[["Jami fayllar", formatNumber(data?.stats?.total)], ["Jami hajm", formatBytes(data?.stats?.totalSizeBytes)], ["Rasmlar", formatNumber(data?.stats?.images)], ["PDF", formatNumber(data?.stats?.pdfs)], ["Hujjatlar", formatNumber(data?.stats?.docs)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section><div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title="Saqlash provayderi" /><div className="admin-status-grid">{["local", "s3"].map((key) => <div key={key}><span>{key === "local" ? "Lokal" : "Amazon S3"}</span><strong>{formatNumber(data?.stats?.storage?.[key])}</strong></div>)}</div></section><section className="admin-card"><CardHeading title="Manba bo'yicha" /><div className="admin-status-grid">{Object.keys(SOURCE_LABELS).map((key) => <div key={key}><span>{SOURCE_LABELS[key]}</span><strong>{formatNumber(data?.stats?.sources?.[key])}</strong></div>)}</div></section></div><section className="admin-card"><CardHeading title="So'nggi fayllar" detail="Faqat metama'lumot" />{data?.items?.length ? <div className="admin-simple-list">{data.items.map((row) => <div key={row.id}><span className="admin-file-icon"><FileText size={17} /></span><span><strong>{row.originalName}</strong><small>{row.owner?.email} · {row.mimeType} · {SOURCE_LABELS[row.source?.toLowerCase()] ?? row.source}</small></span><b>{formatBytes(row.sizeBytes)}</b></div>)}</div> : <EmptyState title="Hech qanday fayl yuklanmagan" />}</section></>;
const ActivityView = ({ data }: { data: AdminActivity }) => <section className="admin-card"><CardHeading title="Audit izi" detail="Nozik qiymatlar yashiringan" />{data?.items?.length ? <div className="admin-simple-list">{data.items.map((row) => <div key={row.id}><span className="admin-avatar">{initials(row.user)}</span><span><strong>{actionLabel(row.action)}</strong><small>{row.user?.email} · {entityLabel(row.entity?.type)} · {formatDate(row.time)}</small></span><b>{row.source === "AI_TOOL" ? "AI vositasi" : "Ilova"}</b></div>)}</div> : <EmptyState title="Faoliyat qayd etilmagan" />}</section>;
const SystemView = ({ data }: { data: AdminSystem }) => <div className="admin-grid admin-grid--secondary"><section className="admin-card"><CardHeading title="Ishlash vaqti ma'lumotlari" /><div className="admin-health-list">{[["API", HEALTH_LABELS[data?.api?.status] ?? data?.api?.status, data?.api?.status === "ok"], ["Ma'lumotlar bazasi", HEALTH_LABELS[data?.database?.status] ?? data?.database?.status, data?.database?.status === "ok"], ["Baza kechikishi", `${formatNumber(data?.database?.latencyMs)} ms`, true], ["Bildirishnoma workeri", HEALTH_LABELS[data?.notificationWorker?.status] ?? data?.notificationWorker?.status, data?.notificationWorker?.status === "running"], ["Muhit", ENV_LABELS[data?.environment] ?? data?.environment, true], ["Ishlash vaqti", formatUptime(data?.uptimeSeconds), true], ["Migratsiyalar", "Prisma orqali boshqariladi", true]].map(([label, value, healthy]) => <div key={label as string}><span>{label}</span><b className={healthy ? "is-healthy" : ""}>{String(value ?? "—")}</b></div>)}</div></section><section className="admin-card"><CardHeading title="Integratsiya holati" detail="Hech qanday ma'lumot ochilmaydi" /><ConnectionCard label="Telegram" data={data?.integrations?.telegram} icon={<Zap size={21} />} /><ConnectionCard label="Google" data={data?.integrations?.google} icon={<Globe2 size={21} />} /></section></div>;

const SettingsRow = ({ label, value, healthy }: { label: string; value: ReactNode; healthy?: boolean }) => <div><span>{label}</span><b className={healthy ? "is-healthy" : ""}>{value}</b></div>;
const SettingsMissing = () => <div className="admin-settings-missing">Ma'lumot mavjud emas.</div>;
const SettingsSection = ({ title, detail, missing, children }: { title: string; detail: string; missing: boolean; children: ReactNode }) => <section className="admin-card"><CardHeading title={title} detail={detail} />{missing ? <SettingsMissing /> : <div className="admin-health-list">{children}</div>}</section>;
export const SettingsView = ({ data }: { data: NormalizedAdminSettings | null }) => {
  if (!data) return null;
  const { data: settings, missingSections } = data;
  const isMissing = (section: AdminSettingsSection) => missingSections.includes(section);
  return <div className="admin-grid admin-grid--settings">
    <section className="admin-card"><CardHeading title="Platforma sozlamalari" detail="Asosiy platforma konfiguratsiyasi" /><div className="admin-health-list">
      <SettingsRow label="Platforma nomi" value={settings.platform.name || "Qulay AI"} />
      {isMissing("platform") ? <SettingsMissing /> : <>
        <SettingsRow label="Standart foydalanuvchi holati" value={STATUS_LABELS[settings.platform.defaultUserStatus] ?? settings.platform.defaultUserStatus} />
        <SettingsRow label="Ro'yxatdan o'tish" value={settings.platform.registrationEnabled ? "Yoqilgan" : "O'chirilgan"} healthy={settings.platform.registrationEnabled} />
        <SettingsRow label="Texnik profilaktika rejimi" value={settings.platform.maintenanceMode ? "Yoqilgan" : "O'chirilgan (asos qo'yilgan)"} healthy={!settings.platform.maintenanceMode} />
      </>}
    </div></section>
    <SettingsSection title="Xavfsizlik" detail="Real, hozirda amal qiluvchi qiymatlar" missing={isMissing("security")}>
      <SettingsRow label="Access token muddati" value={settings.security.accessTokenExpiresIn} />
      <SettingsRow label="Refresh token muddati" value={settings.security.refreshTokenExpiresIn} />
      <SettingsRow label="Login urinishlari (IP)" value={`${settings.security.rateLimits.loginPerIp.max} / ${settings.security.rateLimits.loginPerIp.windowMinutes} daqiqa`} />
      <SettingsRow label="Login urinishlari (email)" value={`${settings.security.rateLimits.loginPerEmail.max} / ${settings.security.rateLimits.loginPerEmail.windowMinutes} daqiqa`} />
      <SettingsRow label="Ro'yxatdan o'tish urinishlari" value={`${settings.security.rateLimits.registerPerIp.max} / ${settings.security.rateLimits.registerPerIp.windowMinutes} daqiqa (IP)`} />
      <SettingsRow label="Parolni tiklash urinishlari" value={`${settings.security.rateLimits.passwordReset.max} / ${settings.security.rateLimits.passwordReset.windowMinutes} daqiqa`} />
      <SettingsRow label="Umumiy so'rov chegarasi" value={`${settings.security.rateLimits.globalPerIp.max} / ${settings.security.rateLimits.globalPerIp.windowSeconds} soniya (IP)`} />
      <SettingsRow label="Login qo'pol kuch himoyasi" value={`${settings.security.loginBruteForce.maxFailures} xato → ${settings.security.loginBruteForce.lockMinutes} daqiqa bloklash`} />
    </SettingsSection>
    <SettingsSection title="Bildirishnomalar" detail="Worker konfiguratsiyasi" missing={isMissing("notifications")}>
      <SettingsRow label="Worker holati" value={HEALTH_LABELS[settings.notifications.workerStatus] ?? settings.notifications.workerStatus} healthy={settings.notifications.workerStatus === "running"} />
      <SettingsRow label="Tekshirish oralig'i" value={`${settings.notifications.intervalSeconds} soniya`} />
      <SettingsRow label="Partiya hajmi" value={settings.notifications.batchSize} />
      <SettingsRow label="Qayta urinish chegarasi" value={settings.notifications.retryLimit} />
    </SettingsSection>
    <SettingsSection title="Integratsiyalar" detail="Sozlangan/sozlanmagan holat, sirlarsiz" missing={isMissing("integrations")}>
      <SettingsRow label="Telegram" value={settings.integrations.telegram.configured ? "Sozlangan" : "Sozlanmagan"} healthy={settings.integrations.telegram.configured} />
      <SettingsRow label="Google" value={settings.integrations.google.configured ? "Sozlangan" : "Sozlanmagan"} healthy={settings.integrations.google.configured} />
      <SettingsRow label="OpenAI" value={settings.integrations.openai.configured ? "Sozlangan" : "Sozlanmagan"} healthy={settings.integrations.openai.configured} />
    </SettingsSection>
    <section className="admin-card"><CardHeading title="Saqlash joyi" detail="Fayl saqlash konfiguratsiyasi" />{isMissing("storage") ? <SettingsMissing /> : <><div className="admin-health-list">
      <SettingsRow label="Joriy provayder" value={STORAGE_PROVIDER_LABELS[settings.storage.provider] ?? settings.storage.provider} />
      <SettingsRow label="Fayl hajmi chegarasi" value={formatBytes(settings.storage.maxFileSizeBytes)} />
    </div>{settings.storage.localWarning && <div className="admin-settings-warning">{settings.storage.localWarning}</div>}</>}</section>
    <SettingsSection title="Tizim" detail="Muhit va backend holati" missing={isMissing("system")}>
      <SettingsRow label="Muhit" value={ENV_LABELS[settings.system.environment] ?? settings.system.environment} />
      <SettingsRow label="Versiya" value={settings.system.version ?? "Noma'lum"} />
      <SettingsRow label="Backend holati" value={HEALTH_LABELS[settings.system.api.status] ?? settings.system.api.status} healthy={settings.system.api.status === "ok"} />
      <SettingsRow label="Ma'lumotlar bazasi holati" value={HEALTH_LABELS[settings.system.database.status] ?? settings.system.database.status} healthy={settings.system.database.status === "ok"} />
    </SettingsSection>
  </div>;
};

const Pagination = ({ meta, page, onPage }: { meta?: { page: number; total: number; totalPages: number }; page: number; onPage: (page: number) => void }) => !meta || !meta.totalPages ? null : <div className="admin-pagination"><span>{formatNumber(meta.total)} ta yozuv</span><div><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button><strong>{page} / {meta.totalPages}</strong><button type="button" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button></div></div>;

const AdminConsole = () => {
  const location = useLocation(); const navigate = useNavigate(); const { user, logout } = useAuth(); const [theme, setTheme] = useState(document.documentElement.dataset.theme === "dark"); const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { if (user?.role !== "ADMIN") navigate("/admin/login", { replace: true, state: { accessDenied: true } }); }, [user, navigate]);
  if (!user || user.role !== "ADMIN") return null;
  const path = location.pathname; const detailMatch = path.match(/^\/admin\/users\/([^/]+)/); const section = detailMatch ? "user" : path === "/admin" ? "overview" : path.split("/")[2] ?? "overview";
  const content = section === "overview" ? <AdminOverviewPage /> : section === "users" && !detailMatch ? <UsersPage /> : section === "user" && detailMatch ? <UserDetailPage id={detailMatch[1]} key={detailMatch[1]} /> : section === "activity" ? <ActivityPage key={section} /> : ["usage", "integrations", "notifications", "files", "system", "settings"].includes(section) ? <DataPage kind={section as "usage"} key={section} /> : <AdminOverviewPage />;
  const toggleTheme = () => { const next = !theme; document.documentElement.dataset.theme = next ? "dark" : "light"; setTheme(next); };
  return <div className="admin-console"><aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}><div className="admin-brand"><span className="admin-brand__mark">Q</span><div><strong>Qulay AI</strong><small>Administrator paneli</small></div><button className="admin-mobile-close" type="button" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><nav>{navItems.map(({ label, path: itemPath, icon: Icon, exact }) => <Link key={itemPath} onClick={() => setMobileOpen(false)} className={`admin-nav-item ${exact ? path === itemPath : path.startsWith(itemPath) ? "is-active" : ""}`} to={itemPath}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="admin-sidebar__bottom"><Link className="admin-back-app" to="/dashboard"><ArrowLeft size={15} /> Asosiy ilovaga qaytish</Link><div className="admin-sidebar__user"><span className="admin-avatar">{initials(user)}</span><span><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></span><button type="button" aria-label="Chiqish" title="Chiqish" onClick={() => { void logout().then(() => navigate("/login")); }}><LogOut size={15} /></button></div></div></aside><main className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" type="button" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="admin-breadcrumb"><span>Qulay AI</span><b>/</b><strong>{titleFor(section)}</strong></div><div className="admin-topbar__actions"><button type="button" className="admin-icon-button" onClick={toggleTheme} aria-label="Mavzuni almashtirish">{theme ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>{content}</main></div>;
};
export default AdminConsole;
