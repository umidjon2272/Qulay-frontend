import { Mic } from "lucide-react";

import "./VoiceInput.scss";

type VoiceInputProps = {
  interimText?: string;
};

const VoiceInput = ({ interimText }: VoiceInputProps) => {
  return (
    <div className="voice-input">
      <div className="voice-input__mic">
        <span className="voice-input__ring voice-input__ring--one" />
        <span className="voice-input__ring voice-input__ring--two" />
        <span className="voice-input__ring voice-input__ring--three" />

        <Mic size={16} />
      </div>

      <div className="voice-input__text">
        <strong>Tinglayapman...</strong>

        <span>{interimText || "Gapiring, matn avtomatik yoziladi"}</span>
      </div>
    </div>
  );
};

export default VoiceInput;
