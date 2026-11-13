import { createContext, useContext, useState, type ReactNode } from 'react';

import type { SaleKind } from '@/types/domain';

export type BasketLine = { productId: number; kind: SaleKind; quantity: number };

type BasketValue = {
  lines: BasketLine[];
  /** How many each tap on a Sell button sells/adds (1 by default; may be 0.5). */
  tapQty: number;
  setTapQty: (qty: number) => void;
  add: (productId: number, kind: SaleKind, quantity: number) => void;
  setQuantity: (productId: number, kind: SaleKind, quantity: number) => void;
  remove: (productId: number, kind: SaleKind) => void;
  clear: () => void;
};

const BasketContext = createContext<BasketValue | null>(null);

const round = (n: number) => Math.round(n * 1000) / 1000;
const same = (l: BasketLine, productId: number, kind: SaleKind) => l.productId === productId && l.kind === kind;

/** POS basket (Hub "basket sales"): several lines confirmed as one receipt. */
export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [tapQty, setTapQty] = useState(1);

  const value: BasketValue = {
    lines,
    tapQty,
    setTapQty,
    add: (productId, kind, quantity) =>
      setLines((ls) =>
        ls.some((l) => same(l, productId, kind))
          ? ls.map((l) => (same(l, productId, kind) ? { ...l, quantity: round(l.quantity + quantity) } : l))
          : [...ls, { productId, kind, quantity }],
      ),
    setQuantity: (productId, kind, quantity) =>
      setLines((ls) => (quantity <= 0 ? ls.filter((l) => !same(l, productId, kind)) : ls.map((l) => (same(l, productId, kind) ? { ...l, quantity } : l)))),
    remove: (productId, kind) => setLines((ls) => ls.filter((l) => !same(l, productId, kind))),
    clear: () => setLines([]),
  };

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketValue {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used inside <BasketProvider>');
  return ctx;
}
