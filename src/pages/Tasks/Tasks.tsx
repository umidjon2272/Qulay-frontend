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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useToast } from "../../hooks/useToast";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { getDateKey, getDateLabel } from "../../services/dateUtils";
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  getTasks,
  updateTask as updateTaskRecord,
} from "../../services/taskService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { Task } from "../../types/workspace";

import "./Tasks.scss";

const priorities: Task["priority"][] = [
  "Muhim",
  "O‘rta",
  "Oddiy",
];

const Tasks = () => {
  const [tasks, setTasks] =
    useState<Task[]>(getTasks);

  const [filter, setFilter] =
    useState("Barchasi");

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [priority, setPriority] =
    useState<Task["priority"]>("O‘rta");

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
    useState<number | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<number | null>(null);

  const [pendingDelete, setPendingDelete] =
    useState<Task | null>(null);
  const savingRef = useRef(false);

  const { showToast } = useToast();

  useCloseOnOutsideClick(openMenuId !== null, () => setOpenMenuId(null));

  useEffect(
    () => subscribeToWorkspaceData("tasks", () => setTasks(getTasks())),
    [],
  );

  const toggleTask = (id: number) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    updateTaskRecord(id, { completed: !task.completed });
    setTasks(getTasks());
  };

  const deleteTask = (task: Task) => {
    setPendingDelete(task);
    setOpenMenuId(null);
  };

  const confirmDeleteTask = () => {
    if (!pendingDelete) return;

    const task = pendingDelete;
    deleteTaskRecord(task.id);
    setTasks(getTasks());

    setOpenMenuId(null);
    setPendingDelete(null);
    showToast(`"${task.title}" o'chirildi`, "success");
  };

  const resetTaskForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewTime("10:00");
    setNewDate(getDateKey());
    setPriority("O‘rta");
    setPriorityOpen(false);
    setEditId(null);
  };

  const openCreateTask = () => {
    resetTaskForm();
    setShowModal(true);
  };

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
    setShowModal(true);
    setOpenMenuId(null);
  };

  const filteredTasks = tasks.filter(
    (task) => {
      const matchesFilter =
        filter === "Barchasi" ||
        (filter === "Jarayonda" &&
          !task.completed) ||
        (filter === "Bajarilgan" &&
          task.completed);

      const matchesSearch =
        task.title
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      return (
        matchesFilter &&
        matchesSearch
      );
    }
  );

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

  const createTask = () => {
    if (!newTitle.trim()) {
      showToast("Vazifa nomini kiriting", "error");
      return;
    }
    if (!newDate || !newTime || savingRef.current) {
      if (!newDate || !newTime) showToast("Sana va vaqtni tanlang", "error");
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
        completed: false,
        date: newDate,
      };

      if (editId !== null) {
        updateTaskRecord(editId, payload);
        showToast("Vazifa yangilandi", "success");
      } else {
        createTaskRecord(payload);
        showToast("Vazifa yaratildi", "success");
      }

      setTasks(getTasks());
      resetTaskForm();
      setShowModal(false);
    } catch {
      showToast("Vazifani saqlab bo'lmadi", "error");
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <main className="tasks-page">
      {/* ================= HEADER ================= */}

      <header className="tasks-header">
        <div>
          <span className="tasks-header__eyebrow">
            TODAY'S WORK
          </span>

          <h1>Vazifalar</h1>

          <p>
            Bugungi ishlaringizni tartibli
            boshqaring va nazorat qiling.
          </p>
        </div>

        <button
          className="tasks-header__add"
          type="button"
          onClick={openCreateTask}
        >
          <Plus size={16} />

          Yangi vazifa
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
              BUGUNGI PROGRESS
            </span>

            <h2>
              {completedCount} /{" "}
              {tasks.length} vazifa
            </h2>

            <p>
              Bugungi vazifalarning{" "}
              {progress}% bajarildi.
            </p>
          </div>
        </div>

        <div className="tasks-overview__progress">
          <div>
            <span>Progress</span>

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
          {[
            "Barchasi",
            "Jarayonda",
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

        <label className="tasks-search">
          <Search size={14} />

          <input
            type="text"
            placeholder="Vazifa qidirish..."
            aria-label="Vazifalardan qidirish"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </label>
      </section>

      {/* ================= CONTENT ================= */}

      <section className="tasks-content">
        {/* TASK LIST */}

        <div className="tasks-list">
          <div className="tasks-list__heading">
            <div>
              <span>VAZIFALAR</span>

              <h2>
                Bugungi ishlar
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilter("Barchasi");
                setSearch("");
                showToast("Barcha vazifalar ko‘rsatildi", "info");
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
                  aria-label="Vazifani bajarilgan deb belgilash"
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

                      {task.priority}
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

                      {task.date ? getDateLabel(task.date) : "Bugun"}
                    </span>

                    <span className="task-category">
                      {task.category}
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
                    aria-label={`${task.title} uchun amallar`}
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
                          ? "Faol qilish"
                          : "Bajarilgan deb belgilash"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          startEditTask(task);
                        }}
                      >
                        <Pencil size={13} />
                        Tahrirlash
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteTask(task)}
                      >
                        <Trash2 size={13} />
                        O‘chirish
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
                {tasks.length === 0 ? "Hozircha vazifa yo'q" : "Vazifa topilmadi"}
              </h3>

              <p>
                Boshqa filter yoki
                qidiruv so‘zini sinab
                ko‘ring.
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
              PRIORITY
            </span>
          </div>

          <h2>
            Muhim vazifalar
          </h2>

          <p>
            Bugun e'tibor berishingiz
            kerak bo‘lgan ishlar.
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

            Vazifa qo‘shish
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
              aria-label="Vazifa oynasini yopish"
            >
              ×
            </button>

            <div className="task-modal__icon">
              <ListTodo
                size={21}
              />
            </div>

            <span className="task-modal__eyebrow">
              NEW TASK
            </span>

            <h2>
              {editId !== null ? "Vazifani tahrirlash" : "Yangi vazifa"}
            </h2>

            <p>
              {editId !== null ? "Vazifa ma’lumotlarini yangilang." : "Bugungi rejangizga yangi vazifa qo‘shing."}
            </p>

            {/* TITLE */}

            <input
              type="text"
              placeholder="Vazifa nomi"
              aria-label="Vazifa nomi"
              value={newTitle}
              onChange={(event) =>
                setNewTitle(
                  event.target.value
                )
              }
            />

            {/* DESCRIPTION */}

            <textarea
              placeholder="Qisqacha tavsif..."
              aria-label="Vazifa tavsifi"
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
                            {item}
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

              {editId !== null ? "Saqlash" : "Vazifa yaratish"}
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Vazifani o'chirish"
          description={`"${pendingDelete.title}" vazifasini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
          confirmLabel="O'chirish"
          onConfirm={confirmDeleteTask}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
};

export default Tasks;
