import type { CSSProperties } from "react";
import { useI18n } from "../../../../i18n/useI18n";

import "./VoiceOrb.scss";

export type VoiceOrbState = "idle" | "listening" | "processing" | "speaking" | "error";

type VoiceOrbProps = {
  state: VoiceOrbState;
  level?: number;
};

const VoiceOrb = ({ state, level = 0 }: VoiceOrbProps) => {
  const { t } = useI18n();
  return (
    <div className={`voice-orb voice-orb--${state}`} style={{ '--voice-level': level } as CSSProperties} role="img" aria-label={t("voice.state", "AI holati: {{state}}", { state })}>
      <span className="voice-orb__core">
        <span className="voice-orb__shine" />
      </span>
    </div>
  );
};

export default VoiceOrb;
