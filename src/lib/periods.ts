import type { Locale } from '@/i18n';

import { formatDate, formatMonth, isoDay } from './format';
import { workdayDate, workdayKey } from './workday';

export type PeriodKind = 'today' | 'week' | 'month' | 'year' | 'all';
export type Period = { kind: PeriodKind } | { kind: 'day'; key: string };

/** Monday of the current workday's week, as a workday key. */
function weekStartKey(): string {
  const d = workdayDate(workdayKey());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}

/** True when the timestamp's workday falls inside the period. */
export function inPeriod(iso: string, period: Period): boolean {
  const key = workdayKey(iso);
  const today = workdayKey();
  switch (period.kind) {
    case 'today':
      return key === today;
    case 'day':
      return key === period.key;
    case 'week':
      return key >= weekStartKey() && key <= today;
    case 'month':
      return key.slice(0, 7) === today.slice(0, 7);
    case 'year':
      return key.slice(0, 4) === today.slice(0, 4);
    default:
      return true;
  }
}

/** The last `n` workday keys, newest first. */
export function recentWorkdays(n: number): string[] {
  const out: string[] = [];
  const d = workdayDate(workdayKey());
  for (let i = 0; i < n; i++) {
    out.push(isoDay(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export type Bucket = 'day' | 'week' | 'month';

/** Groups a timestamp by calendar day, week (from Monday), or month. */
export function bucketKey(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  if (bucket === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (bucket === 'week') {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return isoDay(monday);
  }
  return isoDay(d);
}

/** Label for a bucket key; `weekOf` formats "Week of {date}". */
export function bucketLabel(key: string, bucket: Bucket, locale: Locale, weekOf: (date: string) => string): string {
  if (bucket === 'month') return formatMonth(`${key}-15T12:00:00`, locale);
  const date = formatDate(`${key}T12:00:00`, locale);
  return bucket === 'week' ? weekOf(date) : date;
}
