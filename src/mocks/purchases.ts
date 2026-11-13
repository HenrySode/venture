import type { LedgerEntry, Purchase, PurchaseOrder, Supplier } from '@/types/domain';

import { demoAccounts } from './accounts';
import { demoProducts } from './products';

const DAY = 864e5;
const ago = (days: number, hour = 10) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

/** Cash in the drawer before the history below (makes the cash-on-hand check meaningful). */
export const OPENING_CASH = 1_500_000;

export const demoSuppliers: Supplier[] = [
  { id: 1, name: 'Bakhresa Distributors', phone: '0754 300 100', place: 'Moshi Mjini', notes: 'Unga, sugar, juice. Delivers Tuesdays.', createdAt: ago(60) },
  { id: 2, name: 'Kilimanjaro Wholesalers', phone: '0713 222 909', place: 'Soko Kuu, Moshi', notes: null, createdAt: ago(45) },
  { id: 3, name: 'Moshi Soda Depot', phone: '0688 777 321', place: 'Pasua', notes: 'Return empty crates.', createdAt: ago(30) },
];

const stockUser = demoAccounts.find((a) => a.role === 'stock') ?? demoAccounts[0];

type Seed = [productIndex: number, cartons: number, units: number, supplierId: number | null, daysAgo: number, invoice: string | null];

const seeds: Seed[] = [
  [0, 4, 0, 1, 20, 'BD-2231'],
  [2, 5, 0, 1, 20, 'BD-2231'],
  [10, 2, 0, 1, 20, 'BD-2231'],
  [7, 10, 0, 3, 16, 'MSD-118'],
  [8, 6, 0, 3, 16, 'MSD-118'],
  [9, 12, 0, 3, 16, 'MSD-118'],
  [1, 6, 0, 2, 12, 'KW-0045'],
  [3, 3, 0, 2, 12, 'KW-0045'],
  [5, 4, 0, 2, 12, 'KW-0045'],
  [11, 2, 0, 2, 9, null],
  [12, 2, 0, 2, 9, null],
  [15, 0, 30, null, 6, null],
  [16, 0, 10, null, 5, null],
  [0, 2, 0, 1, 3, 'BD-2290'],
  [17, 3, 0, 2, 2, 'KW-0061'],
  [7, 5, 0, 3, 1, 'MSD-131'],
];

export const demoPurchases: Purchase[] = seeds.map(([index, cartons, units, supplierId, daysAgo, invoice], i) => {
  const p = demoProducts[index];
  const supplier = demoSuppliers.find((s) => s.id === supplierId) ?? null;
  return {
    id: i + 1,
    productId: p.id,
    productName: p.name,
    cartons,
    units,
    cost: cartons * p.purchasePriceCarton + units * p.purchasePriceUnit,
    supplierId,
    supplierName: supplier?.name ?? null,
    invoice,
    note: null,
    orderId: null,
    byId: stockUser.id,
    createdAt: ago(daysAgo, 9 + (i % 6)),
  };
});

export const demoOrders: PurchaseOrder[] = [
  {
    id: 1,
    supplierId: 3,
    lines: [
      { productId: 8, cartons: 10, units: 0, costCarton: 9600, costUnit: 800 },
      { productId: 9, cartons: 8, units: 0, costCarton: 9000, costUnit: 750 },
    ],
    notes: 'Ask for the new Pepsi price list.',
    status: 'draft',
    createdAt: ago(1, 16),
    receivedAt: null,
  },
  {
    id: 2,
    supplierId: 2,
    lines: [
      { productId: 18, cartons: 3, units: 0, costCarton: 9600, costUnit: 400 },
      { productId: 6, cartons: 2, units: 0, costCarton: 55200, costUnit: 2300 },
    ],
    notes: null,
    status: 'received',
    createdAt: ago(10, 11),
    receivedAt: ago(9, 14),
  },
];

const owner = demoAccounts[0];

export const demoLedger: LedgerEntry[] = [
  { id: 1, kind: 'expense', amount: 150000, note: 'Kodi ya duka (rent)', byId: owner.id, createdAt: ago(18, 9) },
  { id: 2, kind: 'expense', amount: 20000, note: 'LUKU (umeme)', byId: owner.id, createdAt: ago(11, 12) },
  { id: 3, kind: 'revenue', amount: 12500, note: 'M-Pesa commission', byId: owner.id, createdAt: ago(7, 17) },
  { id: 4, kind: 'expense', amount: 8000, note: 'Usafiri wa mzigo (transport)', byId: owner.id, createdAt: ago(3, 15) },
  { id: 5, kind: 'expense', amount: 3000, note: 'Mifuko (bags)', byId: owner.id, createdAt: ago(0, 8) },
];
