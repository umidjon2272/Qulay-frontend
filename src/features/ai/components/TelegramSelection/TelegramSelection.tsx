import { useState } from "react";
import { Send } from "lucide-react";

import type { TelegramCandidate, TelegramSelection as TelegramSelectionData } from "../../context/AIChatContextValue";

import "./TelegramSelection.scss";

const TYPE_LABELS = { USER: "Foydalanuvchi", GROUP: "Guruh", CHANNEL: "Kanal" } as const;

type TelegramSelectionProps = {
  selection: TelegramSelectionData;
  onSelect?: (candidate: TelegramCandidate) => void;
};

const TelegramSelectionCard = ({ selection, onSelect }: TelegramSelectionProps) => {
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

  return (
    <div className="telegram-selection">
      <div className="telegram-selection__icon">
        <Send size={14} />
      </div>

      <div className="telegram-selection__list">
        {selection.candidates.map((candidate) => (
          <button
            type="button"
            key={candidate.peerId}
            className={`telegram-selection__option ${selection.mode === "search_result" ? "telegram-selection__option--result" : ""}`}
            disabled={selection.mode === "search_result" || selectedPeerId !== null}
            onClick={() => {
              if (selection.mode !== "send_recipient" || !onSelect) return;
              setSelectedPeerId(candidate.peerId);
              onSelect(candidate);
            }}
          >
            <span className="telegram-selection__identity">
              <span className="telegram-selection__name">{candidate.displayName}</span>
              <small className="telegram-selection__type">{TYPE_LABELS[candidate.type]}</small>
            </span>
            {candidate.username && <span className="telegram-selection__username">{candidate.username.startsWith("@") ? candidate.username : `@${candidate.username}`}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TelegramSelectionCard;
