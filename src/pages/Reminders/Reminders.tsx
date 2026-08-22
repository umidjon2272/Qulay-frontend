import {
  Plus,
  Search,
  Bell,
  Check,
  Clock3,
  CalendarDays,
  MoreHorizontal,
  X,
  ChevronDown,
  AlarmClock,
  Trash2,
  Pencil,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import { getDateKey, getDateLabel } from "../../services/dateUtils";
import {
  createReminder as createReminderRecord,
  deleteReminder as deleteReminderRecord,
  getReminders,
  loadReminders,
  updateReminder as updateReminderRecord,
} from "../../services/reminderService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { Reminder, TaskPriority } from "../../types/workspace";
import { useToast } from "../../hooks/useToast";

import "./Reminders.scss";

const priorities: TaskPriority[] = [
  "Muhim",
  "O‘rta",
  "Oddiy",
];

const Reminders = () => {
  const [reminders, setReminders] =
    useState<Reminder[]>(getReminders);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("Barchasi");

  const [showModal, setShowModal] =
    useState(false);

  const [openMenuId, setOpenMenuId] =
    useState<string | number | null>(null);

  useCloseOnOutsideClick(openMenuId !== null, () => setOpenMenuId(null));

  const [deleteId, setDeleteId] =
    useState<string | number | null>(null);

  const [editId, setEditId] =
    useState<string | number | null>(null);

  const [priority, setPriority] =
    useState<TaskPriority>("O‘rta");

  const [priorityOpen, setPriorityOpen] =
    useState(false);

  const [newTitle, setNewTitle] =
    useState("");

  const [newDescription, setNewDescription] =
    useState("");

  const [newTime, setNewTime] =
    useState("10:00");

  const [newDate, setNewDate] =
    useState(getDateKey());
  const savingRef = useRef(false);

  const { showToast } = useToast();

  useEffect(
    () =>
      subscribeToWorkspaceData("reminders", () =>
        setReminders(getReminders()),
      ),
    [],
  );
  useEffect(() => { void loadReminders().catch(() => showToast("Eslatmalarni yuklab bo'lmadi", "error")); }, [showToast]);

  /* =========================
     TOGGLE
  ========================= */

  const toggleReminder = async (id: string | number) => {
    const reminder = reminders.find((item) => item.id === id);

    if (!reminder) return;

    try {
      await updateReminderRecord(id, { completed: !reminder.completed });
      setReminders(getReminders());
      showToast(reminder.completed ? "Eslatma qayta faollashtirildi" : "Eslatma bajarildi", "success");
    } catch { showToast("Eslatma holatini yangilab bo'lmadi", "error"); }
  };

  /* =========================
     DELETE CONFIRM
  ========================= */

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try { await deleteReminderRecord(deleteId); } catch { showToast("Eslatmani o'chirib bo'lmadi", "error"); return; }
    setReminders(getReminders());

    setDeleteId(null);
    setOpenMenuId(null);
    showToast("Eslatma o‘chirildi", "success");
  };

  /* =========================
     EDIT
  ========================= */

  const openEdit = (reminder: Reminder) => {
    setEditId(reminder.id);

    setNewTitle(reminder.title);
    setNewDescription(
      reminder.description
    );
    setNewTime(reminder.time);
    setNewDate(reminder.dateKey ?? getDateKey());
    setPriority(reminder.priority);

    setPriorityOpen(false);
    setOpenMenuId(null);
    setShowModal(true);
  };

  /* =========================
     CREATE / UPDATE
  ========================= */

  const saveReminder = async () => {
    if (!newTitle.trim()) {
      showToast("Eslatma nomini kiriting", "error");
      return;
    }
    if (!newDate || !newTime || savingRef.current) {
      if (!newDate || !newTime) showToast("Sana va vaqtni tanlang", "error");
      return;
    }

    savingRef.current = true;

    try {
      if (editId !== null) {
        await updateReminderRecord(editId, {
          title: newTitle.trim(),
          description: newDescription.trim() || "Eslatma",
          time: newTime,
          priority,
          date: getDateLabel(newDate),
          dateKey: newDate,
        });
      } else {
        await createReminderRecord({
          title: newTitle.trim(),
          description: newDescription.trim() || "Yangi eslatma",
          date: getDateLabel(newDate),
          dateKey: newDate,
          time: newTime,
          priority,
          completed: false,
        });
      }

      setReminders(getReminders());
      showToast(editId !== null ? "Eslatma yangilandi" : "Eslatma yaratildi", "success");
      closeReminderModal();
    } catch {
      showToast("Eslatmani saqlab bo'lmadi", "error");
    } finally {
      savingRef.current = false;
    }
  };

  /* =========================
     MODAL
  ========================= */

  const openCreateModal = () => {
    setEditId(null);

    setNewTitle("");
    setNewDescription("");
    setNewTime("10:00");
    setNewDate(getDateKey());
    setPriority("O‘rta");
    setPriorityOpen(false);

    setShowModal(true);
  };

  const closeReminderModal = () => {
    setShowModal(false);

    setEditId(null);

    setNewTitle("");
    setNewDescription("");
    setNewTime("10:00");
    setNewDate(getDateKey());
    setPriority("O‘rta");
    setPriorityOpen(false);
  };

  /* =========================
     FILTER
  ========================= */

  const filteredReminders =
    reminders.filter((reminder) => {
      const matchesFilter =
        filter === "Barchasi" ||
        (filter === "Faol" &&
          !reminder.completed) ||
        (filter === "Bajarilgan" &&
          reminder.completed);

      const query =
        search.toLowerCase().trim();

      const matchesSearch =
        reminder.title
          .toLowerCase()
          .includes(query) ||
        reminder.description
          .toLowerCase()
          .includes(query);

      return (
        matchesFilter &&
        matchesSearch
      );
    });

  const activeCount =
    reminders.filter(
      (item) => !item.completed
    ).length;

  const completedCount =
    reminders.filter(
      (item) => item.completed
    ).length;

  const todayCount =
    reminders.filter(
      (item) =>
        (item.dateKey === getDateKey() || item.date === "Bugun") &&
        !item.completed
    ).length;

  const nextReminder = reminders
    .filter((item) => !item.completed)
    .sort((a, b) => `${a.dateKey ?? "9999"}${a.time}`.localeCompare(`${b.dateKey ?? "9999"}${b.time}`))[0];

  return (
    <main className="reminders-page">
      {/* =========================
          BACKGROUND
      ========================= */}

      <div className="reminders-page__orb reminders-page__orb--one" />

      <div className="reminders-page__orb reminders-page__orb--two" />

      {/* =========================
          HEADER
      ========================= */}

      <header className="reminders-header">
        <div>
          <span className="reminders-header__eyebrow">
            PERSONAL REMINDERS
          </span>

          <h1>Eslatmalar</h1>

          <p>
            Muhim ishlarni o‘z vaqtida
            eslab qoling.
          </p>
        </div>

        <button
          type="button"
          className="reminders-header__add"
          onClick={
            openCreateModal
          }
        >
          <Plus size={16} />

          Yangi eslatma
        </button>
      </header>

      {/* =========================
          STATS
      ========================= */}

      <section className="reminders-stats">
        <div className="reminders-stat reminders-stat--main">
          <div className="reminders-stat__icon">
            <Bell size={19} />
          </div>

          <div>
            <span>
              FAOL ESLATMALAR
            </span>

            <strong>
              {activeCount}
            </strong>

            <p>
              Hozircha bajarilishi kerak
              bo‘lgan eslatmalar
            </p>
          </div>
        </div>

        <div className="reminders-stat">
          <div className="reminders-stat__small-icon">
            <AlarmClock size={16} />
          </div>

          <div>
            <span>BUGUN</span>

            <strong>
              {todayCount}
            </strong>

            <p>
              Bugungi eslatmalar
            </p>
          </div>
        </div>

        <div className="reminders-stat">
          <div className="reminders-stat__small-icon reminders-stat__small-icon--green">
            <Check size={16} />
          </div>

          <div>
            <span>
              BAJARILGAN
            </span>

            <strong>
              {completedCount}
            </strong>

            <p>
              Yakunlangan eslatmalar
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          TOOLBAR
      ========================= */}

      <section className="reminders-toolbar">
        <div className="reminders-filters">
          {[
            "Barchasi",
            "Faol",
            "Bajarilgan",
          ].map((item) => (
            <button
              type="button"
              key={item}
              className={
                filter === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(item)
              }
            >
              {item}
            </button>
          ))}
        </div>

        <label className="reminders-search">
          <Search size={14} />

          <input
            type="text"
            placeholder="Eslatma qidirish..."
            aria-label="Eslatmalardan qidirish"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </label>
      </section>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <section className="reminders-layout">
        {/* =====================
            LIST
        ===================== */}

        <div className="reminders-list">
          <div className="reminders-list__header">
            <div>
              <span>
                REMINDER CENTER
              </span>

              <h2>
                Barcha eslatmalar
              </h2>
            </div>

            <div className="reminders-list__count">
              {
                filteredReminders.length
              }
            </div>
          </div>

          <div className="reminders-items">
            {filteredReminders.map(
              (reminder, index) => (
            <article
  key={reminder.id}
  className={`reminder-card ${
    reminder.completed
      ? "reminder-card--completed"
      : ""
  } ${
    openMenuId === reminder.id
      ? "reminder-card--menu-open"
      : ""
  }`}
                  style={{
                    animationDelay: `${
                      index * 0.06
                    }s`,
                  }}
                >
                  {/* CHECK */}

                  <button
                    type="button"
                    className="reminder-card__check"
                    onClick={() =>
                      toggleReminder(
                        reminder.id
                      )
                    }
                  >
                    {reminder.completed ? (
                      <Check size={14} />
                    ) : (
                      <Bell size={13} />
                    )}
                  </button>

                  {/* CONTENT */}

                  <div className="reminder-card__content">
                    <div className="reminder-card__top">
                      <h3>
                        {reminder.title}
                      </h3>

                      <span
                        className={`reminder-priority reminder-priority--${reminder.priority
                          .toLowerCase()
                          .replace(
                            "‘",
                            ""
                          )}`}
                      >
                        {reminder.priority}
                      </span>
                    </div>

                    <p>
                      {
                        reminder.description
                      }
                    </p>

                    <div className="reminder-card__meta">
                      <span>
                        <Clock3
                          size={11}
                        />

                        {reminder.time}
                      </span>

                      <span>
                        <CalendarDays
                          size={11}
                        />

                        {reminder.date}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="reminder-card__actions">
                    <button
                      type="button"
                      className="reminder-card__more"
                      onClick={(event) => {
                        event.stopPropagation();

                        setOpenMenuId(
                          openMenuId ===
                            reminder.id
                            ? null
                            : reminder.id
                          );
                      }}
                      aria-label={`${reminder.title} uchun amallar`}
                      aria-expanded={openMenuId === reminder.id}
                    >
                      <MoreHorizontal
                        size={17}
                      />
                    </button>

                    {openMenuId ===
                      reminder.id && (
                      <div
                        className="reminder-card__menu"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              reminder
                            )
                          }
                        >
                          <Pencil
                            size={12}
                          />

                          Tahrirlash
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            toggleReminder(
                              reminder.id
                            );

                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          <Check
                            size={12}
                          />

                          {reminder.completed
                            ? "Bajarilmagan qilish"
                            : "Bajarilgan deb belgilash"}
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setDeleteId(
                              reminder.id
                            );

                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          <Trash2
                            size={12}
                          />

                          O‘chirish
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            )}
          </div>

          {/* EMPTY */}

          {filteredReminders.length ===
            0 && (
            <div className="reminders-empty">
              <div>
                <Bell size={24} />
              </div>

              <h3>
                {reminders.length === 0 ? "Eslatmalar yo'q" : "Eslatma topilmadi"}
              </h3>

              <p>
                Boshqa filter yoki
                qidiruvni sinab ko‘ring.
              </p>
            </div>
          )}
        </div>

        {/* =====================
            SIDE PANEL
        ===================== */}

        <aside className="reminders-side">
          <div className="reminders-side__glow" />

          <div className="reminders-side__icon">
            <Bell size={19} />
          </div>

          <span className="reminders-side__eyebrow">
            NEXT REMINDER
          </span>

          <h2>
            Keyingi eslatma
          </h2>

          {nextReminder ? (
            <>
              <div className="reminders-next">
                <div className="reminders-next__time">
                  {
                    nextReminder.time
                  }
                </div>

                <div>
                  <strong>
                    {
                      nextReminder.title
                    }
                  </strong>

                  <span>
                    {nextReminder.date} ·
                    eslatma
                  </span>
                </div>
              </div>

              <div className="reminders-side__line">
                <i />
                <span />
              </div>

              <p className="reminders-side__text">
                Muhim ishlarni unutmaslik
                uchun eslatmalaringizni
                oldindan belgilang.
              </p>
            </>
          ) : (
            <p className="reminders-side__text">
              Hozircha faol eslatma
              mavjud emas.
            </p>
          )}

          <button
            type="button"
            className="reminders-side__button"
            onClick={
              openCreateModal
            }
          >
            <Plus size={14} />

            Eslatma qo‘shish
          </button>
        </aside>
      </section>

      {/* =========================
          CREATE / EDIT MODAL
      ========================= */}

      {showModal && (
        <div
          className="reminder-modal__overlay"
          onClick={
            closeReminderModal
          }
        >
          <div
            className="reminder-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="reminder-modal__close"
              onClick={
                closeReminderModal
              }
              aria-label="Eslatma oynasini yopish"
            >
              <X size={16} />
            </button>

            <div className="reminder-modal__icon">
              {editId !== null ? (
                <Pencil size={21} />
              ) : (
                <Bell size={21} />
              )}
            </div>

            <span className="reminder-modal__eyebrow">
              {editId !== null
                ? "EDIT REMINDER"
                : "NEW REMINDER"}
            </span>

            <h2>
              {editId !== null
                ? "Eslatmani tahrirlash"
                : "Yangi eslatma"}
            </h2>

            <p>
              {editId !== null
                ? "Eslatma ma’lumotlarini yangilang."
                : "Muhim ishingizni eslab qolish uchun yangi eslatma yarating."}
            </p>

            <input
              type="text"
              placeholder="Eslatma nomi"
              aria-label="Eslatma nomi"
              value={newTitle}
              onChange={(event) =>
                setNewTitle(
                  event.target.value
                )
              }
            />

            <textarea
              rows={3}
              placeholder="Qisqacha tavsif..."
              aria-label="Eslatma tavsifi"
              value={newDescription}
              onChange={(event) =>
                setNewDescription(
                  event.target.value
                )
              }
            />

            <div className="reminder-modal__row">
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              />

              <input
                type="time"
                value={newTime}
                onChange={(event) =>
                  setNewTime(
                    event.target.value
                  )
                }
              />
            </div>

            {/* PRIORITY */}

            <div className="reminder-priority-select">
              <button
                type="button"
                className={`reminder-priority-select__trigger ${
                  priorityOpen
                    ? "is-open"
                    : ""
                }`}
                onClick={() =>
                  setPriorityOpen(
                    (value) =>
                      !value
                  )
                }
              >
                <span>
                  {priority}
                </span>

                <ChevronDown
                  size={15}
                  className={
                    priorityOpen
                      ? "rotate"
                      : ""
                  }
                />
              </button>

              {priorityOpen && (
                <div className="reminder-priority-select__menu">
                  {priorities.map(
                    (item) => (
                      <button
                        type="button"
                        key={item}
                        className={
                          priority ===
                          item
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          setPriority(
                            item
                          );

                          setPriorityOpen(
                            false
                          );
                        }}
                      >
                        <i
                          className={`reminder-priority-dot reminder-priority-dot--${item
                            .toLowerCase()
                            .replace(
                              "‘",
                              ""
                            )}`}
                        />

                        <span>
                          {item}
                        </span>

                        {priority ===
                          item && (
                          <Check
                            size={14}
                          />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="reminder-modal__submit"
              onClick={
                saveReminder
              }
            >
              {editId !== null ? (
                <>
                  <Check size={15} />

                  Saqlash
                </>
              ) : (
                <>
                  <Plus size={15} />

                  Eslatma yaratish
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================
          DELETE CONFIRM MODAL
      ========================= */}

      {deleteId !== null && (
        <div
          className="delete-modal__overlay"
          onClick={() =>
            setDeleteId(null)
          }
        >
          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-modal__icon">
              <Trash2 size={20} />
            </div>

            <h3>
              Eslatmani o‘chirasizmi?
            </h3>

            <p>
              Bu amalni qaytarib bo‘lmaydi.
              Eslatma butunlay o‘chiriladi.
            </p>

            <div className="delete-modal__actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteId(null)
                }
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className="delete-confirm"
                onClick={
                  confirmDelete
                }
              >
                O‘chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Reminders;
