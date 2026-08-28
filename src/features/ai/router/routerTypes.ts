export type TelegramCandidate = {
  peerId: string;
  type: "USER" | "GROUP" | "CHANNEL";
  displayName: string;
  username: string | null;
};

export type TelegramSelection = {
  mode: "search_result" | "send_recipient";
  pendingText?: string;
  candidates: TelegramCandidate[];
};
