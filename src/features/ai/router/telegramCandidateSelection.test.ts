import { describe, expect, it } from "vitest";
import { matchTelegramCandidate } from "./telegramCandidateSelection";
import type { TelegramCandidate } from "./routerTypes";

const candidates: TelegramCandidate[] = [
  { peerId: "90071992547409931234", type: "USER", displayName: "Aziz", username: "umidwwu" },
  { peerId: "2", type: "USER", displayName: "Aziz Aka", username: "aziz_aka" },
];

describe("matchTelegramCandidate", () => {
  it.each(["1", "1-chisi", "1 chisini", "birinchisi"])("selects the first candidate from %s", (input) => {
    expect(matchTelegramCandidate(input, candidates)?.peerId).toBe("90071992547409931234");
  });

  it("selects a unique username case-insensitively", () => {
    expect(matchTelegramCandidate("@UMIDWWU", candidates)?.peerId).toBe("90071992547409931234");
  });

  it("selects a unique exact display name and rejects ambiguous names", () => {
    expect(matchTelegramCandidate("Aziz Aka", candidates)?.peerId).toBe("2");
    expect(matchTelegramCandidate("Aziz", [...candidates, { ...candidates[1], peerId: "3", displayName: "Aziz" }])).toBeNull();
  });
});
