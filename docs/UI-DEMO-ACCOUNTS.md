# UI demo accounts (local / Stitch validation)

After `npm run db:migrate` and **`npm run db:seed`**, use these accounts to fill CRM and guest screens per [design-reference/stitch](../design-reference/stitch/) and [STITCH-SCREEN-MAP.md](./design/STITCH-SCREEN-MAP.md).

**OTP (all):** `000000` or `00000` (requires `OTP_BYPASS_CODE=000000` and `ENABLE_DEV_FIXTURES=true` in root `.env`)

**Testing signup:** new outlets on `/start` auto-activate when `ONBOARDING_AUTO_APPROVE=true` — see [TESTING-PHASE.md](./TESTING-PHASE.md).

**Screens vs PNGs:** seed fills data; layout parity is tracked in [UI-STITCH-PARITY.md](./UI-STITCH-PARITY.md). Compare each route to `design-reference/stitch/*/screen.png`.

## CRM — restaurant owner

| Field | Value |
|--------|--------|
| URL | http://localhost:3001/start |
| Phone | `9876543210` |
| Role | Owner — **Biryani Box Koramangala** |
| Display name | Raj Malhotra (Demo Owner) |

**Screens to check**

| Stitch folder | Route |
|---------------|--------|
| `crm_2_home_*` | `/` — KPIs, recent orders, analytics tab |
| `crm_3_menu_*` | `/menu` — live + draft + 86'd + import review |
| `crm_4_grow_*` | `/grow` — offers, customers (3), campaigns (draft/scheduled/sent), wallet (~₹1,850), poster |
| `crm_5_orders_*` | `/orders`, `/orders/kitchen` — columns filled |
| `crm_6_settings_*` | `/settings` — payout/POS stubs + stickers |

Platform admin mint: `9876543211` / `000000`

## Guest — primary demo user

| Field | Value |
|--------|--------|
| Name | **Priya Sharma** |
| Phone | `9123456780` |
| Consents | Transactional + marketing + game (pre-filled) |

**How to sign in:** open guest app → **Orders** or **Hub** → any flow that asks for OTP → use phone + OTP above. Or start from packaging scan (see seed JSON `guestScanPath`).

**Screens to check**

| Stitch folder | How to open |
|---------------|-------------|
| `g1_*` landing / spin | `/s/{sampleToken}` from seed output |
| `g2_*` menu | `/r/{restaurantId}/menu` |
| `g9_*` / `g10_*` checkout | menu → cart (Priya has **open cart** with 2× biryani) |
| `g13_*` tracking | `/orders/{guestTrackOrderId}` from seed `uiDemo.guestTrackOrderId` |
| `g5_*` / `g16_*` orders home | `/orders` — active + past, multi-kitchen |
| `g17_*` hub | `/hub` — Biryani Box + Masala Trail |
| `g11_*` payment failed | order history includes failed payment row |

**Other guests (Grow / customer list):** `9123456790` Arjun Kumar · `9123456791` Meera Nair

## API cheat sheet

- Guest fixtures: `GET http://localhost:4000/v1/dev/ui-demo`
- E2E fixtures: `GET http://localhost:4000/v1/dev/e2e-fixtures`

## Re-seed UI pack only

UI demo data is idempotent (marker campaign `DEV-UI-WEEKEND-BLAST`). To rebuild from scratch, truncate app data or drop DB volume, then migrate + seed again.
