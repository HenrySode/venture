# Venture Hub Mobile — PRD & Project Plan

> **Scope:** frontend-only mobile app (Expo SDK 58 · React Native 0.88 · Expo Router). No backend or database. All data comes from local mock fixtures behind a service layer that mirrors the real API, so the backend can be connected later without rewriting screens.
>
> **Source of truth:** the live web app at `venture.pashasali.com`, studied on 2026-11-10 while signed in as a shop owner (Admin) on the *Moshi / Venture Hub* retail venture.

---

## 1. Product overview

**Venture Hub** (by Pash Vantech) is a bilingual (Kiswahili / English) **retail shop point-of-sale and back office** for small Tanzanian shops (dukas). The pitch is *"Know your profit before the day ends."*

It fixes three gaps that paper books miss:

| Gap | What the app does |
|---|---|
| A sale that was never written down | Fast tap-to-sell, works offline and syncs later |
| A debt with no name (*deni lisilo na jina*) | **Madeni**: credit sales tied to a named customer, with partial or full payments |
| Stock that ran out while you were busy | Low-stock alerts, stock counts, reorder lists, expiry tracking |

### 1.1 Platform structure
- **Venture Hub (the platform):** one sign-in, several *ventures*. Ventures in the code are **Moshi** (retail POS, which is the product called "Venture Hub"), **Hardware** (FIFO batch tracking), **Laptops**, **Michoro**, and **Kiboko**.
- **This mobile app covers the Moshi retail POS only.** The ventures picker can be shown, with the other ventures marked *Coming soon*.

### 1.2 Plans
| Plan | Price | What it includes |
|---|---|---|
| **Lite** | Free, never expires | Record sales one item at a time, today's profit, offline, KI/EN |
| **Hub** | From TSh 25,000 per month (25k–60k; up to 100k with custom features) | Carton and piece pricing, basket sales, stock and suppliers, expiry tracking, team roles, full reports |

- A Hub shop can be in the states **trial → active → grace → lapsed**. In *grace*, a banner says "Hub tools stay on until {date}". Once *lapsed*, paid tools pause and the shop sells like Lite.
- Hub can be **modular**: `modules` lists the tools paid for. A locked tool shows "This tool is not in the Hub you paid for."
- Only the **shop owner** sees and manages the subscription.

### 1.3 Roles
| Role | Can do | Home screen |
|---|---|---|
| **Admin** (owner) | The whole shop, including adding people | Dashboard |
| **Seller** | Sell, see their own sales and Madeni, open and close the day | Sell |
| **Stock** | Products, purchases, stock counts, suppliers | Products |
| **Supervisor** | Reports, but cannot change prices or people | Dashboard (read-only) |

### 1.4 Key business rules
- **Currency:** TSH. **Timezone:** Africa/Dar_es_Salaam.
- **Workday:** 05:00 to 02:00 the next morning. The hours can be changed in Shop settings. "Today" always means the current workday.
- **Products** are sold by **carton** (bulk) and/or by **unit** (piece). Each product has a `units_per_carton`, and unit quantities may be decimals (for example 0.5).
- **Unsell:** a seller can reverse a sale only within the current workday. An admin can reverse any sale. Unselling puts the stock back.
- **Credit (Madeni):** stock leaves the shop when the credit is recorded. A payment is applied to the oldest open line first. A line counts as a sale only once it is fully paid.
- **Cash on hand** = sales revenue + other revenue − other expense − purchases.
- **Low stock:** an alert fires when cartons ≤ the carton threshold, or units ≤ the unit threshold. The default is 4 sellable pieces. Individual products can be hidden from alerts.
- **Destructive actions** (reset or restore data) ask the user to type a random 6-character confirmation code.

---

## 2. Goals and non-goals

**Goals**
1. A mobile UI that covers every Moshi feature, for all four roles, in Kiswahili and English.
2. Selling must be quick enough to use one-handed at a busy counter: a sale in two taps at most.
3. A service layer with mock data whose shape matches the real API (`/api/auth/*`, `/api/moshi/*`, `/api/billing`), so the real backend can be swapped in later.
4. Every screen has loading, empty, error and success states.

