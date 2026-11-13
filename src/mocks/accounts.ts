import type { Entitlement, Shop, User } from '@/types/domain';

/** Shared password for every demo account. Meets the app's rule (8+ chars, letter + number). */
export const DEMO_PASSWORD = 'Duka2026';

/** SMS / email verification code accepted by the mock backend. */
export const DEMO_CODE = '123456';

/** Invite tokens understood by the mock backend (deep link: venture://set-password?token=…). */
export const DEMO_INVITE_TOKEN = 'demo-invite';
export const DEMO_EXPIRED_INVITE_TOKEN = 'expired-invite';

const DAY = 24 * 60 * 60 * 1000;
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export const demoShop: Shop = {
  id: 1,
  name: 'Duka la Amina',
  phone: '0712 345 678',
  place: 'Moshi, Kilimanjaro',
  accentColor: '#2563EB',
  panelColor: '#2C2419',
  taxPercent: 0,
  workdayOpen: { hour: 5, minute: 0 },
  workdayClose: { hour: 2, minute: 0 },
  voiceEnabled: true,
};

export const demoEntitlement: Entitlement = {
  plan: 'hub',
  status: 'active',
  validUntil: daysFromNow(20),
  modules: null,
};

export type DemoAccount = User & { password: string; shopId: number };

/** One account per role so every navigation variant can be reviewed. */
export const demoAccounts: DemoAccount[] = [
  {
    id: 1,
    name: 'Amina Juma',
    email: 'amina@duka.co.tz',
    phone: '255712345678',
    role: 'admin',
    isOwner: true,
    password: DEMO_PASSWORD,
    shopId: 1,
  },
  {
    id: 2,
    name: 'Baraka Mushi',
    email: 'baraka@duka.co.tz',
    phone: '255754112233',
    role: 'seller',
    isOwner: false,
    password: DEMO_PASSWORD,
    shopId: 1,
  },
  {
    id: 3,
    name: 'Neema Kileo',
    email: 'neema@duka.co.tz',
    phone: '255688445566',
    role: 'stock',
    isOwner: false,
    password: DEMO_PASSWORD,
    shopId: 1,
  },
  {
    id: 4,
    name: 'Juma Said',
    email: 'juma@duka.co.tz',
    phone: null,
    role: 'supervisor',
    isOwner: false,
    password: DEMO_PASSWORD,
    shopId: 1,
  },
];

/** The person a valid demo invite was sent to. */
export const demoInvitee = {
  name: 'Zawadi Mrema',
  email: 'zawadi@duka.co.tz',
  role: 'seller' as const,
  inviterName: 'Amina Juma',
};
