import { createContext, useContext, useReducer, type ReactNode } from 'react';

import { applyPayment, isLineOpen, type PaymentResult } from '@/lib/credits';
import { customerKey } from '@/lib/format';
import { returnStock, takeStock, totalUnits } from '@/lib/stock';
import { demoActivity, demoBackupAt } from '@/mocks/activity';
import { demoProducts } from '@/mocks/products';
import { demoLedger, demoOrders, demoPurchases, demoSuppliers } from '@/mocks/purchases';
import { costOf, demoCredits, demoSales, priceOf } from '@/mocks/sales';
import { devNetwork } from '@/services/client';
import { useSession } from '@/state/session';
import type {
  ActivityAction,
  ActivityEntry,
  Backup,
  BooksClosure,
  CashSet,
  LedgerEntry,
  CreditLine,
  CreditPayment,
  OrderLine,
  Product,
  Purchase,
  PurchaseOrder,
  RestoreScope,
  Sale,
  SaleKind,
  StockAdjustment,
  StockAdjustmentReason,
  Supplier,
  User,
} from '@/types/domain';

/**
 * In-memory business data for the demo shop. Actions change it like the real
 * backend would (stock goes down on a sale and back up on unsell), so flows
 * feel real for the session. Nothing is persisted.
 */

export type SaleLineInput = { productId: number; kind: SaleKind; quantity: number };

/** Editable product fields (form). Stock is only set when creating. */
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'aliases'>;

export type RestockInput = {
  productId: number;
  cartons: number;
  units: number;
  supplierId: number | null;
  invoice: string | null;
  note: string | null;
};

export type CountEntry = { productId: number; cartons: number; units: number; reason: StockAdjustmentReason };

export type SupplierInput = Omit<Supplier, 'id' | 'createdAt'>;
export type OrderInput = { supplierId: number; lines: OrderLine[]; notes: string | null };

type State = {
  products: Product[];
  sales: Sale[];
  credits: CreditLine[];
  payments: CreditPayment[];
  closures: BooksClosure[];
  suppliers: Supplier[];
  purchases: Purchase[];
  orders: PurchaseOrder[];
  adjustments: StockAdjustment[];
  ledger: LedgerEntry[];
  cashSet: CashSet | null;
  /** Audit feed, newest last. */
  activity: ActivityEntry[];
  /** Saved copies of the data (this device only in the demo). */
  backups: Backup[];
  /** Sales saved while "offline" (demo), waiting to sync. */
  queued: number;
  emptyShop: boolean;
  nextId: number;
};

type Action =
  | { type: 'sell'; lines: SaleLineInput[]; seller: User; receiptId: string; at: string; forgotten: boolean }
  | { type: 'unsell'; saleId: number }
  | { type: 'unsellReceipt'; receiptId: string }
  | { type: 'credit'; name: string; phone: string | null; lines: SaleLineInput[]; seller: User; at: string }
  | { type: 'pay'; key: string; amount: number; by: User; at: string }
  | { type: 'removeCreditLine'; id: number }
  | { type: 'closeBooks'; closure: BooksClosure }
  | { type: 'reopenBooks'; workday: string; sellerId: number }
  | { type: 'sync' }
  | { type: 'addProduct'; id: number; input: ProductInput; at: string }
  | { type: 'updateProduct'; id: number; input: ProductInput }
  | { type: 'restock'; id: number; input: RestockInput; by: User; at: string }
  | { type: 'removePurchase'; id: number }
  | { type: 'merge'; keepId: number; mergeIds: number[]; category: string | null }
  | { type: 'applyCount'; entries: CountEntry[]; by: User; at: string; firstId: number }
  | { type: 'saveSupplier'; id: number; input: SupplierInput; at: string }
  | { type: 'saveOrder'; id: number; input: OrderInput; at: string }
  | { type: 'deleteOrder'; id: number }
  | { type: 'addEntry'; entry: LedgerEntry }
  | { type: 'deleteEntry'; id: number }
  | { type: 'setCash'; cashSet: CashSet | null }
  | { type: 'receiveOrder'; id: number; by: User; at: string; firstId: number }
  | { type: 'setEmptyShop'; empty: boolean }
  | { type: 'log'; entry: ActivityEntry }
  | { type: 'backup'; backup: Backup }
  | { type: 'restore'; backup: Backup; scope: RestoreScope }
  | { type: 'reset'; scope: ResetScope };

