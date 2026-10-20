# D'aMigo's CRM App — Product Requirements Document

| Field | Value |
|-------|--------|
| **Document ID** | PRD-CRM-1.0 (+ v2.0 addendum) |
| **App** | `crm-web` (desktop-first; responsive tablet for kitchen) |
| **API** | `crm-api` (REST + WebSocket kitchen channel) |
| **Version** | 1.0 base · **2.0 planning overlay** |
| **Date** | 2026-10-15 · v2 addendum 2026-10-18 |
| **Companion** | [GUEST-APP-PRD.md](./GUEST-APP-PRD.md), [SYSTEM-ARCHITECTURE.md](../architecture/SYSTEM-ARCHITECTURE.md) |
| **v2.0 LOCKED overlay** | **[CRM-APP-PRD-V2-ADDENDUM.md](./CRM-APP-PRD-V2-ADDENDUM.md)** — GPS, prep category, Accept→rider+timer, waiting penalty |

---

## 1. Executive summary

The CRM is the **restaurant operating system** for D'aMigo's: onboarding, menu (AI-assisted publish), **Grow** (offers, game config, customers, WhatsApp campaigns, wallet, AI poster), **Orders** (list + kitchen mode + counter redeem), **Settings** (brand, team, Razorpay, stickers). **Platform admin** mints sticker batches and can revoke.

**North star (CRM-side):** Weekly Active Restaurants with engagement (scan + guest action + owner login).

---

## 2. Goals & non-goals

### 2.1 Goals

- Owner self-serve menu publish within 48h of signup
- Sticker batch activation without support ticket
- Compliant marketing (opt-in, 1 msg / 7 days / guest)
- Kitchen realtime or 30s fallback
- Transparent wallet and message billing

### 2.2 Non-goals (Phase 1)

- NFC table pedestals (remove from UI until Phase 3)
- Full POS bi-directional sync (stub only)
- Multi-city self-serve without ops review
- Franchise rollup dashboard

---

## 3. Roles & permissions

| Role | Code | Capabilities |
|------|------|--------------|
| Owner | `RESTAURANT_OWNER` | All except platform admin |
| Kitchen | `KITCHEN` | Orders kitchen mode, status |
| Counter | `REDEEM` | Redeem terminal only |
| Staff | `STAFF` | Read-only menu + orders (optional) |
| Platform admin | `PLATFORM_ADMIN` | Mint/revoke stickers, all tenants read |

Enforce RBAC on every `crm-api` route.

---

## 4. Design system

> **v2.0 override:** Apple SF Pro + 17 principles ([APPLE-DESIGN-SYSTEM.md](../design/APPLE-DESIGN-SYSTEM.md)); Stitch map [STITCH-SCREEN-MAP.md](../design/STITCH-SCREEN-MAP.md).

- Stitch folders `crm_1` … `crm_6` + Grow/Orders sub-screens
- Layout: **left sidebar** — Home, Menu, Grow, Orders, Settings
- Shell type: `web_dashboard` 1440×900; kitchen tablet 1024×768 feel gate
- Fix copy: sidebar subtitle **"Restaurant CRM"** (not "Guest OS")

---

## 5. Information architecture — six shells

| Shell | Route | Stitch reference |
|-------|--------|------------------|
| **C-S0 Start** | `/start`, `/login` | `crm_1_get_started` |
| **C-S1 Home** | `/` | `crm_2_home_*` |
| **C-S2 Menu** | `/menu` | `crm_3_menu_*` |
| **C-S3 Grow** | `/grow?tab=` | `crm_4_grow_*` |
| **C-S4 Orders** | `/orders`, `/orders/kitchen`, `/orders/redeem` | `crm_5_orders_*` |
| **C-S5 Settings** | `/settings`, `/settings/admin` | `crm_6_settings_*` |

---

## 6. Global CRM rules

| ID | Rule |
|----|------|
| C-R01 | Month 1 onboarding free; wallet ₹999 from month 2 after ~30 captures (configurable) |
| C-R02 | Marketing send blocked without wallet balance |
| C-R03 | Campaign obeys 1 msg / 7 days / guest / restaurant |
| C-R04 | Menu changes affect guest only on **Publish** |
| C-R05 | Sticker batches 10–15 day default validity |
| C-R06 | AI menu extract never auto-publishes |
| C-R07 | AI poster requires owner approve before download/share |

---

## 7. Feature specification

### 7.1 Get started (C-S0)

#### C-01.01 Public onboarding

| Fields | Business name, owner name, phone, email, city, cuisine tags, FSSAI optional |
| API | `POST /v1/onboarding/applications` |
| Consent | DPDP notice + WA transactional |
| Phase | P0 |
| Tests | TC-C-001 |

