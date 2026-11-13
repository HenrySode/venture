import type { IconName } from '@/components/ui';
import type { ActivityAction } from '@/types/domain';

export type ActivityKind = 'sales' | 'stock' | 'money' | 'team' | 'shop';

export const activityKinds: ActivityKind[] = ['sales', 'stock', 'money', 'team', 'shop'];

/** Which filter an action falls under. */
export const kindOf: Record<ActivityAction, ActivityKind> = {
  unsell: 'sales',
  creditRemoved: 'sales',
  booksClosed: 'sales',
  booksReopened: 'sales',
  productAdded: 'stock',
  productEdited: 'stock',
  restock: 'stock',
  purchaseRemoved: 'stock',
  merge: 'stock',
  stockCount: 'stock',
  orderReceived: 'stock',
  orderDeleted: 'stock',
  entryAdded: 'money',
  entryDeleted: 'money',
  cashSet: 'money',
  cashRecalculated: 'money',
  userAdded: 'team',
  userRemoved: 'team',
  passwordReset: 'team',
  profileEdited: 'team',
  settingsSaved: 'shop',
  backup: 'shop',
  restore: 'shop',
  reset: 'shop',
};

export const kindIcon: Record<ActivityKind, IconName> = {
  sales: 'sell',
  stock: 'stock',
  money: 'money',
  team: 'users',
  shop: 'shop',
};

/** Actions that remove or undo something are shown in red. */
export const isDestructive = (a: ActivityAction) =>
  a === 'unsell' || a === 'creditRemoved' || a === 'purchaseRemoved' || a === 'orderDeleted' || a === 'entryDeleted' || a === 'userRemoved' || a === 'reset';
