import { ArrowLeft, Menu, PanelLeft, Minus, Plus, Sparkles, Trash2, X } from "lucide-react";

import { usePlatform } from "../../../../context/PlatformContext";
import { useI18n } from "../../../../i18n/useI18n";

import "./ChatHeader.scss";

type ChatHeaderProps = {
  title?: string;
  onTogglePanel?: () => void;
  panelOpen?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onClear?: () => void;
  onOpenHistory?: () => void;
  onNewChat?: () => void;
  onBack?: () => void;
};

const ChatHeader = ({ title, onClose, onMinimize, onClear, onOpenHistory, onNewChat, onBack, onTogglePanel, panelOpen }: ChatHeaderProps) => {
  const { name: platformName } = usePlatform();
  const { t } = useI18n();
  return (
    <header className="chat-header">
      {onTogglePanel && <button type="button" className="chat-header__btn chat-header__btn--panel" onClick={onTogglePanel} aria-expanded={panelOpen} aria-label={t("ai.togglePanel", "Tezkor amallar va tarix")} title={t("ai.togglePanel", "Tezkor amallar va tarix")}><PanelLeft size={20} /></button>}
      {onBack && <button type="button" className="chat-header__btn chat-header__btn--back" onClick={onBack} title={t("nav.home", "Bosh sahifa")} aria-label={t("ai.backHome", "Bosh sahifaga qaytish")}><ArrowLeft size={19} /></button>}
      {onOpenHistory && (
        <button
          type="button"
          className="chat-header__btn chat-header__btn--menu"
          onClick={onOpenHistory}
          title={t("ai.history", "So'nggi suhbatlar")}
          aria-label={t("ai.openHistory", "Chat tarixini ochish")}
        >
          <Menu size={18} />
        </button>
      )}

      <div className="chat-header__identity">
        <div className="chat-header__icon">
          <Sparkles size={18} />
          <i className="chat-header__icon-glow" />
        </div>

        <div className="chat-header__text">
          <strong>{title || platformName}</strong>

          <span className="chat-header__status">
            <i />
            {t("ai.online", "Onlayn · Tayyor")}
          </span>
        </div>
      </div>

      <div className="chat-header__actions">
        {onNewChat && (
          <button
            type="button"
            className="chat-header__btn chat-header__btn--newchat"
            onClick={onNewChat}
            title={t("ai.newChat", "Yangi chat")}
            aria-label={t("ai.newChat", "Yangi chat")}
          >
            <Plus size={17} />
          </button>
        )}

        {onClear && (
          <button
            type="button"
            className="chat-header__btn chat-header__btn--clear"
            onClick={onClear}
            title={t("ai.chat.clear", "Suhbatni tozalash")}
            aria-label={t("ai.chat.clear", "Suhbatni tozalash")}
          >
            <Trash2 size={15} />
          </button>
        )}

        {onMinimize && (
          <button
            type="button"
            className="chat-header__btn"
            onClick={onMinimize}
            title={t("common.minimize", "Kichraytirish")}
            aria-label={t("common.minimize", "Kichraytirish")}
          >
            <Minus size={15} />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            className="chat-header__btn chat-header__btn--close"
            onClick={onClose}
            title={t("common.close", "Yopish")}
            aria-label={t("ai.chat.close", "Suhbatni yopish")}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
