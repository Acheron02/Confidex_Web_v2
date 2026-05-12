export const PH_TIME_ZONE = "Asia/Manila";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: PH_TIME_ZONE,
});

function hasTimezone(value: string) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

function parseManilaLocalDate(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/,
  );

  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 8,
      Number(minute),
      Number(second),
    ),
  );
}

export function parseDateTime(value?: string | Date | number | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const date = hasTimezone(raw)
    ? new Date(raw)
    : (parseManilaLocalDate(raw) ?? new Date(raw));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPHDateTime(
  value?: string | Date | number | null,
  fallback = "N/A",
) {
  const date = parseDateTime(value);
  return date ? DATE_TIME_FORMATTER.format(date) : fallback;
}

export function getObjectIdDate(id?: string | null) {
  const cleanId = String(id ?? "").trim();

  if (!/^[a-fA-F0-9]{24}$/.test(cleanId)) return null;

  const seconds = Number.parseInt(cleanId.slice(0, 8), 16);

  if (!Number.isFinite(seconds)) return null;

  return new Date(seconds * 1000);
}