**Non-goals for this phase**
- Real authentication, networking, persistence or sync. (An offline queue is *shown* in the UI but not actually built.)
- Payments or checkout, barcode camera hardware, printing, and the "Yano" voice assistant. Each can be a UI stub.
- The Hardware, Laptops, Michoro and Kiboko ventures, and the platform super-admin console.

---

## 3. Information architecture (Expo Router)

```
src/app/
  _layout.tsx                  root: providers (theme, i18n, mock session)
  (auth)/
    welcome.tsx                landing / value proposition + language toggle
    login.tsx                  email + password, forgot password
    register.tsx               open a shop: shop name, your name, email, mobile, password
    verify-phone.tsx           SMS code
    forgot-password.tsx
    set-password.tsx           accept an invite link
  (app)/
    _layout.tsx                role-aware tabs + grace/lapsed banner
    hub.tsx                    "Your ventures" picker
    (tabs)/
      home.tsx                 Admin/Supervisor dashboard
      sell/                    POS
        index.tsx              product grid, search, carton/unit tap, basket
        basket.tsx             review basket → confirm sale → receipt
        credit.tsx             credit sale flow
      stock/
        index.tsx              products list (sort, filter, category view)
        [id].tsx               product detail / edit
        new.tsx                add product
        restock.tsx
        merge.tsx
        count.tsx              stock count + reorder + expiring
        purchases.tsx
        suppliers/             suppliers + purchase orders (draft → receive)
      money/
        sales.tsx              sales report (period, seller, unsell, CSV)
        profits.tsx            profit table
        finances.tsx           cash ledger + adjustments
        credits/               all credit lines, creditor detail [key].tsx
      more/
        index.tsx              menu
        users.tsx              team + roles + reset password
        shop.tsx               shop settings
        activity.tsx
        reset-restore.tsx
        subscription.tsx
        request-feature.tsx
        account.tsx            profile, change password, language, sign out
    seller/
      my-sales.tsx
      madeni.tsx               customers who owe + pay partial or full
      madeni/[key].tsx
      shift.tsx                start day / close books (cash counted, variance)
```

**Tabs by role**
- **Admin:** Home · Sell · Stock · Money · More
- **Seller:** Sell · My Sales · Madeni · More (account, close books)
- **Stock:** Stock · Purchases · Suppliers · More
- **Supervisor:** Home · Money · Stock (read-only) · More

The web sidebar groups (*Home, Sell, Stock, Money, Manage*) map onto these tabs.

---

## 4. Functional requirements by screen

### 4.1 Authentication and onboarding
- **Welcome:** the hero line "Know your profit before the day ends", the three pain points, the Lite vs Hub comparison, an FAQ, and a KI/EN toggle.
- **Login:** email and password, show/hide password, "Signing in…" state, error banner, links to Forgot password and Register.
- **Register (open your shop):** shop name, your name, email, mobile number, then an SMS code step, then a password (at least 8 characters with a letter and a number, with a live strength hint). Ends on "Your shop is ready → Go to your shop".
- **Forgot password:** request, then confirm a code and set a new password.
- **Set password (invite):** checks the token, then sets a password.
- **Session expired** banner after 30 minutes idle. This is shown in the UI only.

### 4.2 Dashboard (Admin and Supervisor)
- A **"Start here"** checklist for new shops: add a product, record a cash sale, record a credit, close the books.
- **Daily stats:** today's revenue, today's sales, today's purchase cost, today's profit (P&L), today's net profit.
- **Totals:** total revenue, total profit, purchase cost (COGS), net profit.
- A low-stock banner, cash on hand, and quick actions.

