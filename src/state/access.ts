import type { HubModule, Role, Session } from '@/types/domain';

/** Tabs a role can see, in display order (PRD §3). */
export type TabName =
  | 'home'
  | 'sell'
  | 'my-sales'
  | 'madeni'
  | 'stock'
  | 'purchases'
  | 'suppliers'
  | 'money'
  | 'more';

export const tabsByRole: Record<Role, TabName[]> = {
  admin: ['home', 'sell', 'stock', 'money', 'more'],
  seller: ['sell', 'my-sales', 'madeni', 'more'],
  stock: ['stock', 'purchases', 'suppliers', 'more'],
  supervisor: ['home', 'money', 'stock', 'more'],
};

export const homeTabFor = (role: Role): TabName => tabsByRole[role][0];

export function homeHrefFor(role: Role) {
  return `/${homeTabFor(role)}` as const;
}

export type PlanAccess = {
  /** Paid Hub tools are usable (Hub plan in trial, active, or grace). */
  hubToolsOn: boolean;
  /** Shop behaves like Lite (Lite plan, or Hub that has lapsed). */
  isLiteMode: boolean;
  hasModule: (module: HubModule) => boolean;
  /** Only the owner sees and manages the subscription. */
  canManageSubscription: boolean;
};

export function planAccess(session: Session): PlanAccess {
  const { plan, status, modules } = session.entitlement;
  const hubToolsOn = plan === 'hub' && status !== 'lapsed';
  return {
    hubToolsOn,
    isLiteMode: !hubToolsOn,
    hasModule: (module) => hubToolsOn && (modules === null || modules.includes(module)),
    canManageSubscription: session.user.isOwner,
  };
}

/** Admin and Stock keep products, purchases, and suppliers; the supervisor only views. */
export const canManageStock = (role: Role) => role === 'admin' || role === 'stock';