/** "salesPurchases" keeps products and suppliers; "all" starts the shop empty. */
export type ResetScope = 'salesPurchases' | 'all';

/** Thrown when a line asks for more than is on the shelf. */
export class StockError extends Error {
  constructor(readonly productName: string) {
    super(`Not enough stock: ${productName}`);
    this.name = 'StockError';
  }
}

/** Copies the parts of the data a backup holds. */
const snapshot = (s: State, id: number, createdAt: string): Backup => ({
  id,
  createdAt,
  products: s.products,
  sales: s.sales,
  credits: s.credits,
  payments: s.payments,
  suppliers: s.suppliers,
  purchases: s.purchases,
  orders: s.orders,
  ledger: s.ledger,
  adjustments: s.adjustments,
});

const initialState = (): State => {
  const base = seedState();
  return { ...base, backups: [snapshot(base, 1, demoBackupAt)] };
};

const seedState = (): State => ({
  products: demoProducts,
  sales: demoSales,
  credits: demoCredits.lines,
  payments: demoCredits.payments,
  closures: [],
  suppliers: demoSuppliers,
  purchases: demoPurchases,
  orders: demoOrders,
  adjustments: [],
  ledger: demoLedger,
  cashSet: null,
  activity: demoActivity,
  backups: [],
  queued: 0,
  emptyShop: false,
  nextId: 10_000,
});

