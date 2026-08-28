/**
 * Deterministic Telegram intent detection for the AI chat router.
 * Runs on the raw (non-lowercased) input so recipient names and message
 * text keep their original casing; verbs are still matched case-insensitively.
 */

export type TelegramSendMatch = { recipientRaw: string; text: string };
export type TelegramSearchMatch = { query: string };

const QUOTE_PAIR = /["'«“‘]([^"'»”’]+)["'»”’]/u;
const SEND_VERB = /(?:deb\s+)?(?:yoz|yubor|jo['’]nat)(?:ing|ib)?\.?\s*$/iu;

const stripTrailingDeb = (value: string) => value.replace(/\s+deb$/iu, "").trim();

/**
 * Detects Telegram *send* commands such as:
 *  - "Azizga 'Salom, ishlar yaxshimi?' deb yoz."
 *  - "Telegram orqali Azizga hisobotni yubor deb ayt"
 *  - "@username ga salom deb yoz"
 * Returns the raw recipient token (name or "@username") and the message text.
 */
export const detectTelegramSend = (raw: string): TelegramSendMatch | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // "@username ga '...' yoz/yubor" or "@username ga ... yubor" (quoted or not).
  let match = trimmed.match(/@([\w.]{2,32})\s*(?:ga|ka|qa)?\s*(.+)$/iu);
  if (match && SEND_VERB.test(match[2])) {
    const rest = match[2].replace(SEND_VERB, "").trim();
    const quoted = rest.match(QUOTE_PAIR);
    const text = quoted ? quoted[1].trim() : stripTrailingDeb(rest);
    if (text) return { recipientRaw: `@${match[1]}`, text };
  }

  // "<Ism>ga '...' deb yoz/yubor" (quoted message, dative suffix attached to the name).
  match = trimmed.match(/([\p{L}][\p{L}'’-]{1,40}?)(?:ga|ka|qa)\s+["'«“‘]([^"'»”’]+)["'»”’]\s*(?:deb\s+)?(?:yoz|yubor|jo['’]nat)(?:ing|ib)?\.?\s*$/iu);
  if (match) return { recipientRaw: match[1], text: match[2].trim() };

  // "<Ism>ga <matn> deb yoz/yubor" (unquoted message, explicit "deb").
  match = trimmed.match(/([\p{L}][\p{L}'’-]{1,40}?)(?:ga|ka|qa)\s+(.+?)\s+deb\s+(?:yoz|yubor|jo['’]nat)(?:ing|ib)?\.?\s*$/iu);
  if (match) return { recipientRaw: match[1], text: match[2].trim() };

  // "Telegram orqali <Ism>ga <matn> yubor/yoz" (no "deb").
  match = trimmed.match(/telegram\s+orqali\s+([\p{L}][\p{L}'’-]{1,40}?)(?:ga|ka|qa)\s+(.+?)\s+(?:yubor|yoz)(?:ing|ib)?\.?\s*$/iu);
  if (match) return { recipientRaw: match[1], text: stripTrailingDeb(match[2]) };

  return null;
};

/**
 * Detects Telegram *search* commands such as:
 *  - "Telegramdan Azizni top"
 *  - "Telegramda Azizni qidir"
 *  - "@username ni top"
 */
export const detectTelegramSearch = (raw: string): TelegramSearchMatch | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let match = trimmed.match(/telegram(?:dan|da)\s+(.+?)\s*ni\s*(?:top|qidir|izla)(?:ing)?\.?\s*$/iu);
  if (match) return { query: match[1].trim() };

  match = trimmed.match(/@([\w.]{2,32})\s*ni\s*(?:top|qidir|izla)(?:ing)?\.?\s*$/iu);
  if (match) return { query: `@${match[1]}` };

  match = trimmed.match(/telegram(?:da|dan)\s+(.+?)\s*(?:qidir|izla|top)(?:ing)?\.?\s*$/iu);
  if (match) return { query: match[1].trim() };

  return null;
};
