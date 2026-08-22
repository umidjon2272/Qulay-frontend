import { Sparkles } from "lucide-react";

import "./VoiceOrb.scss";

export type VoiceOrbState = "idle" | "listening" | "processing" | "speaking" | "error";

type VoiceOrbProps = {
  state: VoiceOrbState;
};

const VoiceOrb = ({ state }: VoiceOrbProps) => {
  return (
    <div className={`voice-orb voice-orb--${state}`} role="img" aria-label={`AI holati: ${state}`}>
      <span className="voice-orb__ring voice-orb__ring--outer" />
      <span className="voice-orb__ring voice-orb__ring--middle" />
      <span className="voice-orb__ring voice-orb__ring--inner" />
      <span className="voice-orb__core">
        <span className="voice-orb__shine" />
        <Sparkles size={34} strokeWidth={1.7} />
      </span>
    </div>
  );
};

export default VoiceOrb;
