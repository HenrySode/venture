import type { CreditLine } from '@/types/domain';

export const lineOwed = (l: CreditLine) => Math.max(0, l.total - l.paid);
export const isLineOpen = (l: CreditLine) => lineOwed(l) > 0;

export type Debtor = {
  key: string;
  name: string;
  phone: string | null;
  owed: number;
  openLines: number;
  /** Oldest open line — how long they have owed. */
  since: string;
  lastAt: string;
};

/** Customers who still owe something, biggest debt first. */
export function debtors(lines: CreditLine[]): Debtor[] {
  const map = new Map<string, Debtor>();
  for (const l of lines) {
    if (!isLineOpen(l)) continue;
    const d = map.get(l.customerKey);
    if (!d) {
      map.set(l.customerKey, { key: l.customerKey, name: l.customerName, phone: l.customerPhone, owed: lineOwed(l), openLines: 1, since: l.createdAt, lastAt: l.createdAt });
    } else {
      d.owed += lineOwed(l);
      d.openLines += 1;
      if (l.createdAt < d.since) d.since = l.createdAt;
      if (l.createdAt > d.lastAt) d.lastAt = l.createdAt;
      d.phone ??= l.customerPhone;
    }
  }
  return [...map.values()].sort((a, b) => b.owed - a.owed);
}

/** Distinct customer names ever given credit, for suggestions. */
export function customerNames(lines: CreditLine[]): { key: string; name: string; phone: string | null }[] {
  const map = new Map<string, { key: string; name: string; phone: string | null }>();
  for (const l of lines) if (!map.has(l.customerKey)) map.set(l.customerKey, { key: l.customerKey, name: l.customerName, phone: l.customerPhone });
  return [...map.values()];
}

export type PaymentResult = {
  applied: number;
  /** Lines this payment fully paid. */
  cleared: number;
  /** Money that went to the oldest line without clearing it (held back until it's fully paid). */
  heldBack: number;
};

/**
 * Applies a payment oldest-line-first (PRD §1.4). Pure: returns the updated
 * lines plus a summary for the confirmation message.
 */
export function applyPayment(lines: CreditLine[], key: string, amount: number): { lines: CreditLine[]; result: PaymentResult } {
  let left = amount;
  let cleared = 0;
  let heldBack = 0;
  const order = lines
    .filter((l) => l.customerKey === key && isLineOpen(l))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((l) => l.id);
  const updates = new Map<number, number>();

  for (const id of order) {
    if (left <= 0) break;
    const line = lines.find((l) => l.id === id)!;
    const pay = Math.min(left, lineOwed(line));
    left -= pay;
    updates.set(id, line.paid + pay);
    if (pay === lineOwed(line)) cleared += 1;
    else heldBack = pay;
  }

  return {
    lines: lines.map((l) => (updates.has(l.id) ? { ...l, paid: updates.get(l.id)! } : l)),
    result: { applied: amount - left, cleared, heldBack },
  };
}
