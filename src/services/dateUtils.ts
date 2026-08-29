export const getDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

let lastLocalId = 0;

export const createLocalId = (records: readonly { id: number }[] = []): number => {
  const next = Math.max(Date.now(), lastLocalId + 1, ...records.map((record) => record.id + 1));
  lastLocalId = next;
  return next;
};

export const getDateLabel = (dateKey: string, now = new Date(), locale: "uz" | "ru" = "uz"): string => {
  if (dateKey === getDateKey(now)) return locale === "ru" ? "Сегодня" : "Bugun";
  if (dateKey === getDateKey(addDays(now, 1))) return locale === "ru" ? "Завтра" : "Ertaga";

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateKey}T12:00:00`));
};