### 4.3 Sell (POS)
- A product grid or list. Search matches every typed word (for example "pepsi 600"). Views: all products or by category, and normal or large.
- Each product card shows **Sell carton** and **Sell unit** buttons, stock, and price. A "how many each tap sells" setting supports custom and decimal amounts.
- Out-of-stock cards are disabled and low-stock cards show a badge.
- **Basket mode:** add several lines → *Confirm sale* → **receipt** (quantity, amount, total; Print is a stub).
- **Barcode entry:** type a code to add a product. Camera scanning is out of scope.
- **Sell on credit:** creditor name (with suggestions), several product lines, quantity → "Credit recorded — stock updated".
- **Forgotten sale:** pick a product, date and time.
- An **offline indicator** and a "Queued (n)" pill (mock).
- **Lite gating:** carton and basket sales are locked behind an upsell sheet.

### 4.4 My Sales (Seller)
- History grouped by workday. Unsell is allowed on today's lines only.

### 4.5 Madeni / Credits
- **Seller Madeni:** list of open debtors with the amount owed. Pay full or pay partial, and see the held-back-payment message when a payment doesn't clear the oldest line.
- **Creditor detail:** lines with status (Open or Paid), payments, "Sell more on credit to this customer", and remove a line (which returns the stock).
- **Admin credit sales (all):** every line, filterable by period and by open only.

### 4.6 Products and stock
- **List:** sort rules with priority and direction (most sold, name, price, date added, category), and columns for Stock (C) and Stock (U).
- **Add or edit:** name, category, barcode, units per carton, purchase price per carton and per unit (unit price auto-calculated from carton ÷ units), sell price per carton and per unit, stock cartons and units, low-stock thresholds, ignore low stock, photo, tax %, usual reorder quantity, expiry date, discount price.
- **Restock:** add cartons and units, show the cash cost, and warn "Not enough cash on hand".
- **Merge products:** pick two or more, choose which one to keep, optional category, optional "single-item stock". The other names become search aliases.
- **Stock count:** enter counted cartons and units with a reason, see expected vs counted, then *Apply count*. Also shows the **Reorder** list and **Expiring within 7 days**.
- **Purchases:** purchase history with search (product, supplier, invoice, note), filtered totals, grouped by day, week or month, remove a purchase (stock and cash are reversed), and inventory value at cost.
- **Suppliers:** list and add. **Purchase orders:** create draft → receive.

