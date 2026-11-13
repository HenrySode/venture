import type { Product, SaleKind } from '@/types/domain';

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Everything on the shelf, counted in single units. */
export const totalUnits = (p: Product) => p.stockCartons * p.unitsPerCarton + p.stockUnits;

/** Products with one unit per carton are sold by the piece only. */
export const sellsByCarton = (p: Product) => p.unitsPerCarton > 1;

/** How many of `kind` can still be sold. */
export function available(p: Product, kind: SaleKind): number {
  return kind === 'carton' ? p.stockCartons : round(totalUnits(p));
}

/**
 * Removes stock for a sale. Units come from loose stock first, then a carton
 * is opened. Returns null when there is not enough.
 */
export function takeStock(p: Product, kind: SaleKind, qty: number): Product | null {
  if (qty <= 0) return p;
  if (kind === 'carton') {
    return p.stockCartons >= qty ? { ...p, stockCartons: p.stockCartons - qty } : null;
  }
  if (p.stockUnits >= qty) return { ...p, stockUnits: round(p.stockUnits - qty) };
  const deficit = qty - p.stockUnits;
  const open = Math.ceil(deficit / p.unitsPerCarton);
  if (open > p.stockCartons) return null;
  return { ...p, stockCartons: p.stockCartons - open, stockUnits: round(p.stockUnits + open * p.unitsPerCarton - qty) };
}

/** Puts stock back (unsell, removed credit line). */
export function returnStock(p: Product, kind: SaleKind, qty: number): Product {
  return kind === 'carton' ? { ...p, stockCartons: p.stockCartons + qty } : { ...p, stockUnits: round(p.stockUnits + qty) };
}

/** Cost of the stock on the shelf, at purchase price. */
export const stockValue = (p: Product) => p.stockCartons * p.purchasePriceCarton + p.stockUnits * p.purchasePriceUnit;
