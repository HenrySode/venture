/**
 * Domain types, shaped after the Venture Hub API (/api/auth/me, /api/moshi/*, /api/billing)
 * but in camelCase. When a real backend is connected, map responses into these types
 * inside src/services so screens do not change.
 */

export type Role = 'admin' | 'seller' | 'stock' | 'supervisor';

export type Plan = 'lite' | 'hub';
export type PlanStatus = 'trial' | 'active' | 'grace' | 'lapsed';

/** Hub tools that can be sold individually (`modules` on the web entitlement). */
export type HubModule =
  | 'cartonPricing'
  | 'basket'
  | 'credit'
  | 'stock'
  | 'suppliers'
  | 'expiry'
  | 'team'
  | 'reports';

export type Entitlement = {
  plan: Plan;
  status: PlanStatus;
  /** ISO date. For `trial`/`active` the paid period end; for `grace` the grace end. */
  validUntil: string | null;
  /** `null` means every Hub tool is included. */
  modules: HubModule[] | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  /** Owner of the shop — only the owner manages the subscription. */
  isOwner: boolean;
};

export type Shop = {
  id: number;
  name: string;
  phone: string;
  place: string;
  accentColor: string;
  panelColor: string;
  taxPercent: number;
  workdayOpen: { hour: number; minute: number };
  workdayClose: { hour: number; minute: number };
  voiceEnabled: boolean;
};

export type Session = {
  user: User;
  shop: Shop;
  entitlement: Entitlement;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  barcode: string | null;
  unitsPerCarton: number;
  purchasePriceCarton: number;
  purchasePriceUnit: number;
  sellPriceCarton: number;
  sellPriceUnit: number;
  stockCartons: number;
  stockUnits: number;
  lowStockCartonThreshold: number | null;
  lowStockUnitThreshold: number | null;
  ignoreLowStock: boolean;
  expiresAt: string | null;
  createdAt: string;
  /** Names of products merged into this one; found by search. */
  aliases: string[];
  taxPercent: number;
  /** Usual reorder quantity in cartons (reorder list suggestion). */
  reorderQty: number | null;
  /** Optional promo price per unit. */
  discountPrice: number | null;
};

/** Products sell by the carton (bulk) or by the unit (single piece). */
export type SaleKind = 'carton' | 'unit';

export type Sale = {
  id: number;
  productId: number;
  productName: string;
  kind: SaleKind;
  /** Units may be fractional (e.g. 0.5). */
  quantity: number;
  /** Price per carton or per unit at the time of sale. */
  price: number;
  total: number;
  /** Purchase cost of what was sold, for profit. */
  cost: number;
  sellerId: number;
  sellerName: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Lines sold together in one basket share a receipt. */
  receiptId: string;
  /** Recorded later with a past date/time ("forgotten sale"). */
  forgotten: boolean;
  /** Came from a fully paid credit line. */
  fromCredit: boolean;
};

export type CreditLine = {
  id: number;
  /** Normalised customer name, groups lines per debtor. */
  customerKey: string;
  customerName: string;
  customerPhone: string | null;
  productId: number;
  productName: string;
  kind: SaleKind;
  quantity: number;
  total: number;
  cost: number;
  /** Amount paid towards this line so far. */
  paid: number;
  sellerId: number;
  sellerName: string;
  createdAt: string;
};

export type CreditPayment = {
  id: number;
  customerKey: string;
  amount: number;
  receivedById: number;
  createdAt: string;
};

/** A seller's closed books for one workday. */
export type BooksClosure = {
  workday: string;
  sellerId: number;
  expected: number;
  counted: number;
  notes: string;
  closedAt: string;
};

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  place: string | null;
  notes: string | null;
  createdAt: string;
};

/** Stock bought in (restock or received purchase order). Cash goes out. */
export type Purchase = {
  id: number;
  productId: number;
  productName: string;
  cartons: number;
  units: number;
  cost: number;
  supplierId: number | null;
  supplierName: string | null;
  invoice: string | null;
  note: string | null;
  orderId: number | null;
  byId: number;
  createdAt: string;
};

export type OrderLine = { productId: number; cartons: number; units: number; costCarton: number; costUnit: number };

export type PurchaseOrder = {
  id: number;
  supplierId: number;
  lines: OrderLine[];
  notes: string | null;
  status: 'draft' | 'received';
  createdAt: string;
  receivedAt: string | null;
};

export type StockAdjustmentReason = 'damaged' | 'lost' | 'expired' | 'correction' | 'other';

/** One line of an applied stock count. */
export type StockAdjustment = {
  id: number;
  productId: number;
  productName: string;
  before: { cartons: number; units: number };
  after: { cartons: number; units: number };
  reason: StockAdjustmentReason;
  byId: number;
  createdAt: string;
};

/** Money in or out that is not a sale or a purchase (rent, transport, commission…). */
export type LedgerEntry = {
  id: number;
  kind: 'revenue' | 'expense';
  amount: number;
  note: string;
  byId: number;
  createdAt: string;
};

/** Cash counted and set by the owner; later movements are added on top. */
export type CashSet = { amount: number; at: string };

/** What an activity entry records (audit feed). */
export type ActivityAction =
  | 'unsell'
  | 'creditRemoved'
  | 'productAdded'
  | 'productEdited'
  | 'restock'
  | 'purchaseRemoved'
  | 'merge'
  | 'stockCount'
  | 'orderReceived'
  | 'orderDeleted'
  | 'entryAdded'
  | 'entryDeleted'
  | 'cashSet'
  | 'cashRecalculated'
  | 'booksClosed'
  | 'booksReopened'
  | 'userAdded'
  | 'userRemoved'
  | 'passwordReset'
  | 'profileEdited'
  | 'settingsSaved'
  | 'backup'
  | 'restore'
  | 'reset';

export type ActivityEntry = {
  id: number;
  action: ActivityAction;
  /** What it was done to, e.g. a product name or "R512". */
  entity: string;
  userName: string;
  createdAt: string;
};

/** A person on the shop's team (Users screen). */
export type TeamMember = User & {
  createdAt: string;
  lastActiveAt: string | null;
};

/** Which part of a backup to restore. */
export type RestoreScope = 'all' | 'products' | 'sales' | 'purchases';

/** A saved copy of the shop's data (kept on this device in the demo). */
export type Backup = {
  id: number;
  createdAt: string;
  products: Product[];
  sales: Sale[];
  credits: CreditLine[];
  payments: CreditPayment[];
  suppliers: Supplier[];
  purchases: Purchase[];
  orders: PurchaseOrder[];
  ledger: LedgerEntry[];
  adjustments: StockAdjustment[];
};

export type FeatureRequest = {
  id: number;
  need: string;
  how: string;
  createdAt: string;
};