### 4.7 Money
- **Sales report:** period (today's workday, this week, month, year, all time, or a specific workday), seller filter, rows showing time, product, type, quantity, revenue, profit and seller, Unsell, and Export CSV (stub).
- **Profit table:** profit by product and every sale's profit.
- **Finances:** cash in from sales, cash out for purchases, net cash. An overall ledger bucketed by day, week or month with expandable rows. Other revenue and expense entries (add or delete). Set or adjust the cash balance, and recalculate it from history.

### 4.8 Manage
- **Users:** list, add (full name, email or username, role, password), reset password, delete. Role descriptions follow §1.3.
- **Shop settings:** name, phone, place, logo, theme color, panel color, tax %, opening and closing hours, voice toggle.
- **Activity:** an audit feed with action, entity, user and time.
- **Reset & restore:** download backup, restore with a preview (all, products only, sales only, or purchases only) and a dry-run summary, reset sales and purchases, reset all. Each step is protected by the 6-character code.
- **Subscription:** current plan, status, licensed-until date, included tools, tools you can add, and a Subscribe to Hub CTA (stub).
- **Request a feature:** "What do you need?" and "How should it work?" → Send.
- **Account:** profile (name, email, role, plan, phone), change password, language, ventures hub, sign out.

### 4.9 Shift (Seller): Day / Books
- The day starts automatically during business hours.
- **Close books:** shows the expected sales total, asks for the cash counted, shows the variance, and takes optional notes.
- States: "Day open since …", "Today's books are closed", and "Outside business hours".

---

## 5. Design system
- **Brand:** primary orange `#F99F07`, cream background `#FFF8EE`, dark brown text `#2C2419`, teal links (`teal-800`). The shop's own accent color defaults to `#2563EB` and its panel color is customizable, so the app can be themed per shop.
- **Status colors:** emerald for success and paid, amber for warnings, grace and low stock, red for destructive actions and out of stock.
- Large tap targets of at least 48dp on POS buttons. A large-text view for the counter.
- Light mode first. Dark mode tokens are defined but optional.
- **Copy:** every string goes through an EN/SW dictionary. The web app's roughly 620 Moshi keys are reused so the wording matches. Numbers are formatted as `TSH 12,500`.
- **Shared components:** Button, Input, Select, Sheet/Modal, ConfirmCode dialog, Card, StatTile, Badge, EmptyState, ErrorState, Skeleton, ListRow, SegmentedControl (period), QuantityStepper, Banner (grace / offline / lapsed), RoleGate, PlanGate.

---

## 6. Technical approach (frontend-only)
| Concern | Approach |
|---|---|
| Routing | Expo Router, file-based, under `src/app` (already set up) |
| State | React Context + `useReducer` for a mock store holding the session, shop, products, sales, credits, purchases, adjustments, users and activity. Changes made in the UI update the store, so flows feel real for the session. |
| Data layer | `src/services/*.ts` with the same method names as the web client (`getProducts`, `recordSale`, `payCredit`, …). It returns Promises with a simulated delay over the fixtures, and can fail on purpose to exercise error states. |
| Mock data | `src/mocks/` holds a realistic Tanzanian duka catalogue (Sukari 1kg, Mchele 5kg, cooking oil, sodas, …), four users (one per role), a week of sales, credits and purchases |
| i18n | `src/i18n/{en,sw}.ts` plus a `useT()` hook. The default language follows the device, and can be changed in Account. |
| Dev switches | A hidden *Dev panel* to switch role, plan (Lite / Hub / grace / lapsed), language, and the empty-shop state. This lets every state be reviewed without a backend. |
| Quality | `npx expo lint` and `npx tsc --noEmit` pass at each milestone |

New dependencies will be kept to a minimum, and the SDK-58 docs will be checked before adding any (for example `expo-localization` and a bottom-sheet).

---

## 7. Project plan

| # | Milestone | Deliverables | Estimate |
|---|---|---|---|
| **M0** | Foundation | Remove the template screens; theme tokens; UI kit components; i18n; mock store and services; role and plan gating; dev panel | 2–3 days |
| **M1** | Auth and onboarding | Welcome, Login, Register + SMS code, Forgot password, Set password, Ventures hub | 2 days |
| **M2** | Seller POS | Sell grid, carton/unit tap, basket, receipt, credit sale, forgotten sale, My Sales + unsell, Madeni + payments, Shift / close books, offline pill | 4–5 days |
| **M3** | Products and stock | Product list, sort and views, add/edit, restock, merge, stock count, reorder, expiring, purchases, suppliers and purchase orders | 4 days |
| **M4** | Money | Dashboard, sales report, profit table, finances ledger and adjustments, admin credits and creditor detail | 3–4 days |
| **M5** | Manage | Users, shop settings, activity, reset and restore (code confirm), subscription, request a feature, account | 3 days |
| **M6** | Polish and QA | Lite and lapsed gating everywhere, empty, loading and error states, accessibility, large-text view, Android and iOS checks, final lint and typecheck | 2–3 days |

**Total: about 20–24 working days.** Each milestone ends with a demo you can review in Expo Go or a development build.

---

## 8. Open questions (to confirm before M0)
1. **Visual direction:** match the web brand (orange and cream), or a fresh mobile look?
2. **Roles:** all four roles in the first release, or Admin and Seller first?
3. **Platform priority:** the web promotes "Install on Android". Is the target Android-first?
4. **Default language:** Kiswahili or English?
5. **Ventures hub:** show the multi-venture picker, or open straight into the shop?
6. **Lite vs Hub:** build both experiences, or Hub only for now?
7. Do you have a **Figma design** or brand assets (logo files), or should I design from the web app?
