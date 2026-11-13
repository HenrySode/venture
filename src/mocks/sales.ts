import { customerKey } from '@/lib/format';
import { workdayStart } from '@/lib/workday';
import type { CreditLine, CreditPayment, Product, Sale, SaleKind } from '@/types/domain';

import { demoAccounts } from './accounts';
import { demoProducts } from './products';

/** Deterministic PRNG so the demo history looks the same every launch. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const sellers = demoAccounts.filter((a) => a.role === 'seller' || a.role === 'admin');

export const priceOf = (p: Product, kind: SaleKind) => (kind === 'carton' ? p.sellPriceCarton : p.sellPriceUnit);
export const costOf = (p: Product, kind: SaleKind) => (kind === 'carton' ? p.purchasePriceCarton : p.purchasePriceUnit);

function buildSales(): Sale[] {
  const rand = rng(2026);
  const sales: Sale[] = [];
  const now = Date.now();
  let id = 1;
  let receipt = 100;

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    // Selling hours: from 07:00 into the evening, but never after "now".
    const open = workdayStart(new Date(now - daysAgo * DAY)).getTime() + 2 * HOUR;
    const close = daysAgo === 0 ? now - 10 * 60_000 : open + 14 * HOUR;
    if (close <= open) continue;

    const count = daysAgo === 0 ? 6 + Math.floor(rand() * 4) : 10 + Math.floor(rand() * 10);
    const times = Array.from({ length: count }, () => open + rand() * (close - open)).sort((a, b) => a - b);

    for (const time of times) {
      const product = demoProducts[Math.floor(rand() * demoProducts.length)];
      const kind: SaleKind = product.unitsPerCarton > 1 && rand() < 0.2 ? 'carton' : 'unit';
      const quantity = kind === 'carton' ? 1 : 1 + Math.floor(rand() * 3);
      const seller = sellers[rand() < 0.7 ? 1 : 0] ?? sellers[0];
      const price = priceOf(product, kind);
      sales.push({
        id: id++,
        productId: product.id,
        productName: product.name,
        kind,
        quantity,
        price,
        total: price * quantity,
        cost: costOf(product, kind) * quantity,
        sellerId: seller.id,
        sellerName: seller.name,
        createdAt: new Date(time).toISOString(),
        receiptId: `R${receipt++}`,
        forgotten: false,
        fromCredit: false,
      });
    }
  }
  return sales;
}

type CreditSeed = [customer: string, phone: string | null, productIndex: number, kind: SaleKind, qty: number, daysAgo: number, paid: number];

const creditSeeds: CreditSeed[] = [
  ['Mama Neema', '0754 112 233', 1, 'unit', 1, 5, 18500],
  ['Mama Neema', '0754 112 233', 3, 'unit', 2, 3, 4000],
  ['Mama Neema', '0754 112 233', 0, 'unit', 2, 1, 0],
  ['John Kimaro', '0713 445 566', 12, 'unit', 1, 2, 0],
  ['John Kimaro', '0713 445 566', 7, 'unit', 3, 2, 0],
  ['Halima Saidi', null, 2, 'unit', 2, 4, 0],
  ['Halima Saidi', null, 16, 'unit', 1, 0, 0],
  ['Fundi Musa', '0688 900 100', 19, 'unit', 2, 6, 2000],
];

function buildCredits(): { lines: CreditLine[]; payments: CreditPayment[] } {
  const seller = demoAccounts.find((a) => a.role === 'seller') ?? demoAccounts[0];
  const now = Date.now();
  const lines: CreditLine[] = creditSeeds.map(([name, phone, index, kind, qty, daysAgo, paid], i) => {
    const product = demoProducts[index];
    return {
      id: i + 1,
      customerKey: customerKey(name),
      customerName: name,
      customerPhone: phone,
      productId: product.id,
      productName: product.name,
      kind,
      quantity: qty,
      total: priceOf(product, kind) * qty,
      cost: costOf(product, kind) * qty,
      paid,
      sellerId: seller.id,
      sellerName: seller.name,
      createdAt: new Date(now - daysAgo * DAY - 3 * HOUR).toISOString(),
    };
  });

  // One payment per customer that covers what the seed says was paid.
  const paidByCustomer = new Map<string, number>();
  for (const l of lines) paidByCustomer.set(l.customerKey, (paidByCustomer.get(l.customerKey) ?? 0) + l.paid);
  const payments: CreditPayment[] = [...paidByCustomer.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([key, amount], i) => ({ id: i + 1, customerKey: key, amount, receivedById: seller.id, createdAt: new Date(now - (i + 1) * DAY).toISOString() }));

  return { lines, payments };
}

export const demoSales = buildSales();
export const demoCredits = buildCredits();