/** Applies stock changes for every line; null if any line can't be filled. */
function takeLines(products: Product[], lines: SaleLineInput[]): Product[] | null {
  let next = products;
  for (const line of lines) {
    const p = next.find((x) => x.id === line.productId);
    const updated = p ? takeStock(p, line.kind, line.quantity) : null;
    if (!updated) return null;
    next = next.map((x) => (x.id === updated.id ? updated : x));
  }
  return next;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const addStock = (p: Product, cartons: number, units: number): Product => ({
  ...p,
  stockCartons: p.stockCartons + cartons,
  stockUnits: round3(p.stockUnits + units),
});

/** Takes stock away without going below zero (removing a purchase). */
function subtractStock(p: Product, cartons: number, units: number): Product {
  const left = Math.max(0, totalUnits(p) - (cartons * p.unitsPerCarton + units));
  if (p.unitsPerCarton <= 1) return { ...p, stockCartons: 0, stockUnits: left };
  return { ...p, stockCartons: Math.floor(left / p.unitsPerCarton), stockUnits: round3(left % p.unitsPerCarton) };
}

function makePurchase(
  state: State,
  id: number,
  input: RestockInput,
  by: User,
  at: string,
  orderId: number | null,
  costs?: { carton: number; unit: number },
): Purchase | null {
  const p = state.products.find((x) => x.id === input.productId);
  if (!p) return null;
  const supplier = state.suppliers.find((x) => x.id === input.supplierId) ?? null;
  return {
    id,
    productId: p.id,
    productName: p.name,
    cartons: input.cartons,
    units: input.units,
    cost: input.cartons * (costs?.carton ?? p.purchasePriceCarton) + input.units * (costs?.unit ?? p.purchasePriceUnit),
    supplierId: supplier?.id ?? null,
    supplierName: supplier?.name ?? null,
    invoice: input.invoice,
    note: input.note,
    orderId,
    byId: by.id,
    createdAt: at,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'sell': {
      const products = takeLines(state.products, action.lines);
      if (!products) return state;
      let id = state.nextId;
      const sales: Sale[] = action.lines.map((line) => {
        const p = state.products.find((x) => x.id === line.productId)!;
        const price = priceOf(p, line.kind);
        return {
          id: id++,
          productId: p.id,
          productName: p.name,
          kind: line.kind,
          quantity: line.quantity,
          price,
          total: price * line.quantity,
          cost: costOf(p, line.kind) * line.quantity,
          sellerId: action.seller.id,
          sellerName: action.seller.name,
          createdAt: action.at,
          receiptId: action.receiptId,
          forgotten: action.forgotten,
          fromCredit: false,
        };
      });
      const queued = devNetwork.get().offline ? state.queued + sales.length : state.queued;
      return { ...state, products, sales: [...state.sales, ...sales], queued, nextId: id };
    }
    case 'unsell': {
      const sale = state.sales.find((s) => s.id === action.saleId);
      if (!sale) return state;
      return {
        ...state,
        sales: state.sales.filter((s) => s.id !== sale.id),
        products: state.products.map((p) => (p.id === sale.productId ? returnStock(p, sale.kind, sale.quantity) : p)),
      };
    }
    case 'unsellReceipt': {
      const lines = state.sales.filter((s) => s.receiptId === action.receiptId);
      if (!lines.length) return state;
      return {
        ...state,
        sales: state.sales.filter((s) => s.receiptId !== action.receiptId),
        products: state.products.map((p) =>
          lines.reduce((acc, s) => (s.productId === acc.id ? returnStock(acc, s.kind, s.quantity) : acc), p),
        ),
        queued: Math.max(0, state.queued - (devNetwork.get().offline ? lines.length : 0)),
      };
    }
    case 'credit': {
      const products = takeLines(state.products, action.lines);
      if (!products) return state;
      let id = state.nextId;
      const lines: CreditLine[] = action.lines.map((line) => {
        const p = state.products.find((x) => x.id === line.productId)!;
        return {
          id: id++,
          customerKey: customerKey(action.name),
          customerName: action.name.trim(),
          customerPhone: action.phone,
          productId: p.id,
          productName: p.name,
          kind: line.kind,
          quantity: line.quantity,
          total: priceOf(p, line.kind) * line.quantity,
          cost: costOf(p, line.kind) * line.quantity,
          paid: 0,
          sellerId: action.seller.id,
          sellerName: action.seller.name,
          createdAt: action.at,
        };
      });
      return { ...state, products, credits: [...state.credits, ...lines], nextId: id };
    }
    case 'pay': {
      const { lines } = applyPayment(state.credits, action.key, action.amount);
      let id = state.nextId;
      // A credit line counts as a sale only once it is fully paid.
      const newlyPaid = lines.filter((l) => !isLineOpen(l) && isLineOpen(state.credits.find((o) => o.id === l.id)!));
      const sales: Sale[] = newlyPaid.map((l) => ({
        id: id++,
        productId: l.productId,
        productName: l.productName,
        kind: l.kind,
        quantity: l.quantity,
        price: l.total / l.quantity,
        total: l.total,
        cost: l.cost,
        sellerId: action.by.id,
        sellerName: action.by.name,
        createdAt: action.at,
        receiptId: `C${l.id}`,
        forgotten: false,
        fromCredit: true,
      }));
      const payment: CreditPayment = { id: id++, customerKey: action.key, amount: action.amount, receivedById: action.by.id, createdAt: action.at };
      return { ...state, credits: lines, sales: [...state.sales, ...sales], payments: [...state.payments, payment], nextId: id };
    }
    case 'removeCreditLine': {
      const line = state.credits.find((l) => l.id === action.id);
      if (!line) return state;
      return {
        ...state,
        credits: state.credits.filter((l) => l.id !== line.id),
        products: state.products.map((p) => (p.id === line.productId ? returnStock(p, line.kind, line.quantity) : p)),
      };
    }
    case 'closeBooks':
      return { ...state, closures: [...state.closures, action.closure] };
    case 'reopenBooks':
      return { ...state, closures: state.closures.filter((c) => !(c.workday === action.workday && c.sellerId === action.sellerId)) };
    case 'sync':
      return { ...state, queued: 0 };
    case 'addProduct': {
      const product: Product = { ...action.input, id: action.id, createdAt: action.at, aliases: [] };
      return { ...state, products: [...state.products, product] };
    }
    case 'updateProduct':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, ...action.input, stockCartons: p.stockCartons, stockUnits: p.stockUnits } : p,
        ),
      };
    case 'restock': {
      const purchase = makePurchase(state, action.id, action.input, action.by, action.at, null);
      if (!purchase) return state;
      return {
        ...state,
        purchases: [...state.purchases, purchase],
        products: state.products.map((p) => (p.id === purchase.productId ? addStock(p, purchase.cartons, purchase.units) : p)),
      };
    }
    case 'removePurchase': {
      const purchase = state.purchases.find((x) => x.id === action.id);
      if (!purchase) return state;
      return {
        ...state,
        purchases: state.purchases.filter((x) => x.id !== purchase.id),
        products: state.products.map((p) => (p.id === purchase.productId ? subtractStock(p, purchase.cartons, purchase.units) : p)),
      };
    }
    case 'merge': {
      const keep = state.products.find((p) => p.id === action.keepId);
      const merged = state.products.filter((p) => action.mergeIds.includes(p.id) && p.id !== action.keepId);
      if (!keep || !merged.length) return state;
      const extra = merged.reduce((sum, p) => sum + totalUnits(p), 0);
      const upc = keep.unitsPerCarton;
      const loose = keep.stockUnits + extra;
      const next: Product = {
        ...keep,
        category: action.category ?? keep.category,
        stockCartons: upc > 1 ? keep.stockCartons + Math.floor(loose / upc) : keep.stockCartons,
        stockUnits: upc > 1 ? round3(loose % upc) : round3(loose),
        aliases: [...new Set([...keep.aliases, ...merged.flatMap((p) => [p.name, ...p.aliases])])],
      };
      const ids = new Set(merged.map((p) => p.id));
      const repoint = <T extends { productId: number; productName: string }>(x: T): T =>
        ids.has(x.productId) ? { ...x, productId: keep.id, productName: keep.name } : x;
      return {
        ...state,
        products: state.products.filter((p) => !ids.has(p.id)).map((p) => (p.id === keep.id ? next : p)),
        sales: state.sales.map(repoint),
        credits: state.credits.map(repoint),
        purchases: state.purchases.map(repoint),
        orders: state.orders.map((o) => ({ ...o, lines: o.lines.map((l) => (ids.has(l.productId) ? { ...l, productId: keep.id } : l)) })),
      };
    }
    case 'applyCount': {
      let id = action.firstId;
      const adjustments: StockAdjustment[] = [];
      const products = state.products.map((p) => {
        const entry = action.entries.find((e) => e.productId === p.id);
        if (!entry) return p;
        adjustments.push({
          id: id++,
          productId: p.id,
          productName: p.name,
          before: { cartons: p.stockCartons, units: p.stockUnits },
          after: { cartons: entry.cartons, units: entry.units },
          reason: entry.reason,
          byId: action.by.id,
          createdAt: action.at,
        });
        return { ...p, stockCartons: entry.cartons, stockUnits: entry.units };
      });
      return { ...state, products, adjustments: [...state.adjustments, ...adjustments] };
    }
    case 'saveSupplier': {
      const exists = state.suppliers.some((x) => x.id === action.id);
      return {
        ...state,
        suppliers: exists
          ? state.suppliers.map((x) => (x.id === action.id ? { ...x, ...action.input } : x))
          : [...state.suppliers, { ...action.input, id: action.id, createdAt: action.at }],
        purchases: exists ? state.purchases.map((x) => (x.supplierId === action.id ? { ...x, supplierName: action.input.name } : x)) : state.purchases,
      };
    }
    case 'saveOrder': {
      const exists = state.orders.some((o) => o.id === action.id);
      return {
        ...state,
        orders: exists
          ? state.orders.map((o) => (o.id === action.id ? { ...o, ...action.input } : o))
          : [...state.orders, { ...action.input, id: action.id, status: 'draft', createdAt: action.at, receivedAt: null }],
      };
    }
    case 'deleteOrder':
      return { ...state, orders: state.orders.filter((o) => o.id !== action.id) };
    case 'addEntry':
      return { ...state, ledger: [...state.ledger, action.entry] };
    case 'deleteEntry':
      return { ...state, ledger: state.ledger.filter((e) => e.id !== action.id) };
    case 'setCash':
      return { ...state, cashSet: action.cashSet };
    case 'receiveOrder': {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order || order.status !== 'draft') return state;
      let id = action.firstId;
      let next: State = {
        ...state,
        orders: state.orders.map((o) => (o.id === order.id ? { ...o, status: 'received', receivedAt: action.at } : o)),
      };
      for (const line of order.lines) {
        const purchase = makePurchase(
          next,
          id++,
          { productId: line.productId, cartons: line.cartons, units: line.units, supplierId: order.supplierId, invoice: `PO-${order.id}`, note: order.notes },
          action.by,
          action.at,
          order.id,
          { carton: line.costCarton, unit: line.costUnit },
        );
        if (!purchase) continue;
        next = {
          ...next,
          purchases: [...next.purchases, purchase],
          products: next.products.map((p) => (p.id === purchase.productId ? addStock(p, purchase.cartons, purchase.units) : p)),
        };
      }
      return next;
    }
    case 'setEmptyShop':
      return { ...state, emptyShop: action.empty };
    case 'log':
      return { ...state, activity: [...state.activity, action.entry] };
    case 'backup':
      return { ...state, backups: [...state.backups, action.backup] };
    case 'restore': {
      const { backup: b, scope } = action;
      const all = scope === 'all';
      const next: State = { ...state };
      if (all || scope === 'products') next.products = b.products;
      if (all || scope === 'sales') {
        next.sales = b.sales;
        next.credits = b.credits;
        next.payments = b.payments;
      }
      if (all || scope === 'purchases') {
        next.purchases = b.purchases;
        next.suppliers = b.suppliers;
        next.orders = b.orders;
      }
      if (all) {
        next.ledger = b.ledger;
        next.adjustments = b.adjustments;
        next.cashSet = null;
        next.closures = [];
      }
      return next;
    }
    case 'reset': {
      const cleared: State = {
        ...state,
        sales: [],
        credits: [],
        payments: [],
        closures: [],
        purchases: [],
        orders: [],
        ledger: [],
        adjustments: [],
        cashSet: null,
        queued: 0,
      };
      return action.scope === 'all' ? { ...cleared, products: [], suppliers: [] } : cleared;
    }
  }
}

