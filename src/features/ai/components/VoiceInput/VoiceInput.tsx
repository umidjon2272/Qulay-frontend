import { Mic } from "lucide-react";
import { useI18n } from "../../../../i18n/useI18n";

import "./VoiceInput.scss";

type VoiceInputProps = {
  interimText?: string;
};

const VoiceInput = ({ interimText }: VoiceInputProps) => {
  const { t } = useI18n();
  return (
    <div className="voice-input">
      <div className="voice-input__mic">
        <span className="voice-input__ring voice-input__ring--one" />
        <span className="voice-input__ring voice-input__ring--two" />
        <span className="voice-input__ring voice-input__ring--three" />

        <Mic size={16} />
      </div>

      <div className="voice-input__text">
        <strong>{t("voice.listening", "Tinglayapman...")}</strong>

        <span>{interimText || t("voice.speakHint", "Gapiring, matn avtomatik yoziladi")}</span>
      </div>
    </div>
  );
};

export default VoiceInput;
