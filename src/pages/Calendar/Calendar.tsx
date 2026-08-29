import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { getDateKey } from "../../services/dateUtils";
import {
  createMeeting as createMeetingRecord,
  deleteMeeting,
  getCalendarEvents,
  loadCalendarEvents,
  updateMeeting,
} from "../../services/meetingService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { CalendarEvent } from "../../types/workspace";
import { useI18n } from "../../i18n/useI18n";

import "./Calendar.scss";

const uzWeekDays = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const uzMonthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const ruWeekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const ruMonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>(getCalendarEvents);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(getDateKey(today));
  const [newTime, setNewTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");
  const [newParticipant, setNewParticipant] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newReminder, setNewReminder] = useState("15 daqiqa oldin");
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const savingRef = useRef(false);
  const { showToast } = useToast();
  const { t, locale } = useI18n();
  const weekDays = locale === "ru" ? ruWeekDays : uzWeekDays;
  const monthNames = locale === "ru" ? ruMonthNames : uzMonthNames;

  useEffect(() => subscribeToWorkspaceData("calendarEvents", () => setEvents(getCalendarEvents())), []);
  useEffect(() => { void loadCalendarEvents().catch(() => showToast("Uchrashuvlarni yuklab bo'lmadi", "error")); }, [showToast]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirst = firstDay === 0 ? 6 : firstDay - 1;
  const calendarDays: Array<number | null> = [
    ...Array.from({ length: mondayFirst }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const selectedDateKey = getDateKey(new Date(year, month, selectedDay));
  const selectDate = (dateKey: string) => {
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return;
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDay(date.getDate());
    setNewDate(dateKey);
  };
  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDateKey).sort((a, b) => a.time.localeCompare(b.time)),
    [events, selectedDateKey],
  );
  const todayEvents = events.filter((event) => event.date === getDateKey());
  const currentTime = new Date().toTimeString().slice(0, 5);
  const nextEvent = [...todayEvents]
    .sort((a, b) => a.time.localeCompare(b.time))
    .find((event) => event.time >= currentTime) ?? [...todayEvents].sort((a, b) => a.time.localeCompare(b.time))[0];

  const resetForm = () => {
    setEditId(null);
    setNewTitle("");
    setNewDate(selectedDateKey);
    setNewTime("10:00");
    setNewEndTime("11:00");
    setNewParticipant("");
    setNewDescription("");
    setNewLocation("");
    setNewReminder("15 daqiqa oldin");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    openCreateModal();
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const openEditModal = (event: CalendarEvent) => {
    setEditId(event.id);
    setNewTitle(event.title);
    setNewDate(event.date);
    setNewTime(event.time);
    setNewEndTime(event.endTime ?? (() => { const [h, m] = event.time.split(":").map(Number); return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; })());
    setNewParticipant(event.participant ?? "");
    setNewDescription(event.description ?? "");
    setNewLocation(event.location ?? "");
    setNewReminder(event.reminder ?? "15 daqiqa oldin");
    setShowModal(true);
  };

  const minutes = (value: string) => { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; };
  const hasTimeConflict = () => events.some((event) => {
    if (event.id === editId || event.date !== newDate) return false;
    const eventStart = minutes(event.time);
    const eventEnd = event.endTime ? minutes(event.endTime) : eventStart + 60;
    const nextStart = minutes(newTime);
    const nextEnd = minutes(newEndTime);
    return nextStart < eventEnd && nextEnd > eventStart;
  });

  const selectedDate = new Date(`${selectedDateKey}T12:00:00`);
  const monday = new Date(selectedDate);
  monday.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const agendaDates = view === "day" ? [selectedDate] : weekDates;

  const saveMeeting = async () => {
    if (!newTitle.trim()) {
      showToast("Uchrashuv nomini kiriting", "error");
      return;
    }
    if (!newDate || !newTime || !newEndTime || savingRef.current) {
      if (!newDate || !newTime || !newEndTime) showToast("Sana va vaqtni tanlang", "error");
      return;
    }
    if (minutes(newEndTime) <= minutes(newTime)) { showToast("Tugash vaqti boshlanish vaqtidan keyin bo'lsin", "error"); return; }
    if (hasTimeConflict()) { showToast("Bu vaqtda boshqa uchrashuv bor. Vaqtni o'zgartiring.", "error"); return; }
    savingRef.current = true;
    const payload = {
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      endTime: newEndTime,
      type: "meeting" as const,
      participant: newParticipant.trim() || undefined,
      description: newDescription.trim() || undefined,
      location: newLocation.trim() || undefined,
      reminder: newReminder || undefined,
    };
    try {
      if (editId !== null) {
      const saved = await updateMeeting(editId, payload);
      showToast(saved.googleSyncError ? `Uchrashuv yangilandi, lekin Google sync xatosi: ${saved.googleSyncError}` : "Uchrashuv yangilandi", saved.googleSyncError ? "error" : "success");
    } else {
      const saved = await createMeetingRecord(payload);
      showToast(saved.googleSyncError ? `Uchrashuv saqlandi, lekin Google sync xatosi: ${saved.googleSyncError}` : "Uchrashuv kalendarga qo‘shildi", saved.googleSyncError ? "error" : "success");
      }
      setEvents(getCalendarEvents());
      closeModal();
    } catch {
      showToast("Uchrashuvni saqlab bo'lmadi", "error");
    } finally {
      savingRef.current = false;
    }
  };

  const removeMeeting = (event: CalendarEvent) => {
    setPendingDelete(event);
  };

  const confirmRemoveMeeting = async () => {
    if (!pendingDelete) return;

    const event = pendingDelete;
    let result: Awaited<ReturnType<typeof deleteMeeting>>;
    try { result = await deleteMeeting(event.id); } catch { showToast("Uchrashuvni o'chirib bo'lmadi", "error"); return; }
    setEvents(getCalendarEvents());
    setPendingDelete(null);
    showToast(result.googleSync.synced ? "Uchrashuv o‘chirildi" : `Uchrashuv o‘chirildi, lekin Google sync xatosi: ${result.googleSync.errorCode}`, result.googleSync.synced ? "success" : "error");
  };

  const setMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDay(1);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  return (
    <main className="calendar-page">
      <header className="calendar-page__header">
        <div>
          <span className="calendar-page__eyebrow">YOUR SCHEDULE</span>
          <h1>{t("calendar.title", "Kalendar")}</h1>
          <p>{t("calendar.subtitle", "Uchrashuvlar va kunlik rejalaringizni boshqaring.")}</p>
        </div>
        <button type="button" className="calendar-page__add" onClick={openCreateModal}><Plus size={15} />{t("calendar.new", "Yangi uchrashuv")}</button>
      </header>

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-card__top">
            <div className="calendar-card__month">
              <button type="button" onClick={() => setMonth(-1)} aria-label="Oldingi oy"><ChevronLeft size={17} /></button>
              <h2>{monthNames[month]} {year}</h2>
              <button type="button" onClick={() => setMonth(1)} aria-label="Keyingi oy"><ChevronRight size={17} /></button>
            </div>
            <div className="calendar-view-switch" role="group" aria-label="Kalendar ko'rinishi"><button type="button" className={view === "month" ? "is-active" : ""} onClick={() => setView("month")}>{t("calendar.month", "Oy")}</button><button type="button" className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>{t("calendar.week", "Hafta")}</button><button type="button" className={view === "day" ? "is-active" : ""} onClick={() => setView("day")}>{t("calendar.day", "Kun")}</button></div>
            <button type="button" className="calendar-card__today" onClick={goToday}>{t("calendar.today", "Bugun")}</button>
          </div>
          {view === "month" ? (
            <div className="calendar-grid">
              {weekDays.map((day) => <div className="calendar-grid__weekday" key={day}>{day}</div>)}
              {calendarDays.map((day, index) => {
                const dateKey = day ? getDateKey(new Date(year, month, day)) : "";
                const dayEvents = day ? events.filter((event) => event.date === dateKey) : [];
                const isToday = dateKey === getDateKey();
                return (
                  <button type="button" key={`${day}-${index}`} disabled={!day} className={["calendar-day", day === selectedDay ? "calendar-day--selected" : "", isToday ? "calendar-day--today" : "", dayEvents.length ? "calendar-day--event" : ""].join(" ")} onClick={() => { if (day) selectDate(dateKey); }}>
                    {day && <><span>{day}</span>{dayEvents.length > 0 && <><b className="calendar-day__count">{dayEvents.length}</b><small className="calendar-day__preview">{dayEvents[0].time} · {dayEvents[0].title}</small></>}</>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`calendar-agenda calendar-agenda--${view}`}>
              {agendaDates.map((date) => {
                const key = getDateKey(date);
                const dayEvents = events.filter((event) => event.date === key).sort((a, b) => a.time.localeCompare(b.time));
                return <section className="calendar-agenda__day" key={key}><button type="button" className={`calendar-agenda__date ${key === selectedDateKey ? "is-active" : ""}`} onClick={() => selectDate(key)}><strong>{weekDays[(date.getDay() + 6) % 7]}</strong><span>{date.getDate()}</span></button><div className="calendar-agenda__events">{dayEvents.length ? dayEvents.map((event) => <button type="button" className="calendar-agenda__event" key={event.id} onClick={() => openEditModal(event)}><time>{event.time}{event.endTime ? `–${event.endTime}` : ""}</time><span><strong>{event.title}</strong>{event.participant && <small>{event.participant}</small>}{event.location && <small>{event.location}</small>}</span></button>) : <span className="calendar-agenda__empty">{locale === "ru" ? "Нет событий" : "Reja yo'q"}</span>}</div></section>;
              })}
            </div>
          )}
        </section>

        <aside className="calendar-sidebar">
          <div className="calendar-sidebar__header">
            <div><span>{locale === "ru" ? "ВЫБРАННЫЙ ДЕНЬ" : "SELECTED DAY"}</span><h2>{selectedDay} {monthNames[month]}</h2></div>
            <div className="calendar-sidebar__icon"><CalendarDays size={17} /></div>
          </div>
          <div className="calendar-events">
            {selectedEvents.map((event) => (
              <article className={`calendar-event calendar-event--${event.type}`} key={event.id}>
                <div className="calendar-event__time"><Clock3 size={11} />{event.time}</div>
                <div className="calendar-event__body">
                  <strong>{event.title}</strong>
                  {event.participant && <span><UserRound size={10} />{event.participant}</span>}
                  {event.location && <span><MapPin size={10} />{event.location}</span>}
                  {event.description && <small>{event.description}</small>}
                  {event.reminder && <small>{locale === "ru" ? "Напоминание" : "Eslatma"}: {event.reminder}</small>}
                </div>
                <div className="calendar-event__actions">
                  <button type="button" onClick={() => openEditModal(event)} aria-label="Uchrashuvni tahrirlash"><Pencil size={12} /></button>
                  <button type="button" onClick={() => removeMeeting(event)} aria-label="Uchrashuvni o‘chirish"><Trash2 size={12} /></button>
                  {event.type === "meeting" && <Video size={13} />}
                </div>
              </article>
            ))}
            {selectedEvents.length === 0 && (
              <div className="calendar-events__empty">
                <CalendarDays size={22} />
                <strong>{locale === "ru" ? "Нет событий" : "Event yo‘q"}</strong>
                <span>{t("calendar.emptyDay", "Tanlangan kun uchun hali uchrashuv belgilanmagan.")}</span>
              </div>
            )}
          </div>
          <button type="button" className="calendar-sidebar__button" onClick={openCreateModal}><Plus size={14} />{locale === "ru" ? "Добавить событие" : "Event qo‘shish"}</button>
        </aside>
      </div>

      <section className="calendar-summary">
        <div className="calendar-summary__icon"><Clock3 size={17} /></div>
        <div><span>{t("calendar.todayPlan", "BUGUNGI REJA")}</span><h2>{locale === "ru" ? `Сегодня у вас ${todayEvents.length} событий` : `Sizda bugun ${todayEvents.length} ta reja bor`}</h2><p>{nextEvent ? (locale === "ru" ? `Следующая встреча в ${nextEvent.time}.` : `Keyingi uchrashuv ${nextEvent.time} da.`) : (locale === "ru" ? "На сегодня встреч нет." : "Bugun uchun uchrashuv belgilanmagan.")}</p></div>
      </section>

      {showModal && (
        <div className="calendar-modal__overlay" onClick={closeModal}>
          <div className="calendar-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="calendar-modal__close" onClick={closeModal} aria-label="Uchrashuv oynasini yopish"><X size={17} /></button>
            <div className="calendar-modal__icon"><CalendarDays size={21} /></div>
            <span className="calendar-modal__eyebrow">{editId !== null ? "EDIT EVENT" : "NEW EVENT"}</span>
            <h2>{editId !== null ? t("calendar.edit", "Uchrashuvni tahrirlash") : t("calendar.new", "Yangi uchrashuv")}</h2>
            <p>Event ma’lumotlarini kiriting.</p>
            <input type="text" placeholder={t("calendar.name", "Uchrashuv nomi")} aria-label="Uchrashuv nomi" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            <input type="date" aria-label="Uchrashuv sanasi" value={newDate} onChange={(event) => selectDate(event.target.value)} />
            <div className="calendar-modal__row"><label>Boshlanish<input type="time" aria-label="Boshlanish vaqti" value={newTime} onChange={(event) => setNewTime(event.target.value)} /></label><label>Tugash<input type="time" aria-label="Tugash vaqti" value={newEndTime} onChange={(event) => setNewEndTime(event.target.value)} /></label></div>
            <input type="text" placeholder={t("calendar.participant", "Ishtirokchi")} aria-label="Ishtirokchi" value={newParticipant} onChange={(event) => setNewParticipant(event.target.value)} />
            <input type="text" placeholder={t("calendar.location", "Joy yoki manzil")} aria-label="Joy yoki manzil" value={newLocation} onChange={(event) => setNewLocation(event.target.value)} />
            <textarea rows={3} placeholder={t("calendar.description", "Tavsif")} aria-label="Uchrashuv tavsifi" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
            <select aria-label="Uchrashuv eslatmasi" value={newReminder} onChange={(event) => setNewReminder(event.target.value)}><option value="15 daqiqa oldin">15 daqiqa oldin</option><option value="1 soat oldin">1 soat oldin</option><option value="">{t("calendar.noReminder", "Eslatmasin")}</option></select>
            <button type="button" className="calendar-modal__submit" onClick={saveMeeting}>{editId !== null ? <><Check size={15} />{t("calendar.save", "Saqlash")}</> : <><Plus size={15} />{t("calendar.createEvent", "Event yaratish")}</>}</button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Uchrashuvni o'chirish"
          description={`"${pendingDelete.title}" uchrashuvini o'chirishni tasdiqlaysizmi?`}
          confirmLabel="O'chirish"
          onConfirm={confirmRemoveMeeting}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
};

export default Calendar;