#### C-01.02 OTP login

| API | `POST /v1/auth/otp/request`, `verify` |
| Acceptance | Lock after 5 failures / 15 min |
| Phase | P0 |
| Tests | TC-C-002..003 |

#### C-01.03 Tenant activation (ops)

| Status | `PENDING` → `ACTIVE` (ops or auto pilot) |
| Phase | P0 |
| Tests | TC-C-004 |

---

### 7.2 Home (C-S1)

#### C-02.01 Overview KPIs

| Metrics | Orders today, scans 7d, wallet balance, campaign sends remaining |
| API | `GET /v1/dashboard/overview` |
| Phase | P1 |
| Tests | TC-C-010 |

#### C-02.02 Recent orders table

| API | `GET /v1/orders?limit=5` |
| Phase | P1 |
| Tests | TC-C-011 |

#### C-02.03 Alerts

| Examples | Draft menu pending, low wallet, failed campaign |
| Phase | P1 |
| Tests | TC-C-012 |

#### C-02.04 Analytics tab

| Charts | Scan→game→menu→order funnel, orders by hour |
| API | `GET /v1/dashboard/analytics?range=30d` |
| Export | CSV |
| Phase | P2 |
| Tests | TC-C-013..014 |

---

### 7.3 Menu (C-S2)

#### C-03.01 Tabs Live / Draft / Archive

| API | `GET /v1/menu/items?status=` |
| Phase | P0 |
| Tests | TC-C-020 |

#### C-03.02 Manual item CRUD

| API | CRUD `/v1/menu/items` |
| Phase | P0 |
| Tests | TC-C-021 |

#### C-03.03 PDF upload → extract job

| Flow | Upload S3 → queue → worker DeepSeek |
| API | `POST /v1/menu/import`, `GET /v1/menu/import/:jobId` |
| UI | Progress % on toolbar |
| Phase | P1 |
| Tests | TC-C-022..024 |

#### C-03.04 Split review UI

| Acceptance | Low-confidence rows highlighted |
| Phase | P1 |
| Tests | TC-C-025 |

#### C-03.05 Item drawer edit

| Fields | name, desc, price, category, veg, image, reference_price, active |
| Phase | P0 |
| Tests | TC-C-026 |

#### C-03.06 Publish

| API | `POST /v1/menu/publish` → version++ |
| Side effect | Invalidate guest menu cache |
| Phase | P0 |
| Tests | TC-C-027 |

#### C-03.07 Quick 86 / availability toggle

| API | `PATCH /v1/menu/items/:id` `{ available: false }` |
| Phase | P1 |
| Tests | TC-C-028 |

#### C-03.08 Categories

| API | CRUD `/v1/menu/categories` |
| Phase | P0 |
| Tests | TC-C-029 |

---

### 7.4 Grow (C-S3)

#### C-04.01 Offers & game configuration

| Config | Wheel segments, weights, daily spin limit, scratch enable |
| API | `GET/PUT /v1/grow/offers-game` |
| Acceptance | Weights sum validated server-side |
| Phase | P1 |
| Tests | TC-C-040..041 |

#### C-04.02 Customers list

| Display | Masked phone, last order, opt-in badges, credits |
| API | `GET /v1/customers` |
| Phase | P1 |
| Tests | TC-C-042 |

#### C-04.03 Customer detail drawer

| API | `GET /v1/customers/:id` — timeline scans, orders, msgs |
| Phase | P2 |
| Tests | TC-C-043 |

#### C-04.04 Campaign list

| API | `GET /v1/campaigns` |
| Statuses | Draft, Scheduled, Sending, Sent, Failed |
| Phase | P1 |
| Tests | TC-C-044 |

#### C-04.05 Campaign wizard (4 steps)

| Steps | Audience → Message (template) → Schedule → Review |
| API | `POST /v1/campaigns`, `POST /v1/campaigns/:id/schedule` |
| Compliance UI | "1 msg / 7 days" badge; skip count preview |
| Phase | P1 |
| Tests | TC-C-045..049 |

#### C-04.06 Wallet & billing

| Features | Balance, top-up ₹999, ledger, low balance alert |
| API | `GET /v1/wallet`, `POST /v1/wallet/topup`, Razorpay |
| Phase | P1 |
| Tests | TC-C-050..053 |

#### C-04.07 AI poster copilot

| Flow | Prompt → generated image/text → owner Approve |
| API | `POST /v1/grow/poster/generate`, `POST .../approve` |
| Phase | P2 |
| Tests | TC-C-054 |

---

### 7.5 Orders (C-S4)

#### C-05.01 Order list

| Filters | Status, date, search order id |
| API | `GET /v1/orders` |
| Phase | P1 |
| Tests | TC-C-060 |

