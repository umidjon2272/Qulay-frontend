export type TelegramCandidate = {
  peerId: string;
  displayName: string;
  username: string | null;
};

export type TelegramSelection = {
  mode: "search_result" | "send_recipient";
  pendingText?: string;
  candidates: TelegramCandidate[];
};
