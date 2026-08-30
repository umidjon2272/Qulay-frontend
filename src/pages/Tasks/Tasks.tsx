import {
  Plus,
  Search,
  Check,
  CalendarDays,
  MoreHorizontal,
  Clock3,
  Flag,
  ListTodo,
  Circle,
  ChevronDown,
  Pencil,
  Trash2,
  RotateCcw,
  Copy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useToast } from "../../hooks/useToast";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { getDateKey, getDateLabel } from "../../services/dateUtils";
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  getTasks,
  loadTasks,
  updateTask as updateTaskRecord,
} from "../../services/taskService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { Task } from "../../types/workspace";
import { useI18n } from "../../i18n/useI18n";

import "./Tasks.scss";

const priorities: Task["priority"][] = [
  "Muhim",
  "O‘rta",
  "Oddiy",
];

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] =
    useState<Task[]>(getTasks);

  const [filter, setFilter] =
    useState("Barchasi");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] = useState<"deadline" | "priority" | "title">("deadline");

  const [showModal, setShowModal] =
    useState(false);

  const [priority, setPriority] =
    useState<Task["priority"]>("O‘rta");

  const [taskStatus, setTaskStatus] = useState<"TODO" | "IN_PROGRESS" | "COMPLETED">("TODO");

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

  const [editId, setEditId] =
    useState<string | number | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<string | number | null>(null);

  const [pendingDelete, setPendingDelete] =
    useState<Task | null>(null);
  const savingRef = useRef(false);

  const { showToast } = useToast();
  const { t, locale } = useI18n();
  const filterLabel = (value: string) => ({ Barchasi: t("tasks.all", "Barchasi"), Bugun: t("tasks.today", "Bugun"), Kechikkan: t("tasks.overdue", "Kechikkan"), Muhim: t("tasks.important", "Muhim"), Bajarilgan: t("tasks.done", "Bajarilgan") }[value] ?? value);
  const priorityLabel = (value: Task["priority"]) => locale === "ru" ? ({ "Muhim": "Важный", "O‘rta": "Средний", "Oddiy": "Обычный" }[value] ?? value) : value;
  const statusLabel = (value: Task["status"]) => value === "IN_PROGRESS" ? t("tasks.statusProgress", "Jarayonda") : value === "COMPLETED" ? t("tasks.done", "Bajarilgan") : t("tasks.statusNew", "Yangi");

  useCloseOnOutsideClick(openMenuId !== null, () => setOpenMenuId(null));

  useEffect(
    () => subscribeToWorkspaceData("tasks", () => setTasks(getTasks())),
    [],
  );
  useEffect(() => { void loadTasks().catch(() => showToast(t("tasks.loadError", "Vazifalarni yuklab bo'lmadi"), "error")); }, [showToast, t]);

  const toggleTask = async (id: string | number) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    try {
      const updated = await updateTaskRecord(id, { completed: !task.completed, status: task.completed ? "TODO" : "COMPLETED" });
      setTasks((current) => current.map((item) => item.id === id ? updated : item));
      showToast(task.completed ? t("tasks.reactivatedToast", "Vazifa qayta faollashtirildi") : t("tasks.completedToast", "Vazifa bajarildi"), "success");
    } catch { showToast(t("tasks.statusError", "Vazifa holatini yangilab bo'lmadi"), "error"); }
  };

  const deleteTask = (task: Task) => {
    setPendingDelete(task);
    setOpenMenuId(null);
  };

  const confirmDeleteTask = async () => {
    if (!pendingDelete) return;

    const task = pendingDelete;
    try { await deleteTaskRecord(task.id); } catch { showToast(t("tasks.deleteError", "Vazifani o'chirib bo'lmadi"), "error"); return; }
    setTasks(getTasks());

    setOpenMenuId(null);
    setPendingDelete(null);
    showToast(t("tasks.deletedToast", "\"{title}\" o'chirildi", { title: task.title }), "success");
  };

  const resetTaskForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewTime("10:00");
    setNewDate(getDateKey());
    setPriority("O‘rta");
    setTaskStatus("TODO");
    setPriorityOpen(false);
    setEditId(null);
  };

  const openCreateTask = () => {
    resetTaskForm();
    setShowModal(true);
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    openCreateTask();
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const closeTaskModal = () => {
    resetTaskForm();
    setShowModal(false);
  };

  const startEditTask = (task: Task) => {
    setEditId(task.id);
    setNewTitle(task.title);
    setNewDescription(task.description);
    setNewTime(task.time);
    setNewDate(task.date || getDateKey());
    setPriority(task.priority);
    setTaskStatus(task.status ?? (task.completed ? "COMPLETED" : "TODO"));
    setShowModal(true);
    setOpenMenuId(null);
  };

  const todayKey = getDateKey();
  const isOverdue = (task: Task) => Boolean(task.date && task.date < todayKey && !task.completed);
  const priorityRank = (value: Task["priority"]) => value === "Muhim" ? 0 : value === "O‘rta" ? 1 : 2;

  const filteredTasks = tasks
    .filter((task) => {
      const matchesFilter =
        filter === "Barchasi" ||
        (filter === "Bugun" && task.date === todayKey && !task.completed) ||
        (filter === "Kechikkan" && isOverdue(task)) ||
        (filter === "Muhim" && task.priority === "Muhim" && !task.completed) ||
        (filter === "Bajarilgan" && task.completed);
      const query = search.toLocaleLowerCase().trim();
      const matchesSearch = !query || task.title.toLocaleLowerCase().includes(query) || task.description.toLocaleLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (sort === "priority") return priorityRank(a.priority) - priorityRank(b.priority);
      if (sort === "title") return a.title.localeCompare(b.title, "uz");
      return `${a.date ?? "9999"}${a.time}`.localeCompare(`${b.date ?? "9999"}${b.time}`);
    });

  const completedCount =
    tasks.filter(
      (task) => task.completed
    ).length;

  const progress =
    tasks.length > 0
      ? Math.round(
          (completedCount /
            tasks.length) *
            100
        )
      : 0;

  const createTask = async () => {
    if (!newTitle.trim()) {
      showToast(t("tasks.titleRequired", "Vazifa nomini kiriting"), "error");
      return;
    }
    if (!newDate || !newTime || savingRef.current) {
      if (!newDate || !newTime) showToast(t("reminders.dateTimeRequired", "Sana va vaqtni tanlang"), "error");
      return;
    }

    savingRef.current = true;

    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim() || "Yangi vazifa",
        time: newTime,
        category: "Yangi",
        priority,
        status: taskStatus,
        completed: taskStatus === "COMPLETED",
        date: newDate,
      };

      if (editId !== null) {
        await updateTaskRecord(editId, payload);
        showToast(t("tasks.updatedToast", "Vazifa yangilandi"), "success");
      } else {
        await createTaskRecord(payload);
        showToast(t("tasks.createdToast", "Vazifa yaratildi"), "success");
      }

      setTasks(getTasks());
      resetTaskForm();
      setShowModal(false);
    } catch {
      showToast(t("tasks.saveError", "Vazifani saqlab bo'lmadi"), "error");
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <main className="tasks-page">
      {/* ================= HEADER ================= */}

      <header className="tasks-header">
        <div>
          <span className="tasks-header__eyebrow">{t("tasks.eyebrow", "TODAY'S WORK")}</span>
          <h1>{t("tasks.title", "Vazifalar")}</h1>
          <p>{t("tasks.subtitle", "Bugungi ishlaringizni tartibli boshqaring va nazorat qiling.")}</p>
        </div>

        <button
          className="tasks-header__add"
          type="button"
          onClick={openCreateTask}
        >
          <Plus size={16} />

          {t("tasks.new", "Yangi vazifa")}
        </button>
      </header>

      {/* ================= OVERVIEW ================= */}

      <section className="tasks-overview">
        <div className="tasks-overview__main">
          <div className="tasks-overview__icon">
            <ListTodo size={20} />
          </div>

          <div>
            <span>
              {t("tasks.todayProgress", "BUGUNGI PROGRESS")}
            </span>

            <h2>
              {t("tasks.completedOfTotal", "{completed} / {total} vazifa", { completed: completedCount, total: tasks.length })}
            </h2>

            <p>
              {t("tasks.progressSentence", "Bugungi vazifalarning {percent}% bajarildi.", { percent: progress })}
            </p>
          </div>
        </div>

        <div className="tasks-overview__progress">
          <div>
            <span>{t("tasks.progress", "Progress")}</span>

            <strong>
              {progress}%
            </strong>
          </div>

          <div className="tasks-overview__bar">
            <i
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ================= TOOLBAR ================= */}

      <section className="tasks-toolbar">
        <div className="tasks-filters">
          {["Barchasi", "Bugun", "Kechikkan", "Muhim", "Bajarilgan"].map((item) => (
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

        <label className="tasks-search">
          <Search size={14} />

          <input
            type="text"
            placeholder={t("tasks.search", "Vazifa qidirish...")}
            aria-label={t("tasks.searchAria", "Vazifalardan qidirish")}
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </label>

        <label className="tasks-sort"><span>{t("tasks.sort", "Sort")}</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="deadline">{t("tasks.sortDeadline", "Muddat bo'yicha")}</option><option value="priority">{t("tasks.sortPriority", "Muhimlik bo'yicha")}</option><option value="title">{t("tasks.sortTitle", "Nom bo'yicha")}</option></select></label>
      </section>

      {/* ================= CONTENT ================= */}

      <section className="tasks-content">
        {/* TASK LIST */}

        <div className="tasks-list">
          <div className="tasks-list__heading">
            <div>
              <span>{t("tasks.listEyebrow", "VAZIFALAR")}</span>

              <h2>
                {t("tasks.todayWork", "Bugungi ishlar")}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilter("Barchasi");
                setSearch("");
                showToast(t("tasks.allShownToast", "Barcha vazifalar ko'rsatildi"), "info");
              }}
            >
              <MoreHorizontal
                size={18}
              />
            </button>
          </div>

          {filteredTasks.map(
            (task) => (
              <article
                className={`task-card ${
                  task.completed
                    ? "task-card--completed"
                    : ""
                } ${
                  openMenuId === task.id
                    ? "task-card--menu-open"
                    : ""
                }`}
                key={task.id}
              >
                <button
                  type="button"
                  className="task-card__check"
                  onClick={() =>
                    toggleTask(
                      task.id
                    )
                  }
                  aria-label={t("tasks.markDone", "Vazifani bajarilgan deb belgilash")}
                >
                  {task.completed ? (
                    <Check size={14} />
                  ) : (
                    <Circle size={14} />
                  )}
                </button>

                <div className="task-card__body">
                  <div className="task-card__title-row">
                    <h3>
                      {task.title}
                    </h3>

                    <span
                      className={`task-priority task-priority--${task.priority
                        .toLowerCase()
                        .replace(
                          "‘",
                          ""
                        )}`}
                    >
                      <Flag size={10} />

                      {priorityLabel(task.priority)}
                    </span>
                  </div>

                  <p>
                    {task.description}
                  </p>

                  <div className="task-card__meta">
                    <span>
                      <Clock3
                        size={11}
                      />

                      {task.time}
                    </span>

                    <span>
                      <CalendarDays
                        size={11}
                      />

                      {task.date ? getDateLabel(task.date, new Date(), locale) : t("tasks.today", "Bugun")}
                    </span>

                    {isOverdue(task) && <span className="task-overdue">{t("tasks.overdue", "Kechikkan")}</span>}
                    <span className={`task-category task-category--${(task.status ?? (task.completed ? "COMPLETED" : "TODO")).toLowerCase()}`}>
                      {statusLabel(task.status ?? (task.completed ? "COMPLETED" : "TODO"))}
                    </span>
                  </div>
                </div>

                <div className="task-card__actions">
                  <button
                    type="button"
                    className="task-card__more"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(
                        openMenuId === task.id ? null : task.id
                      );
                    }}
                    aria-label={t("tasks.actionsAria", "{title} uchun amallar", { title: task.title })}
                    aria-expanded={openMenuId === task.id}
                  >
                    <MoreHorizontal
                      size={17}
                    />
                  </button>

                  {openMenuId === task.id && (
                    <div
                      className="task-card__menu"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          toggleTask(task.id);
                          setOpenMenuId(null);
                        }}
                      >
                        {task.completed ? (
                          <RotateCcw size={13} />
                        ) : (
                          <Check size={13} />
                        )}
                        {task.completed
                          ? t("tasks.makeActive", "Faol qilish")
                          : t("tasks.markDone", "Bajarilgan deb belgilash")}
                      </button>

                      {!task.completed && task.status !== "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => {
                            void updateTaskRecord(task.id, { status: "IN_PROGRESS", completed: false })
                              .then((updated) => { setTasks((current) => current.map((item) => item.id === task.id ? updated : item)); showToast(t("tasks.movedProgress", "Vazifa jarayonga o'tkazildi"), "success"); })
                              .catch(() => showToast(t("tasks.statusError", "Vazifa holatini yangilab bo'lmadi"), "error"));
                            setOpenMenuId(null);
                          }}
                        >
                          <Clock3 size={13} />
                          {t("tasks.moveProgress", "Jarayonga o'tkazish")}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          startEditTask(task);
                        }}
                      >
                        <Pencil size={13} />
                        {t("tasks.editAction", "Tahrirlash")}
                      </button>

                      <button type="button" onClick={() => {
                        void createTaskRecord({ title: t("tasks.copyTitleSuffix", "{title} — nusxa", { title: task.title }), description: task.description, time: task.time, category: task.category, priority: task.priority, status: "TODO", completed: false, date: task.date }).then(() => { setTasks(getTasks()); showToast(t("tasks.duplicatedToast", "Vazifa nusxalandi"), "success"); }).catch(() => showToast(t("tasks.duplicateError", "Vazifani nusxalab bo'lmadi"), "error"));
                        setOpenMenuId(null);
                      }}><Copy size={13} />{t("tasks.copy", "Nusxa olish")}</button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteTask(task)}
                      >
                        <Trash2 size={13} />
                        {t("tasks.delete", "O‘chirish")}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          )}

          {filteredTasks.length ===
            0 && (
            <div className="tasks-empty">
              <ListTodo
                size={25}
              />

              <h3>
                {tasks.length === 0 ? t("tasks.noTasks", "Hozircha vazifa yo'q") : t("tasks.notFound", "Vazifa topilmadi")}
              </h3>

              <p>
                {t("tasks.tryFilter", "Boshqa filter yoki qidiruv so‘zini sinab ko‘ring.")}
              </p>
            </div>
          )}
        </div>

        {/* SIDE PANEL */}

        <aside className="tasks-side">
          <div className="tasks-side__top">
            <div className="tasks-side__icon">
              <Flag size={17} />
            </div>

            <span>
              {t("tasks.priority", "PRIORITY")}
            </span>
          </div>

          <h2>
            {t("tasks.important", "Muhim vazifalar")}
          </h2>

          <p>
            {t("tasks.priorityHelp", "Bugun e'tibor berishingiz kerak bo‘lgan ishlar.")}
          </p>

          <div className="tasks-side__items">
            {tasks
              .filter(
                (task) =>
                  task.priority ===
                    "Muhim" &&
                  !task.completed
              )
              .map((task) => (
                <div
                  className="tasks-side__item"
                  key={task.id}
                >
                  <i />

                  <div>
                    <strong>
                      {task.title}
                    </strong>

                    <span>
                      {task.time}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <button
            type="button"
            className="tasks-side__button"
            onClick={openCreateTask}
          >
            <Plus size={14} />

            {t("tasks.add", "Vazifa qo‘shish")}
          </button>
        </aside>
      </section>

      {/* ================= MODAL ================= */}

      {showModal && (
        <div
          className="task-modal__overlay"
          onClick={closeTaskModal}
        >
          <div
            className="task-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="task-modal__close"
              onClick={closeTaskModal}
              aria-label={t("tasks.closeModalAria", "Vazifa oynasini yopish")}
            >
              ×
            </button>

            <div className="task-modal__icon">
              <ListTodo
                size={21}
              />
            </div>

            <span className="task-modal__eyebrow">
              {editId !== null ? t("tasks.editEyebrow", "EDIT TASK") : t("tasks.newEyebrow", "NEW TASK")}
            </span>

            <h2>
              {editId !== null ? t("tasks.edit", "Vazifani tahrirlash") : t("tasks.new", "Yangi vazifa")}
            </h2>

            <p>
              {editId !== null ? t("tasks.editHint", "Vazifa ma'lumotlarini yangilang.") : t("tasks.createHint", "Bugungi rejangizga yangi vazifa qo'shing.")}
            </p>

            {/* TITLE */}

            <input
              type="text"
              placeholder={t("tasks.name", "Vazifa nomi")}
              aria-label={t("tasks.name", "Vazifa nomi")}
              value={newTitle}
              onChange={(event) =>
                setNewTitle(
                  event.target.value
                )
              }
            />

            {/* DESCRIPTION */}

            <textarea
              placeholder={t("tasks.description", "Qisqacha tavsif...")}
              aria-label={t("tasks.descriptionAria", "Vazifa tavsifi")}
              rows={3}
              value={
                newDescription
              }
              onChange={(event) =>
                setNewDescription(
                  event.target.value
                )
              }
            />

            <div className="task-status-picker" role="group" aria-label={t("tasks.status", "Vazifa holati")}>
              {[
                { value: "TODO" as const, label: t("tasks.statusNew", "Yangi") },
                { value: "IN_PROGRESS" as const, label: t("tasks.statusProgress", "Jarayonda") },
                { value: "COMPLETED" as const, label: t("tasks.done", "Bajarilgan") },
              ].map((item) => (
                <button key={item.value} type="button" className={taskStatus === item.value ? "is-active" : ""} onClick={() => setTaskStatus(item.value)}>{item.label}</button>
              ))}
            </div>

            {/* TIME + PRIORITY */}

            <div className="task-modal__row">
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

              {/* CUSTOM LIQUID GLASS DROPDOWN */}

              <div className="task-priority-select">
                <button
                  type="button"
                  className={`task-priority-select__trigger ${
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
                  <div className="task-priority-select__menu">
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
                          <span
                            className={`priority-dot priority-dot--${item
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
                              size={
                                14
                              }
                            />
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CREATE */}

            <button
              type="button"
              className="task-modal__submit"
              onClick={
                createTask
              }
            >
              <Plus size={15} />

              {editId !== null ? t("common.save", "Saqlash") : t("tasks.create", "Vazifa yaratish")}
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("tasks.deleteConfirmTitle", "Vazifani o'chirish")}
          description={t("tasks.deleteConfirmDescription", "\"{title}\" vazifasini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.", { title: pendingDelete.title })}
          confirmLabel={t("common.delete", "O'chirish")}
          onConfirm={confirmDeleteTask}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
};

export default Tasks;
