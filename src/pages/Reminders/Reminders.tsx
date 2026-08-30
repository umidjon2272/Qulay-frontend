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
  TimerReset,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import { useI18n } from "../../i18n/useI18n";

import "./Reminders.scss";

const priorities: TaskPriority[] = [
  "Muhim",
  "O‘rta",
  "Oddiy",
];

const Reminders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const { t, locale } = useI18n();
  const filterLabel = (value: string) => ({ Barchasi: t("reminders.all", "Barchasi"), Faol: t("reminders.active", "Faol"), Kechikkan: t("reminders.overdue", "Kechikkan"), Bajarilgan: t("reminders.done", "Bajarilgan") }[value] ?? value);
  const priorityLabel = (value: TaskPriority) => locale === "ru" ? ({ "Muhim": "Важный", "O‘rta": "Средний", "Oddiy": "Обычный" }[value] ?? value) : value;

  useEffect(
    () =>
      subscribeToWorkspaceData("reminders", () =>
        setReminders(getReminders()),
      ),
    [],
  );
  useEffect(() => { void loadReminders().catch(() => showToast(t("reminders.loadError", "Eslatmalarni yuklab bo'lmadi"), "error")); }, [showToast, t]);

  /* =========================
     TOGGLE
  ========================= */

  const toggleReminder = async (id: string | number) => {
    const reminder = reminders.find((item) => item.id === id);

    if (!reminder) return;

    try {
      await updateReminderRecord(id, { completed: !reminder.completed });
      setReminders(getReminders());
      showToast(reminder.completed ? t("reminders.reactivated", "Eslatma qayta faollashtirildi") : t("reminders.completedToast", "Eslatma bajarildi"), "success");
    } catch { showToast(t("reminders.statusUpdateError", "Eslatma holatini yangilab bo'lmadi"), "error"); }
  };

  /* =========================
     DELETE CONFIRM
  ========================= */

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try { await deleteReminderRecord(deleteId); } catch { showToast(t("reminders.deleteError", "Eslatmani o'chirib bo'lmadi"), "error"); return; }
    setReminders(getReminders());

    setDeleteId(null);
    setOpenMenuId(null);
    showToast(t("reminders.deletedToast", "Eslatma o'chirildi"), "success");
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
      showToast(t("reminders.titleRequired", "Eslatma nomini kiriting"), "error");
      return;
    }
    if (!newDate || !newTime || savingRef.current) {
      if (!newDate || !newTime) showToast(t("reminders.dateTimeRequired", "Sana va vaqtni tanlang"), "error");
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
      showToast(editId !== null ? t("reminders.updatedToast", "Eslatma yangilandi") : t("reminders.createdToast", "Eslatma yaratildi"), "success");
      closeReminderModal();
    } catch {
      showToast(t("reminders.saveError", "Eslatmani saqlab bo'lmadi"), "error");
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

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    openCreateModal();
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

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

  const reminderDateTime = (reminder: Reminder) => {
    const dateKey = reminder.dateKey ?? getDateKey();
    const value = new Date(`${dateKey}T${reminder.time}:00`);
    return Number.isNaN(value.getTime()) ? null : value;
  };

  const isOverdue = (reminder: Reminder) => {
    const date = reminderDateTime(reminder);
    return Boolean(date && !reminder.completed && date.getTime() < Date.now());
  };

  const snoozeReminder = async (reminder: Reminder, minutes = 10) => {
    const next = new Date(Date.now() + minutes * 60_000);
    const dateKey = getDateKey(next);
    const time = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    try {
      await updateReminderRecord(reminder.id, { dateKey, date: getDateLabel(dateKey), time, completed: false });
      setReminders(getReminders());
      setOpenMenuId(null);
      showToast(t("reminders.snoozedToast", "Eslatma {minutes} daqiqaga kechiktirildi", { minutes }), "success");
    } catch { showToast(t("reminders.snoozeError", "Eslatmani kechiktirib bo'lmadi"), "error"); }
  };

  const filteredReminders =
    reminders.filter((reminder) => {
      const matchesFilter =
        filter === "Barchasi" ||
        (filter === "Faol" && !reminder.completed && !isOverdue(reminder)) ||
        (filter === "Kechikkan" && isOverdue(reminder)) ||
        (filter === "Bajarilgan" && reminder.completed);

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

  const overdueCount = reminders.filter(isOverdue).length;

  const todayCount =
    reminders.filter(
      (item) =>
        (item.dateKey === getDateKey() || item.date === "Bugun") &&
        !item.completed
    ).length;

  const nextReminder = reminders
    .filter((item) => !item.completed && !isOverdue(item))
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
            {t("reminders.eyebrow", "PERSONAL REMINDERS")}
          </span>

          <h1>{t("reminders.title", "Eslatmalar")}</h1>

          <p>{t("reminders.subtitle", "Muhim ishlarni o‘z vaqtida eslab qoling.")}</p>
        </div>

        <button
          type="button"
          className="reminders-header__add"
          onClick={
            openCreateModal
          }
        >
          <Plus size={16} />

          {t("reminders.new", "Yangi eslatma")}
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
              {t("reminders.activeStat.label", "FAOL ESLATMALAR")}
            </span>

            <strong>
              {activeCount}
            </strong>

            <p>
              {t("reminders.activeStat.hint", "Hozircha bajarilishi kerak bo'lgan eslatmalar")}
            </p>
          </div>
        </div>

        <div className="reminders-stat">
          <div className="reminders-stat__small-icon">
            <AlarmClock size={16} />
          </div>

          <div>
            <span>{t("reminders.todayStat.label", "BUGUN")}</span>

            <strong>
              {todayCount}
            </strong>

            <p>
              {t("reminders.todayStat.hint", "Bugungi eslatmalar")}
            </p>
          </div>
        </div>

        <div className="reminders-stat">
          <div className="reminders-stat__small-icon reminders-stat__small-icon--danger"><Clock3 size={16} /></div>
          <div><span>{t("reminders.overdue", "KECHIKKAN")}</span><strong>{overdueCount}</strong><p>{t("reminders.overdueStat.hint", "Vaqti o'tgan, hali bajarilmagan")}</p></div>
        </div>

        <div className="reminders-stat">
          <div className="reminders-stat__small-icon reminders-stat__small-icon--green">
            <Check size={16} />
          </div>

          <div>
            <span>
              {t("reminders.done", "BAJARILGAN")}
            </span>

            <strong>
              {completedCount}
            </strong>

            <p>
              {t("reminders.doneStat.hint", "Yakunlangan eslatmalar")}
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          TOOLBAR
      ========================= */}

      <section className="reminders-toolbar">
        <div className="reminders-filters">
          {["Barchasi", "Faol", "Kechikkan", "Bajarilgan"].map((item) => (
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
              {filterLabel(item)}
            </button>
          ))}
        </div>

        <label className="reminders-search">
          <Search size={14} />

          <input
            type="text"
            placeholder={t("reminders.search", "Eslatma qidirish...")}
            aria-label={t("reminders.searchAria", "Eslatmalardan qidirish")}
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
                {t("reminders.centerEyebrow", "REMINDER CENTER")}
              </span>

              <h2>
                {t("reminders.title", "Barcha eslatmalar")}
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
    reminder.completed ? "reminder-card--completed" : ""
  } ${isOverdue(reminder) ? "reminder-card--overdue" : ""} ${
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
                        {priorityLabel(reminder.priority)}
                      </span>
                      {!reminder.completed && isOverdue(reminder) && <span className="reminder-status reminder-status--overdue">{t("reminders.overdue", "Kechikkan")}</span>}
                      {!reminder.completed && !isOverdue(reminder) && <span className="reminder-status">{t("reminders.scheduled", "Rejalashtirilgan")}</span>}
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

                        {reminder.dateKey ? getDateLabel(reminder.dateKey, new Date(), locale) : reminder.date}
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
                      aria-label={t("reminders.actionsAria", "{title} uchun amallar", { title: reminder.title })}
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

                          {t("common.edit", "Tahrirlash")}
                        </button>

                        {!reminder.completed && <button type="button" onClick={() => void snoozeReminder(reminder, 10)}><TimerReset size={12} />{t("reminders.snooze", "10 daqiqaga kechiktirish")}</button>}

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
                            ? t("reminders.markIncomplete", "Bajarilmagan qilish")
                            : t("reminders.markComplete", "Bajarilgan deb belgilash")}
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

                          {t("common.delete", "O‘chirish")}
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
                {reminders.length === 0 ? t("reminders.noItems", "Eslatmalar yo'q") : t("reminders.notFound", "Eslatma topilmadi")}
              </h3>

              <p>
                {t("reminders.emptyHint", "Boshqa filter yoki qidiruvni sinab ko'ring.")}
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
            {t("reminders.sideEyebrow", "NEXT REMINDER")}
          </span>

          <h2>
            {t("reminders.nextTitle", "Keyingi eslatma")}
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
                    {t("reminders.nextReminderMeta", "{date} · eslatma", { date: nextReminder.dateKey ? getDateLabel(nextReminder.dateKey, new Date(), locale) : nextReminder.date })}
                  </span>
                </div>
              </div>

              <div className="reminders-side__line">
                <i />
                <span />
              </div>

              <p className="reminders-side__text">
                {t("reminders.sideText", "Muhim ishlarni unutmaslik uchun eslatmalaringizni oldindan belgilang.")}
              </p>
            </>
          ) : (
            <p className="reminders-side__text">
              {t("reminders.noActiveReminder", "Hozircha faol eslatma mavjud emas.")}
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

            {t("reminders.addButton", "Eslatma qo'shish")}
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
              aria-label={t("reminders.closeModalAria", "Eslatma oynasini yopish")}
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
                ? t("reminders.editEyebrow", "EDIT REMINDER")
                : t("reminders.newEyebrow", "NEW REMINDER")}
            </span>

            <h2>
              {editId !== null
                ? t("reminders.edit", "Eslatmani tahrirlash")
                : t("reminders.new", "Yangi eslatma")}
            </h2>

            <p>
              {editId !== null
                ? t("reminders.editHint", "Eslatma ma'lumotlarini yangilang.")
                : t("reminders.createHint", "Muhim ishingizni eslab qolish uchun yangi eslatma yarating.")}
            </p>

            <input
              type="text"
              placeholder={t("reminders.name", "Eslatma nomi")}
              aria-label={t("reminders.name", "Eslatma nomi")}
              value={newTitle}
              onChange={(event) =>
                setNewTitle(
                  event.target.value
                )
              }
            />

            <textarea
              rows={3}
              placeholder={t("reminders.description", "Qisqacha tavsif...")}
              aria-label={t("reminders.descriptionAria", "Eslatma tavsifi")}
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
                          {priorityLabel(item)}
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

                  {t("common.save", "Saqlash")}
                </>
              ) : (
                <>
                  <Plus size={15} />

                  {t("reminders.create", "Eslatma yaratish")}
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
              {t("reminders.deleteConfirmTitle", "Eslatmani o'chirasizmi?")}
            </h3>

            <p>
              {t("reminders.deleteConfirmDescription", "Bu amalni qaytarib bo'lmaydi. Eslatma butunlay o'chiriladi.")}
            </p>

            <div className="delete-modal__actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteId(null)
                }
              >
                {t("common.cancel", "Bekor qilish")}
              </button>

              <button
                type="button"
                className="delete-confirm"
                onClick={
                  confirmDelete
                }
              >
                {t("common.delete", "O‘chirish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Reminders;