#### C-05.02 Kitchen mode

| UI | Column board New / Preparing / Out |
| Realtime | WS `/v1/ws/kitchen` or poll 30s |
| Actions | Accept, reject, advance status |
| API | `POST /v1/orders/:id/accept`, `/status` |
| Phase | P1 |
| Tests | TC-C-061..065 |

#### C-05.03 Sound / refresh

| Acceptance | Optional audio on new order |
| Phase | P2 |
| Tests | TC-C-066 |

#### C-05.04 Redeem terminal

| Flow | Enter guest PIN or scan code → validate credit/offer |
| API | `POST /v1/redeem/validate` |
| Role | `REDEEM` or owner |
| Phase | P1 |
| Tests | TC-C-067..068 |

#### C-05.05 Order history & refunds flag

| Phase | P2 |
| Tests | TC-C-069 |

---

### 7.6 Settings (C-S5)

#### C-06.01 Profile & theme

| Fields | Logo, display name, brand color, description |
| API | `PATCH /v1/settings/profile` |
| Phase | P0 |
| Tests | TC-C-070 |

#### C-06.02 Team

| Invite | Phone + role |
| API | `POST /v1/team/invites` |
| Phase | P1 |
| Tests | TC-C-071..072 |

#### C-06.03 Payout & POS

| Razorpay | Linked account status, KYC state |
| POS stub | Petpooja / Restroworks external id fields |
| API | `GET /v1/settings/payout` |
| Phase | P1 |
| Tests | TC-C-073..074 |

#### C-06.04 Stickers (owner)

| Activate batch | Enter batch code from ops |
| View | Active batch, expiry, qty remaining estimate |
| API | `POST /v1/stickers/activate`, `GET /v1/stickers/active` |
| Phase | P1 |
| Tests | TC-C-075..076 |

#### C-06.05 Platform admin — mint batch

| Fields | restaurant, quantity, valid_days (10–15), notes |
| API | `POST /v1/admin/sticker-batches` |
| Output | Batch code, export CSV of tokens (secure) |
| Role | `PLATFORM_ADMIN` |
| Phase | P1 |
| Tests | TC-C-080..082 |

#### C-06.06 Revoke batch / token

| API | `POST /v1/admin/sticker-batches/:id/revoke` |
| Audit | Immutable audit log |
| Phase | P1 |
| Tests | TC-C-083 |

#### C-06.07 Ordering pause (guest g15)

| API | `PATCH /v1/settings/operations` `{ ordering_enabled, resume_at }` |
| Phase | P1 |
| Tests | TC-C-084 |

---

## 8. CRM API surface (summary)

| Domain | Endpoints |
|--------|-----------|
| Auth | `/v1/auth/otp/*` |
| Dashboard | `/v1/dashboard/*` |
| Menu | `/v1/menu/*` |
| Grow | `/v1/grow/*`, `/v1/customers`, `/v1/campaigns` |
| Wallet | `/v1/wallet/*` |
| Orders | `/v1/orders/*`, WS kitchen |
| Settings | `/v1/settings/*`, `/v1/team/*` |
| Stickers | `/v1/stickers/*`, `/v1/admin/sticker-batches/*` |
| Redeem | `/v1/redeem/*` |

---

## 9. Integrations (CRM responsibilities)

| System | CRM touchpoints |
|--------|-----------------|
| **Kapso** | Template pick in wizard; delivery stats on Grow |
| **Razorpay** | Wallet top-up, linked accounts in settings |
| **DeepSeek** | Menu import job status |
| **Meta** | Template approval status display (read-only) |

Details: [INTEGRATIONS.md](../architecture/INTEGRATIONS.md).

---

## 10. Non-functional requirements

| NFR | Target |
|-----|--------|
| Kitchen latency | New order visible < 5s (WS) or 30s poll |
| Session | 12h staff session; re-auth for payout changes |
| Audit | Admin mint/revoke logged 7 years |
| Multi-tenant | Strict `restaurant_id` from JWT |

---

## 11. Phase mapping (CRM)

| Phase | Features |
|-------|----------|
| **P0** | C-01.*, C-03 manual menu, C-06.01 |
| **P1** | Dashboard, AI menu, Grow core, kitchen, wallet, stickers, campaigns |
| **P2** | Analytics, AI poster, customer detail |
| **P3** | Advanced segments, POS sync |

---

## 12. Billing & commercial rules (product)

| Rule | Detail |
|------|--------|
| Free month | No wallet debit month 1 |
| Activation threshold | ~30 scan captures before ₹999 charge (config) |
| Message price | ₹1 debit per marketing send; COGS ~₹0.80 Kapso |
| Sticker | Billed per activated batch (₹1 sticker target price) |

---

*End of CRM PRD v1.0*
