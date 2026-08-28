/**
 * Deterministic detectors for the remaining registry-backed READ intents:
 * finance summary, contact lookup and memory lookup. Task/reminder/meeting/
 * note/today-plan detection lives in `../actions/aiActions.ts` and is reused
 * as-is by the router.
 */

const normalize = (input: string) =>
  input
    .toLocaleLowerCase("uz-UZ")
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export const isFinanceSummaryIntent = (raw: string): boolean => {
  const normalized = normalize(raw);
  return /\b(moliya(m|si|viy)?|xarajat(im|larim)?|daromad(im|larim)?|balans(im)?)\b/.test(normalized);
};

export const detectContactLookup = (raw: string): { query: string } | null => {
  const normalized = normalize(raw);
  const match = normalized.match(/(.+?)\s*(?:ning|neng)?\s*kontakt(?:i(?:ni|si)?|ini)?\s*(?:ma'lumotini|raqamini)?\s*(?:top|qidir|izla)(?:ing)?\b/u);
  if (!match) return null;
  const query = match[1].trim();
  return query ? { query } : null;
};

export const detectMemoryLookup = (raw: string): { query: string } | null => {
  const normalized = normalize(raw);
  const match = normalized.match(/(.+?)\s+haqida\s+(?:nima(?:lar)?\s*bilasan|eslaganing(?:ni)?|xotira(?:m|ng)?da(?:gi)?|eslab qolgan(?:ing)?|ma'lumot(?:ing)?\s*bor(?:mi)?)\b/u);
  if (!match) return null;
  const query = match[1].trim();
  return query ? { query } : null;
};
