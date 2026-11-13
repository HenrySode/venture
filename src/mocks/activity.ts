import type { ActivityAction, ActivityEntry, TeamMember } from '@/types/domain';

import { demoAccounts } from './accounts';

/** A local time `days` ago at hh:mm (so the feed reads like a real week). */
function at(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const [amina, baraka, neema] = demoAccounts;

const seed: [ActivityAction, string, string, string][] = [
  ['settingsSaved', 'Duka la Amina', amina.name, at(6, 8, 10)],
  ['productAdded', 'Maji Kilimanjaro 1.5L', neema.name, at(6, 9, 2)],
  ['restock', 'Sukari 1kg', neema.name, at(5, 7, 40)],
  ['unsell', 'Coca-Cola 500ml', baraka.name, at(5, 13, 25)],
  ['booksClosed', baraka.name, baraka.name, at(5, 22, 5)],
  ['entryAdded', 'Umeme (LUKU)', amina.name, at(4, 10, 15)],
  ['stockCount', '4', neema.name, at(4, 18, 30)],
  ['productEdited', 'Mchele 5kg', amina.name, at(3, 9, 0)],
  ['purchaseRemoved', 'Mafuta ya Kupikia 1L', neema.name, at(3, 11, 45)],
  ['creditRemoved', 'Unga wa Ngano 2kg · Mama Rehema', baraka.name, at(2, 16, 20)],
  ['booksClosed', baraka.name, baraka.name, at(2, 22, 40)],
  ['orderReceived', 'Bakhresa Wholesale', neema.name, at(1, 8, 30)],
  ['backup', '', amina.name, at(1, 21, 30)],
  ['unsell', 'R488', baraka.name, at(0, 9, 12)],
];

export const demoActivity: ActivityEntry[] = seed.map(([action, entity, userName, createdAt], i) => ({
  id: i + 1,
  action,
  entity,
  userName,
  createdAt,
}));

/** The shop's team, as the Users screen shows it. */
export const demoTeam: TeamMember[] = demoAccounts.map(({ password: _p, shopId: _s, ...user }, i) => ({
  ...user,
  createdAt: at(60 - i * 12, 9, 0),
  lastActiveAt: i === 3 ? at(9, 17, 0) : at(0, 8 + i, 30),
}));

/** When the seeded backup was made (yesterday evening). */
export const demoBackupAt = at(1, 21, 30);
