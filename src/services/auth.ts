/**
 * Auth service — mirrors the web client's `/api/auth/*` calls:
 * login, register, register/confirm, phone/start, phone/confirm,
 * forgot-password, forgot-password/confirm, invite-status, set-password, logout.
 *
 * Backed by an in-memory mock "database" that lives for the app session.
 */
import {
  DEMO_CODE,
  DEMO_INVITE_TOKEN,
  daysFromNow,
  demoAccounts,
  demoEntitlement,
  demoInvitee,
  demoShop,
  type DemoAccount,
} from '@/mocks/accounts';
import type { Entitlement, Role, Session, Shop } from '@/types/domain';

import { ApiError, mockRequest } from './client';

const accounts: DemoAccount[] = demoAccounts.map((a) => ({ ...a }));
const shops = new Map<number, { shop: Shop; entitlement: Entitlement }>([
  [demoShop.id, { shop: { ...demoShop }, entitlement: { ...demoEntitlement } }],
]);
const pendingRegistrations = new Map<string, RegisterDetails & { phoneVerified: boolean }>();
const usedInvites = new Set<string>();

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const findAccount = (email: string) => accounts.find((a) => a.email === normalizeEmail(email));

function toSession(account: DemoAccount): Session {
  const record = shops.get(account.shopId);
  if (!record) throw new ApiError('Shop not found', 404, 'shopNotFound');
  const { password: _password, shopId: _shopId, ...user } = account;
  return { user, shop: { ...record.shop }, entitlement: { ...record.entitlement } };
}

export type RegisterDetails = {
  shopName: string;
  name: string;
  email: string;
  phone: string;
};

export type InviteStatus =
  | { valid: true; shopName: string; inviterName: string; role: Role; email: string }
  | { valid: false };

export const authService = {
  login: (input: { email: string; password: string }) =>
    mockRequest(() => {
      // UI-only build: any email + password signs in. A demo email picks that
      // role; anything else opens the owner (admin) account.
      const account = findAccount(input.email) ?? accounts[0];
      return toSession(account);
    }),

  /** Step 1 of opening a shop: validates details and sends an SMS code. */
  registerShop: (details: RegisterDetails) =>
    mockRequest(() => {
      if (findAccount(details.email)) {
        throw new ApiError('Email already registered', 409, 'emailTaken');
      }
      const requestId = `reg_${Date.now().toString(36)}`;
      pendingRegistrations.set(requestId, { ...details, email: normalizeEmail(details.email), phoneVerified: false });
      return { requestId, demoCode: DEMO_CODE };
    }, 900),

  resendPhoneCode: (_requestId: string) => mockRequest(() => ({ demoCode: DEMO_CODE })),

  /** Step 2: confirm the SMS code. */
  confirmPhone: (input: { requestId: string; code: string }) =>
    mockRequest(() => {
      const pending = pendingRegistrations.get(input.requestId);
      if (!pending) throw new ApiError('Registration expired', 410, 'registrationExpired');
      if (input.code.trim() !== DEMO_CODE) throw new ApiError('Invalid code', 400, 'invalidCode');
      pending.phoneVerified = true;
      return { ok: true as const };
    }),

  /** Step 3: set the password; creates the shop (14-day Hub trial) and the owner account. */
  confirmShop: (input: { requestId: string; password: string }) =>
    mockRequest(() => {
      const pending = pendingRegistrations.get(input.requestId);
      if (!pending?.phoneVerified) throw new ApiError('Registration incomplete', 400, 'registrationIncomplete');
      const shopId = Math.max(...shops.keys()) + 1;
      shops.set(shopId, {
        shop: { ...demoShop, id: shopId, name: pending.shopName.trim(), phone: pending.phone, place: '' },
        entitlement: { plan: 'hub', status: 'trial', validUntil: daysFromNow(14), modules: null },
      });
      const account: DemoAccount = {
        id: Math.max(...accounts.map((a) => a.id)) + 1,
        name: pending.name.trim(),
        email: pending.email,
        phone: pending.phone.replace(/\D/g, ''),
        role: 'admin',
        isOwner: true,
        password: input.password,
        shopId,
      };
      accounts.push(account);
      pendingRegistrations.delete(input.requestId);
      return toSession(account);
    }, 1200),

  forgotPassword: (input: { email: string }) =>
    mockRequest(() => {
      if (!findAccount(input.email)) throw new ApiError('Account not found', 404, 'notFound');
      return { demoCode: DEMO_CODE };
    }),

  confirmForgotPassword: (input: { email: string; code: string; password: string }) =>
    mockRequest(() => {
      const account = findAccount(input.email);
      if (!account) throw new ApiError('Account not found', 404, 'notFound');
      if (input.code.trim() !== DEMO_CODE) throw new ApiError('Invalid code', 400, 'invalidCode');
      account.password = input.password;
      return { ok: true as const };
    }),

  inviteStatus: (token: string) =>
    mockRequest<InviteStatus>(() => {
      if (token !== DEMO_INVITE_TOKEN || usedInvites.has(token)) return { valid: false };
      return {
        valid: true,
        shopName: demoShop.name,
        inviterName: demoInvitee.inviterName,
        role: demoInvitee.role,
        email: demoInvitee.email,
      };
    }),

  setPassword: (input: { token: string; password: string }) =>
    mockRequest(() => {
      if (input.token !== DEMO_INVITE_TOKEN || usedInvites.has(input.token)) {
        throw new ApiError('Invite invalid', 410, 'inviteInvalid');
      }
      usedInvites.add(input.token);
      let account = findAccount(demoInvitee.email);
      if (!account) {
        account = {
          id: Math.max(...accounts.map((a) => a.id)) + 1,
          name: demoInvitee.name,
          email: demoInvitee.email,
          phone: null,
          role: demoInvitee.role,
          isOwner: false,
          password: input.password,
          shopId: demoShop.id,
        };
        accounts.push(account);
      }
      account.password = input.password;
      return toSession(account);
    }),

  logout: () => mockRequest(() => ({ ok: true as const }), 200),
};
