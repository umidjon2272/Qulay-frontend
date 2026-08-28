import type { TelegramCandidate } from "./routerTypes";

const normalize = (value: string) => value.trim().normalize("NFKC").toLocaleLowerCase("uz-UZ");

const selectedIndex = (input: string): number | null => {
  const value = normalize(input);
  const numeric = value.match(/^(\d+)\s*(?:-?\s*chisi(?:ni)?)?$/);
  if (numeric) return Number(numeric[1]) - 1;
  const words: Record<string, number> = {
    birinchisi: 0, ikkinchisi: 1, uchinchisi: 2,
    "to‘rtinchisi": 3, "to'rtinchisi": 3, beshinchisi: 4,
  };
  return words[value] ?? null;
};

export const matchTelegramCandidate = (input: string, candidates: TelegramCandidate[]): TelegramCandidate | null => {
  const index = selectedIndex(input);
  if (index !== null) return candidates[index] ?? null;
  const query = normalize(input).replace(/^@/, "");
  const matches = candidates.filter((candidate) => {
    const username = normalize(candidate.username ?? "").replace(/^@/, "");
    return normalize(candidate.displayName) === query || username === query;
  });
  return matches.length === 1 ? matches[0] : null;
};
