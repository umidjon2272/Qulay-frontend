import { Mic, Minus, Sparkles, Trash2, X } from "lucide-react";

import { usePlatform } from "../../../../context/PlatformContext";
import { useI18n } from "../../../../i18n/useI18n";

import "./ChatHeader.scss";

type ChatHeaderProps = {
  onClose?: () => void;
  onMinimize?: () => void;
  onClear?: () => void;
  onVoice?: () => void;
};

const ChatHeader = ({ onClose, onMinimize, onClear, onVoice }: ChatHeaderProps) => {
  const { name: platformName } = usePlatform();
  const { t } = useI18n();
  return (
    <header className="chat-header">
      <div className="chat-header__identity">
        <div className="chat-header__icon">
          <Sparkles size={18} />
          <i className="chat-header__icon-glow" />
        </div>

        <div className="chat-header__text">
          <strong>{platformName}</strong>

          <span className="chat-header__status">
            <i />
            {t("ai.online", "Onlayn · Tayyor")}
          </span>
        </div>
      </div>

      <div className="chat-header__actions">
        {onVoice && (
          <button
            type="button"
            className="chat-header__btn chat-header__btn--voice"
            onClick={onVoice}
            title="Voice Mode"
            aria-label="Voice Mode'ni ochish"
          >
            <Mic size={15} />
          </button>
        )}

        {onClear && (
          <button
            type="button"
            className="chat-header__btn"
            onClick={onClear}
            title="Suhbatni tozalash"
            aria-label="Suhbatni tozalash"
          >
            <Trash2 size={15} />
          </button>
        )}

        {onMinimize && (
          <button
            type="button"
            className="chat-header__btn"
            onClick={onMinimize}
            title="Kichraytirish"
            aria-label="Kichraytirish"
          >
            <Minus size={15} />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            className="chat-header__btn chat-header__btn--close"
            onClick={onClose}
            title="Yopish"
            aria-label="Suhbatni yopish"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
