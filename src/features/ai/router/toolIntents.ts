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


export const detectGoogleCalendarLookup = (raw: string): { range: "today" | "tomorrow" | "week" } | null => {
  const normalized = normalize(raw);
  const mentionsCalendar = /(?:\bgoogle\s+calendar\b|\bcalendar\b|\bkalendar\b|\btaqvim\b)/u.test(normalized);
  const asksTodayMeetings = /\b(bugun|bugungi)\b/u.test(normalized) && /\b(uchrashuv|uchrashuvlar|meeting|event)\b/u.test(normalized);
  if (!mentionsCalendar && !asksTodayMeetings) return null;
  if (/(?:yarat|qo['’]?sh|qo['’]?y|rejalashtir|create|add|schedule)/u.test(normalized)) return null;
  if (!/(ko['’]?rsat|ayt|ber|nima|qanday|bor|reja|uchrashuv|meeting|event)/u.test(normalized)) return null;
  if (/\bertaga\b/u.test(normalized)) return { range: "tomorrow" };
  if (/\b(hafta|7\s*kun|keyingi\s+hafta)\b/u.test(normalized)) return { range: "week" };
  if (/\b(bugun|bugungi|hozir)\b/u.test(normalized) || mentionsCalendar) return { range: "today" };
  return null;
};

export const detectGoogleDriveSearch = (raw: string): { query: string } | null => {
  const normalized = normalize(raw);
  if (!/\b(google\s*)?(drive|docs?|dokument|hujjat)\b/u.test(normalized)) return null;

  const patterns = [
    /(?:google\s*)?(?:drive|docs?|dokument|hujjat)(?:dan|da)?\s+(.+?)\s+(?:fayl(?:ini)?|hujjat(?:ni)?|dokument(?:ni)?)?\s*(?:top|qidir|izla)(?:ib\s+ber|ing)?$/u,
    /(.+?)\s+(?:fayl(?:ini)?|hujjat(?:ni)?|dokument(?:ni)?)\s+(?:google\s*)?(?:drive|docs?|dokument)(?:dan|da)?\s*(?:top|qidir|izla)(?:ib\s+ber|ing)?$/u,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const query = match?.[1]?.trim().replace(/^["'“”]+|["'“”]+$/g, "");
    if (query) return { query };
  }

  return null;
};