type DataContextValue = Omit<State, 'nextId'> & {
  /** Adds an entry to the activity feed, by the signed-in user. */
  logActivity: (action: ActivityAction, entity: string) => void;
  /** Saves a copy of the data now and returns it. */
  createBackup: () => Backup;
  restoreBackup: (id: number, scope: RestoreScope) => void;
  resetData: (scope: ResetScope) => void;
  setEmptyShop: (empty: boolean) => void;
  /** Records a cash sale (one receipt). Throws StockError if a line can't be filled. */
  sell: (lines: SaleLineInput[], seller: User, options?: { at?: Date; forgotten?: boolean }) => string;
  unsell: (saleId: number) => void;
  /** Undo a whole receipt (quick-sell undo). */
  unsellReceipt: (receiptId: string) => void;
  /** Records goods taken on credit; stock leaves the shop now. */
  recordCredit: (input: { name: string; phone: string | null; lines: SaleLineInput[] }, seller: User) => void;
  /** Applies a payment oldest line first. */
  payCredit: (key: string, amount: number, by: User) => PaymentResult;
  removeCreditLine: (id: number) => void;
  closeBooks: (closure: Omit<BooksClosure, 'closedAt'>) => void;
  reopenBooks: (workday: string, sellerId: number) => void;
  /** Demo: going back online "uploads" the queue. */
  syncQueue: () => void;
  addProduct: (input: ProductInput) => number;
  updateProduct: (id: number, input: ProductInput) => void;
  /** Buys stock in: stock goes up, cash goes out. */
  restock: (input: RestockInput, by: User) => void;
  /** Reverses a purchase: stock and cash go back. */
  removePurchase: (id: number) => void;
  /** Keeps one product; the others' stock moves into it and their names become search aliases. */
  mergeProducts: (keepId: number, mergeIds: number[], category: string | null) => void;
  applyCount: (entries: CountEntry[], by: User) => void;
  saveSupplier: (input: SupplierInput, id?: number) => number;
  saveOrder: (input: OrderInput, id?: number) => number;
  deleteOrder: (id: number) => void;
  /** Receiving a draft order records a purchase per line. */
  receiveOrder: (id: number, by: User) => void;
  addEntry: (input: { kind: LedgerEntry['kind']; amount: number; note: string }, by: User) => void;
  deleteEntry: (id: number) => void;
  /** Sets the counted cash balance now. */
  setCash: (amount: number) => void;
  /** Drops the set balance; cash is worked out from the whole history again. */
  recalculateCash: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

let receiptCounter = 500;
/** Ids for records created in the UI (well above the seed ids). */
let idSeq = 50_000;
const newId = () => idSeq++;
const nowIso = () => new Date().toISOString();

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { session } = useSession();
  const empty = state.emptyShop;

  const log = (action: ActivityAction, entity: string) =>
    dispatch({ type: 'log', entry: { id: newId(), action, entity, userName: session?.user.name ?? '', createdAt: nowIso() } });
  const productName = (id: number) => state.products.find((p) => p.id === id)?.name ?? '';

  const ensureStock = (lines: SaleLineInput[]) => {
    if (takeLines(state.products, lines)) return;
    // Find the first line that fails, for the message.
    let products = state.products;
    for (const line of lines) {
      const next = takeLines(products, [line]);
      if (!next) throw new StockError(state.products.find((p) => p.id === line.productId)?.name ?? '');
      products = next;
    }
  };

  const value: DataContextValue = {
    products: empty ? [] : state.products,
    sales: empty ? [] : state.sales,
    credits: empty ? [] : state.credits,
    payments: empty ? [] : state.payments,
    closures: state.closures,
    suppliers: empty ? [] : state.suppliers,
    purchases: empty ? [] : state.purchases,
    orders: empty ? [] : state.orders,
    adjustments: empty ? [] : state.adjustments,
    ledger: empty ? [] : state.ledger,
    cashSet: state.cashSet,
    activity: state.activity,
    backups: state.backups,
    queued: state.queued,
    emptyShop: empty,
    logActivity: log,
    createBackup: () => {
      const backup = snapshot(state, newId(), nowIso());
      dispatch({ type: 'backup', backup });
      log('backup', '');
      return backup;
    },
    restoreBackup: (id, scope) => {
      const backup = state.backups.find((b) => b.id === id);
      if (!backup) return;
      dispatch({ type: 'restore', backup, scope });
      log('restore', scope);
    },
    resetData: (scope) => {
      dispatch({ type: 'reset', scope });
      log('reset', scope);
    },
    setEmptyShop: (e) => dispatch({ type: 'setEmptyShop', empty: e }),
    sell: (lines, seller, options) => {
      ensureStock(lines);
      const receiptId = `R${receiptCounter++}`;
      dispatch({
        type: 'sell',
        lines,
        seller,
        receiptId,
        at: (options?.at ?? new Date()).toISOString(),
        forgotten: options?.forgotten ?? false,
      });
      return receiptId;
    },
    unsell: (saleId) => {
      dispatch({ type: 'unsell', saleId });
      log('unsell', state.sales.find((s) => s.id === saleId)?.productName ?? '');
    },
    unsellReceipt: (receiptId) => {
      dispatch({ type: 'unsellReceipt', receiptId });
      log('unsell', receiptId);
    },
    recordCredit: ({ name, phone, lines }, seller) => {
      ensureStock(lines);
      dispatch({ type: 'credit', name, phone, lines, seller, at: new Date().toISOString() });
    },
    payCredit: (key, amount, by) => {
      const { result } = applyPayment(state.credits, key, amount);
      dispatch({ type: 'pay', key, amount: result.applied, by, at: new Date().toISOString() });
      return result;
    },
    removeCreditLine: (id) => {
      const line = state.credits.find((l) => l.id === id);
      dispatch({ type: 'removeCreditLine', id });
      if (line) log('creditRemoved', `${line.productName} · ${line.customerName}`);
    },
    closeBooks: (closure) => {
      dispatch({ type: 'closeBooks', closure: { ...closure, closedAt: new Date().toISOString() } });
      log('booksClosed', session?.user.name ?? '');
    },
    reopenBooks: (workday, sellerId) => {
      dispatch({ type: 'reopenBooks', workday, sellerId });
      log('booksReopened', workday);
    },
    syncQueue: () => dispatch({ type: 'sync' }),
    addProduct: (input) => {
      const id = newId();
      dispatch({ type: 'addProduct', id, input, at: nowIso() });
      log('productAdded', input.name);
      return id;
    },
    updateProduct: (id, input) => {
      dispatch({ type: 'updateProduct', id, input });
      log('productEdited', input.name);
    },
    restock: (input, by) => {
      dispatch({ type: 'restock', id: newId(), input, by, at: nowIso() });
      log('restock', productName(input.productId));
    },
    removePurchase: (id) => {
      const purchase = state.purchases.find((x) => x.id === id);
      dispatch({ type: 'removePurchase', id });
      if (purchase) log('purchaseRemoved', purchase.productName);
    },
    mergeProducts: (keepId, mergeIds, category) => {
      dispatch({ type: 'merge', keepId, mergeIds, category });
      log('merge', productName(keepId));
    },
    applyCount: (entries, by) => {
      const firstId = newId();
      idSeq += entries.length;
      dispatch({ type: 'applyCount', entries, by, at: nowIso(), firstId });
      log('stockCount', String(entries.length));
    },
    saveSupplier: (input, id) => {
      const supplierId = id ?? newId();
      dispatch({ type: 'saveSupplier', id: supplierId, input, at: nowIso() });
      return supplierId;
    },
    saveOrder: (input, id) => {
      const orderId = id ?? newId();
      dispatch({ type: 'saveOrder', id: orderId, input, at: nowIso() });
      return orderId;
    },
    deleteOrder: (id) => {
      dispatch({ type: 'deleteOrder', id });
      log('orderDeleted', `PO-${id}`);
    },
    addEntry: (input, by) => {
      dispatch({ type: 'addEntry', entry: { ...input, id: newId(), byId: by.id, createdAt: nowIso() } });
      log('entryAdded', input.note);
    },
    deleteEntry: (id) => {
      const entry = state.ledger.find((e) => e.id === id);
      dispatch({ type: 'deleteEntry', id });
      log('entryDeleted', entry?.note ?? '');
    },
    setCash: (amount) => {
      dispatch({ type: 'setCash', cashSet: { amount, at: nowIso() } });
      log('cashSet', String(amount));
    },
    recalculateCash: () => {
      dispatch({ type: 'setCash', cashSet: null });
      log('cashRecalculated', '');
    },
    receiveOrder: (id, by) => {
      const firstId = newId();
      idSeq += 100;
      dispatch({ type: 'receiveOrder', id, by, at: nowIso(), firstId });
      const order = state.orders.find((o) => o.id === id);
      log('orderReceived', state.suppliers.find((s) => s.id === order?.supplierId)?.name ?? `PO-${id}`);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
