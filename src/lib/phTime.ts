// src/lib/phTime.ts
function phParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function attendanceDayPH(d = new Date()): string {
  const p = phParts(d);

  // attendance "day" starts at 6:00 AM PH
  // if before 6AM -> belongs to previous date
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0));
  if (p.hour < 6) date.setUTCDate(date.getUTCDate() - 1);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`; // YYYY-MM-DD
}
