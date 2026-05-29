function toIstParts(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }
      return parts;
    }, {});
}

export function getIstDayRange(date = new Date()) {
  const parts = toIstParts(date);
  const isoDate = `${parts.year}-${parts.month}-${parts.day}`;
  const start = new Date(`${isoDate}T00:00:00.000+05:30`);
  const end = new Date(`${isoDate}T23:59:59.999+05:30`);
  return { start, end };
}

export function formatReadableDate(value?: string | Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatReadableDateTime(value?: string | Date | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isTodayIst(value?: string | Date | null) {
  if (!value) return false;
  const { start, end } = getIstDayRange();
  const date = new Date(value);
  return date >= start && date <= end;
}
