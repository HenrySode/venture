import type { Locale } from '@/i18n';

/** Groups digits with commas without relying on Intl (consistent on Hermes, Android and web). */
export function formatNumber(value: number, fractionDigits = 0): string {
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 ? '−' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** "TSH 12,500" — matches the web app's currency style. */
export function formatTsh(value: number): string {
  return `TSH ${formatNumber(Math.round(value))}`;
}

const MONTHS: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

/** "13 Nov 2026" / "13 Nov 2026" (sw month abbreviations). */
export function formatDate(input: Date | string, locale: Locale): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getDate()} ${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
}

/** Local Tanzanian mobile number formatter: "0712 345 678". */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('255') ? `0${digits.slice(3)}` : digits;
  if (local.length !== 10) return raw;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** Accepts 07xx/06xx local numbers or +255 / 255 international form. */
export function isValidTzPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('255') ? `0${digits.slice(3)}` : digits;
  return /^0[67]\d{8}$/.test(local);
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '');
}

/** "14:05" (24-hour, as used in Tanzanian shops). */
export function formatTime(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Quantities may be fractional for units: 1 → "1", 0.5 → "0.5", 1.25 → "1.25". */
export function formatQty(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** Lower-case, single-spaced key used to group credit lines per customer. */
export const customerKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Every typed word must appear (web app search: "pepsi 600"). */
export function matchesAllWords(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/** Product search: name, category, barcode, and names merged into it. */
export function productMatches(p: { name: string; category: string; barcode: string | null; aliases: string[] }, query: string): boolean {
  return matchesAllWords(query, p.name, p.category, p.barcode, ...p.aliases);
}

/** Whole days from today until the date (negative once past). */
export function daysUntil(iso: string): number {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - start.getTime()) / 864e5);
}

/** "2026-11-11" from a Date (local). */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Nov 2026" / "Nov 2026" (sw month abbreviations). */
export function formatMonth(input: Date | string, locale: Locale): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
}
