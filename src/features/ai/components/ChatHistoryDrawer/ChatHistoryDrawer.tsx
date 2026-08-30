import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { useAIChat } from "../../hooks/useAIChat";
import { listConversations, type Conversation } from "../../../../services/api/conversationApi";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import { useI18n } from "../../../../i18n/useI18n";

import "./ChatHistoryDrawer.scss";

type ChatHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type Bucket = "today" | "yesterday" | "week" | "older";

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const bucketFor = (isoDate: string): Bucket => {
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(isoDate))) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 7) return "week";
  return "older";
};

const BUCKET_ORDER: Bucket[] = ["today", "yesterday", "week", "older"];

const ChatHistoryDrawer = ({ open, onClose }: ChatHistoryDrawerProps) => {
  const { t } = useI18n();
  const {
    conversations,
    activeConversationId,
    newChat,
    loadConversation,
    deleteConversation,
    renameConversation,
  } = useAIChat();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  const bucketLabels: Record<Bucket, string> = {
    today: t("ai.historyToday", "Bugun"),
    yesterday: t("ai.historyYesterday", "Kecha"),
    week: t("ai.historyWeek", "Oxirgi 7 kun"),
    older: t("ai.historyOlder", "Oldinroq"),
  };

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnPopState = () => onClose();
    window.history.pushState({ chatHistory: true }, "");
    window.addEventListener("popstate", closeOnPopState);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("popstate", closeOnPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) { setSearch(""); setSearchResults(null); }
  }, [open]);

  useEffect(() => {
    const query = search.trim();
    if (!query) { setSearchResults(null); return undefined; }
    let active = true;
    const timer = window.setTimeout(() => {
      void listConversations(query).then((result) => { if (active) setSearchResults(result.items); }).catch(() => { if (active) setSearchResults([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  const closeDrawer = () => {
    if (window.history.state?.chatHistory) { window.history.back(); return; }
    onClose();
  };

  const list = searchResults ?? conversations;
  const grouped = useMemo(() => {
    const groups: Record<Bucket, Conversation[]> = { today: [], yesterday: [], week: [], older: [] };
    for (const conversation of list) groups[bucketFor(conversation.updatedAt)].push(conversation);
    return groups;
  }, [list]);

  const commitRename = async (id: string) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title) return;
    await renameConversation(id, title);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteConversation(pendingDelete.id);
    setPendingDelete(null);
  };

  if (!open) return null;

  return (
    <div className="chat-history-drawer__overlay" role="dialog" aria-modal="true" aria-label={t("ai.history", "So'nggi suhbatlar")} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
      <section className="chat-history-drawer">
        <header className="chat-history-drawer__head">
          <h2><MessageSquareText size={16} /> {t("ai.history", "So'nggi suhbatlar")}</h2>
          <button type="button" onClick={closeDrawer} aria-label={t("common.close", "Yopish")}><X size={18} /></button>
        </header>

        <button type="button" className="chat-history-drawer__new" onClick={() => { newChat(); closeDrawer(); }}>
          <Plus size={16} /> {t("ai.newChat", "Yangi chat")}
        </button>

        <label className="chat-history-drawer__search">
          <Search size={14} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("ai.historySearch", "Chat tarixidan qidirish...")} aria-label={t("ai.historySearch", "Chat tarixidan qidirish...")} />
        </label>

        <div className="chat-history-drawer__list">
          {list.length === 0 && (
            <span className="chat-history-drawer__empty">
              {search.trim() ? t("ai.historyNotFound", "Mos chat topilmadi.") : t("ai.noHistory", "Hali saqlangan suhbat yo'q.")}
            </span>
          )}
          {BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0).map((bucket) => (
            <div className="chat-history-drawer__group" key={bucket}>
              <span className="chat-history-drawer__group-label">{bucketLabels[bucket]}</span>
              {grouped[bucket].map((item) => (
                <div className={`chat-history-drawer__row ${activeConversationId === item.id ? "is-active" : ""}`} key={item.id}>
                  {editingId === item.id ? (
                    <input
                      className="chat-history-drawer__rename"
                      autoFocus
                      maxLength={200}
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => void commitRename(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void commitRename(item.id); }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      aria-label={t("ai.renameChat", "Chat nomini o'zgartirish")}
                    />
                  ) : (
                    <button type="button" className="chat-history-drawer__open" onClick={() => { void loadConversation(item.id); closeDrawer(); }} title={item.title}>
                      <span>{item.title}</span>
                    </button>
                  )}
                  <span className="chat-history-drawer__actions">
                    <button type="button" onClick={() => { setEditingId(item.id); setEditingTitle(item.title); }} aria-label={t("ai.renameChat", "Chat nomini o'zgartirish")}><Pencil size={14} /></button>
                    <button type="button" className="is-danger" onClick={() => setPendingDelete(item)} aria-label={`${item.title} ${t("ai.deleteChat", "suhbatini o'chirish")}`}><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title={t("ai.deleteChatTitle", "Chatni o'chirish")}
          description={t("ai.deleteChatDescription", "Bu suhbat butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.")}
          confirmLabel={t("common.delete", "O'chirish")}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default ChatHistoryDrawer;
