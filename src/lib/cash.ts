import { OPENING_CASH } from '@/mocks/purchases';
import type { CashSet, LedgerEntry, Purchase, Sale } from '@/types/domain';

type CashData = { sales: Sale[]; purchases: Purchase[]; ledger: LedgerEntry[]; cashSet: CashSet | null; emptyShop: boolean };

/** Net cash movement of the records: sales + other revenue − other expense − purchases. */
export function cashMovement(d: Pick<CashData, 'sales' | 'purchases' | 'ledger'>, after?: string): number {
  const keep = (iso: string) => !after || iso > after;
  const sales = d.sales.filter((s) => keep(s.createdAt)).reduce((sum, s) => sum + s.total, 0);
  const bought = d.purchases.filter((p) => keep(p.createdAt)).reduce((sum, p) => sum + p.cost, 0);
  const other = d.ledger.filter((e) => keep(e.createdAt)).reduce((sum, e) => sum + (e.kind === 'revenue' ? e.amount : -e.amount), 0);
  return sales + other - bought;
}

/**
 * Cash on hand (PRD §1.4) = sales revenue + other revenue − other expense − purchases.
 * When the owner has set the balance, only movements after that moment are added to it.
 */
export function cashOnHand(d: CashData): number {
  if (d.cashSet) return d.cashSet.amount + cashMovement(d, d.cashSet.at);
  return (d.emptyShop ? 0 : OPENING_CASH) + cashMovement(d);
}
