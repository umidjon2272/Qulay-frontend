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

import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { getDateKey } from "../../services/dateUtils";
import {
  createMeeting as createMeetingRecord,
  deleteMeeting,
  getCalendarEvents,
  updateMeeting,
} from "../../services/meetingService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { CalendarEvent } from "../../types/workspace";

import "./Calendar.scss";

const weekDays = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

const Calendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>(getCalendarEvents);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(getDateKey(today));
  const [newTime, setNewTime] = useState("10:00");
  const [newParticipant, setNewParticipant] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReminder, setNewReminder] = useState("15 daqiqa oldin");
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const savingRef = useRef(false);
  const { showToast } = useToast();

  useEffect(() => subscribeToWorkspaceData("calendarEvents", () => setEvents(getCalendarEvents())), []);

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
    setNewParticipant("");
    setNewDescription("");
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

  const openEditModal = (event: CalendarEvent) => {
    setEditId(event.id);
    setNewTitle(event.title);
    setNewDate(event.date);
    setNewTime(event.time);
    setNewParticipant(event.participant ?? "");
    setNewDescription(event.description ?? "");
    setNewReminder(event.reminder ?? "15 daqiqa oldin");
    setShowModal(true);
  };

  const saveMeeting = () => {
    if (!newTitle.trim()) {
      showToast("Uchrashuv nomini kiriting", "error");
      return;
    }
    if (!newDate || !newTime || savingRef.current) {
      if (!newDate || !newTime) showToast("Sana va vaqtni tanlang", "error");
      return;
    }
    savingRef.current = true;
    const payload = {
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      type: "meeting" as const,
      participant: newParticipant.trim() || undefined,
      description: newDescription.trim() || undefined,
      reminder: newReminder || undefined,
    };
    try {
      if (editId !== null) {
      updateMeeting(editId, payload);
      showToast("Uchrashuv yangilandi", "success");
    } else {
      createMeetingRecord(payload);
      showToast("Uchrashuv kalendarga qo‘shildi", "success");
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

  const confirmRemoveMeeting = () => {
    if (!pendingDelete) return;

    const event = pendingDelete;
    deleteMeeting(event.id);
    setEvents(getCalendarEvents());
    setPendingDelete(null);
    showToast("Uchrashuv o‘chirildi", "success");
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
          <h1>Kalendar</h1>
          <p>Uchrashuvlar va kunlik rejalaringizni boshqaring.</p>
        </div>
        <button type="button" className="calendar-page__add" onClick={openCreateModal}><Plus size={15} />Yangi uchrashuv</button>
      </header>

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-card__top">
            <div className="calendar-card__month">
              <button type="button" onClick={() => setMonth(-1)} aria-label="Oldingi oy"><ChevronLeft size={17} /></button>
              <h2>{monthNames[month]} {year}</h2>
              <button type="button" onClick={() => setMonth(1)} aria-label="Keyingi oy"><ChevronRight size={17} /></button>
            </div>
            <button type="button" className="calendar-card__today" onClick={goToday}>Bugun</button>
          </div>
          <div className="calendar-grid">
            {weekDays.map((day) => <div className="calendar-grid__weekday" key={day}>{day}</div>)}
            {calendarDays.map((day, index) => {
              const dateKey = day ? getDateKey(new Date(year, month, day)) : "";
              const hasEvent = Boolean(day && events.some((event) => event.date === dateKey));
              const isToday = dateKey === getDateKey();
              return (
                <button
                  type="button"
                  key={`${day}-${index}`}
                  disabled={!day}
                  className={["calendar-day", day === selectedDay ? "calendar-day--selected" : "", isToday ? "calendar-day--today" : "", hasEvent ? "calendar-day--event" : ""].join(" ")}
                  onClick={() => {
                    if (!day) return;
                    selectDate(dateKey);
                  }}
                >
                  {day && <><span>{day}</span>{hasEvent && <i />}</>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-sidebar">
          <div className="calendar-sidebar__header">
            <div><span>SELECTED DAY</span><h2>{selectedDay} {monthNames[month]}</h2></div>
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
                  {event.reminder && <small>Eslatma: {event.reminder}</small>}
                </div>
                <div className="calendar-event__actions">
                  <button type="button" onClick={() => openEditModal(event)} aria-label="Uchrashuvni tahrirlash"><Pencil size={12} /></button>
                  <button type="button" onClick={() => removeMeeting(event)} aria-label="Uchrashuvni o‘chirish"><Trash2 size={12} /></button>
                  {event.type === "meeting" && <Video size={13} />}
                </div>
              </article>
            ))}
            {selectedEvents.length === 0 && <div className="calendar-events__empty">Tanlangan kun uchun event yo‘q.</div>}
          </div>
          <button type="button" className="calendar-sidebar__button" onClick={openCreateModal}><Plus size={14} />Event qo‘shish</button>
        </aside>
      </div>

      <section className="calendar-summary">
        <div className="calendar-summary__icon"><Clock3 size={17} /></div>
        <div><span>BUGUNGI REJA</span><h2>Sizda bugun {todayEvents.length} ta reja bor</h2><p>{nextEvent ? `Keyingi uchrashuv ${nextEvent.time} da.` : "Bugun uchun uchrashuv belgilanmagan."}</p></div>
      </section>

      {showModal && (
        <div className="calendar-modal__overlay" onClick={closeModal}>
          <div className="calendar-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="calendar-modal__close" onClick={closeModal} aria-label="Uchrashuv oynasini yopish"><X size={17} /></button>
            <div className="calendar-modal__icon"><CalendarDays size={21} /></div>
            <span className="calendar-modal__eyebrow">{editId !== null ? "EDIT EVENT" : "NEW EVENT"}</span>
            <h2>{editId !== null ? "Uchrashuvni tahrirlash" : "Yangi uchrashuv"}</h2>
            <p>Event ma’lumotlarini kiriting.</p>
            <input type="text" placeholder="Uchrashuv nomi" aria-label="Uchrashuv nomi" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            <div className="calendar-modal__row"><input type="date" aria-label="Uchrashuv sanasi" value={newDate} onChange={(event) => selectDate(event.target.value)} /><input type="time" aria-label="Uchrashuv vaqti" value={newTime} onChange={(event) => setNewTime(event.target.value)} /></div>
            <input type="text" placeholder="Ishtirokchi" aria-label="Ishtirokchi" value={newParticipant} onChange={(event) => setNewParticipant(event.target.value)} />
            <textarea rows={3} placeholder="Tavsif" aria-label="Uchrashuv tavsifi" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
            <select aria-label="Uchrashuv eslatmasi" value={newReminder} onChange={(event) => setNewReminder(event.target.value)}><option value="15 daqiqa oldin">15 daqiqa oldin</option><option value="1 soat oldin">1 soat oldin</option><option value="">Eslatmasin</option></select>
            <button type="button" className="calendar-modal__submit" onClick={saveMeeting}>{editId !== null ? <><Check size={15} />Saqlash</> : <><Plus size={15} />Event yaratish</>}</button>
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
