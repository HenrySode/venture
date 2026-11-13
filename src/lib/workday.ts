/**
 * Workday rules (PRD §1.4): the shop day runs 05:00 → 02:00 the next morning.
 * "Today" always means the current workday, so a sale at 01:30 belongs to the
 * previous calendar date. Times use the device clock (the app targets EAT).
 */
export const WORKDAY_OPEN_HOUR = 5;
export const WORKDAY_CLOSE_HOUR = 2;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-11" — the workday a moment belongs to. */
export function workdayKey(input: Date | string = new Date()): string {
  const d = new Date(typeof input === 'string' ? input : input.getTime());
  d.setHours(d.getHours() - WORKDAY_OPEN_HOUR);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isToday = (iso: string) => workdayKey(iso) === workdayKey();

/** Calendar date of a workday key, at noon (safe for formatting). */
export const workdayDate = (key: string) => new Date(`${key}T12:00:00`);

/** True between opening (05:00) and closing (02:00 next day). */
export function isBusinessHours(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= WORKDAY_OPEN_HOUR || h < WORKDAY_CLOSE_HOUR;
}

/** When the current workday opened. */
export function workdayStart(now: Date = new Date()): Date {
  const d = workdayDate(workdayKey(now));
  d.setHours(WORKDAY_OPEN_HOUR, 0, 0, 0);
  return d;
}
