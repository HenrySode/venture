import type { Sale } from '@/types/domain';

export type SalesSummary = { revenue: number; cost: number; profit: number; count: number };

/** Revenue, cost of goods sold, and profit (P&L) for a set of sales. */
export function summarize(sales: Sale[]): SalesSummary {
  let revenue = 0;
  let cost = 0;
  for (const s of sales) {
    revenue += s.total;
    cost += s.cost;
  }
  return { revenue, cost, profit: revenue - cost, count: sales.length };
}

/** Margin as a whole percent of revenue ("—" when nothing was sold). */
export const marginText = (profit: number, revenue: number) => (revenue > 0 ? `${Math.round((profit / revenue) * 100)}%` : '—');
