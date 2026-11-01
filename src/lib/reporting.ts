export const reportTimeZone = "America/Argentina/Buenos_Aires";
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: reportTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function localDateKey(value: Date | string) {
  return dayFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}
export function todayKey() {
  return localDateKey(new Date());
}
export function validDateKey(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function exportRange(from: string, to: string) {
  const start = new Date(from),
    end = new Date(to);
  const span = end.getTime() - start.getTime();
  return Number.isFinite(span) && span > 0 && span <= 366 * 86400000
    ? { from: start.toISOString(), to: end.toISOString() }
    : null;
}
export function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00-03:00`);
  return {
    from: start.toISOString(),
    to: new Date(start.getTime() + 86400000).toISOString(),
  };
}
