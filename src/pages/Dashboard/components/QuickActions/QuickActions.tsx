import {
  Send,
  CalendarPlus,
  Mail,
  FilePlus2,
  BellPlus,
  UserRoundSearch,
  ArrowUpRight,
  X,
  Search,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { useToast } from "../../../../hooks/useToast";

import "./QuickActions.scss";

const actions = [
  {
    id: "telegram",
    title: "Telegramga yozish",
    subtitle: "Kontaktga xabar yuborish",
    icon: Send,
  },
  {
    id: "calendar",
    title: "Calendar'ga qo‘shish",
    subtitle: "Yangi uchrashuv yaratish",
    icon: CalendarPlus,
  },
  {
    id: "email",
    title: "Email yuborish",
    subtitle: "Email tayyorlash",
    icon: Mail,
  },
  {
    id: "document",
    title: "Hujjat yaratish",
    subtitle: "Google Docs hujjati",
    icon: FilePlus2,
  },
  {
    id: "reminder",
    title: "Reminder qo‘yish",
    subtitle: "Eslatma yaratish",
    icon: BellPlus,
  },
  {
    id: "contact",
    title: "Kontakt topish",
    subtitle: "Kerakli odamni izlash",
    icon: UserRoundSearch,
  },
];

const QuickActions = () => {
  const [activeAction, setActiveAction] =
    useState<string | null>(null);

  const [contact, setContact] = useState("");

  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { open: openAIChat, sendMessage } = useAIChat();
  const { showToast } = useToast();

  const handleAction = (id: string) => {
    setActiveAction(id);
    setContact("");
    setMessage("");
  };

  const closeModal = () => {
    setActiveAction(null);
    setContact("");
    setMessage("");
  };

  const active = actions.find(
    (item) => item.id === activeAction
  );

  return (
    <>
      <section className="quick-actions">
        <div className="quick-actions__header">
          <div>
            <h2>Tezkor amallar</h2>

            <p>
              Ko‘p ishlatiladigan funksiyalar
            </p>
          </div>

          <button
            type="button"
            onClick={() => { openAIChat(); sendMessage("Bugungi rejamni ayt"); }}
          >
            Barchasi
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="quick-actions__grid">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                type="button"
                className="quick-actions__item"
                key={action.id}
                onClick={() =>
                  handleAction(action.id)
                }
              >
                <div className="quick-actions__icon">
                  <Icon size={17} />
                </div>

                <div className="quick-actions__text">
                  <strong>{action.title}</strong>

                  <span>{action.subtitle}</span>
                </div>

                <ArrowUpRight
                  className="quick-actions__arrow"
                  size={14}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* MODAL */}

      {activeAction && active && (
        <div
          className="quick-modal__overlay"
          onClick={closeModal}
        >
          <div
            className="quick-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="quick-modal__close"
              onClick={closeModal}
            >
              <X size={17} />
            </button>

            <div className="quick-modal__icon">
              <active.icon size={21} />
            </div>

            <h2>{active.title}</h2>

            <p>
              {active.subtitle}
            </p>

            {activeAction === "telegram" && (
              <>
                <label>
                  Kontakt
                </label>

                <div className="quick-modal__input">
                  <Search size={15} />

                  <input
                    value={contact}
                    onChange={(event) =>
                      setContact(event.target.value)
                    }
                    placeholder="@username yoki ism"
                  />
                </div>

                <label>
                  Xabar
                </label>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Xabaringizni yozing..."
                />

                <button
                  type="button"
                  className="quick-modal__submit"
                  onClick={() => {
                    if (!contact.trim() || !message.trim()) {
                      showToast("Kontakt va xabarni kiriting", "error");
                      return;
                    }
                    showToast(`Telegram xabari tayyor: ${contact}`, "success");

                    closeModal();
                  }}
                >
                  <Send size={15} />
                  Xabar yozish
                </button>
              </>
            )}

            {activeAction !== "telegram" && (
              <button
                type="button"
                className="quick-modal__submit"
                onClick={() => {
                  if (activeAction === "calendar") navigate("/calendar");
                  else if (activeAction === "reminder") navigate("/reminders");
                  else if (activeAction === "document") navigate("/files");
                  else showToast(`${active.title} uchun AI yordamchidan foydalaning`, "info");
                  closeModal();
                }}
              >
                Davom etish
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;
