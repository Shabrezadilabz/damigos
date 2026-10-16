# Testing phase — logins, signup, and dummy data

Use this checklist after `npm run dev:infra`, `npm run db:migrate`, and `npm run db:seed`.

## Universal OTP (CRM + guest)

| Setting | Value |
|--------|--------|
| `OTP_BYPASS_CODE` | `000000` |
| Accepted at verify | **`000000`** or **`00000`** (5 digits padded to 6) |

Requires root `.env` (see `.env.example`). Restart APIs after changing env.

## CRM — seeded demo accounts

| Role | URL | Phone | OTP |
|------|-----|-------|-----|
| Restaurant owner | http://localhost:3001/start | `9876543210` | `000000` |
| Platform admin (sticker mint) | same | `9876543211` | `000000` |

Owner restaurant: **Biryani Box Koramangala**. Sticker batch for owners: `DEV-BATCH-001`. Admin ops key (dev): `DEV-STICKER-OPS-KEY`.

Run **both** CRM API and web: `npm run dev:crm` (not web-only).

## CRM — new signup (auto-approve)

With `ENABLE_DEV_FIXTURES=true` or `ONBOARDING_AUTO_APPROVE=true`:

1. Open http://localhost:3001/start → complete steps 1–4 → **Submit & sign in**.
2. Backend creates **restaurant + RESTAURANT_OWNER** for the director phone you entered.
3. Sign in on the same screen with that phone + OTP `000000`.

Use a **new 10-digit phone** (e.g. `9888877776`) if you want a fresh tenant without colliding with seed data.

Turn off auto-approve in production: `ONBOARDING_AUTO_APPROVE=false` and `DAMIGOS_ENV=production`.

## Guest — seeded demo

| User | Phone | OTP |
|------|-------|-----|
| Priya Sharma (cart + orders) | `9123456780` | `000000` |
| Arjun Kumar | `9123456790` | `000000` |
| Meera Nair | `9123456791` | `000000` |

Guest app: http://localhost:3000

Fixture helpers (API must be up, `ENABLE_DEV_FIXTURES=true`):

- http://localhost:4000/v1/dev/ui-demo
- http://localhost:4000/v1/dev/e2e-fixtures

## Quick smoke test

1. CRM owner login → `/menu`, `/grow`, `/orders/kitchen`, `/settings`.
2. Guest Priya → menu → cart → checkout stub.
3. New CRM signup with new phone → login → empty menu (demo seed may add rows on first `/menu` load).

More screen-by-screen notes: [UI-DEMO-ACCOUNTS.md](./UI-DEMO-ACCOUNTS.md).
