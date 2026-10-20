# UI vs Stitch screenshots — parity tracker

**Reference:** `design-reference/stitch/*/screen.png` + `code.html`  
**Map:** [STITCH-SCREEN-MAP.md](./design/STITCH-SCREEN-MAP.md)

Dummy seed data ([UI-DEMO-ACCOUNTS.md](./UI-DEMO-ACCOUNTS.md)) fills **APIs**; it does **not** make the app look like Stitch. Until a screen is **Layout**, the UI will feel like a wireframe.

| Status | Meaning |
|--------|---------|
| 🔴 Shell | Route exists, minimal layout (not screenshot-like) |
| 🟡 Partial | Tokens + some structure; missing sections from PNG |
| 🟢 Match | Layout matches Stitch for primary viewport |

## CRM (`localhost:3001`)

| Stitch folder | Route | Status | Notes |
|---------------|-------|--------|-------|
| `crm_1_get_started_onboarding_login` | `/start` | 🟢 | Full step-1 + owner login + feature strip (onboarding submit stub) |
| `crm_2_home_overview_analytics_peek` | `/` Overview | 🟢 | KPI grid, orders table, analytics peek column |
| `crm_2_home_analytics_full_view` | `/` Analytics | 🟢 | GMV ribbon, 5-stage funnel, hourly/loyalty, menu table |
| `crm_3_menu_draft_ai_review_item_drawer` | `/menu` | 🟢 | Live/Draft/Review stage bar, draft table, extraction audit, inline Item Inspector |
| `crm_4_grow_offers_game` | `/grow?tab=offers` | 🟡 | Full loyalty config form (spin/scratch/win-back/calendar); preview column |
| `crm_4_grow_customers` | `/grow?tab=customers` | 🟢 | KPI strip, consent ledger table, dossier drawer |
| `crm_4_grow_campaign_wizard_marketing_hub` | `/grow?tab=campaigns` | 🟢 | 5/7 hub, compliance badge, wallet/offers peek, right wizard |
| `crm_4_grow_wallet_billing` | `/grow?tab=wallet` | 🟢 | Hero balance, ledger filter tabs, top-up stub |
| `crm_4_grow_ai_poster_copilot` | `/grow?tab=poster` | 🟢 | Brief + studio preview; E2E headline/approve |
| `crm_5_orders_kitchen_*` | `/orders/kitchen` | 🟡 | KDS 3-column, action rail, history, redeem strip |
| `crm_5_orders_counter_loyalty_redeem_terminal` | `/orders/redeem` | 🟡 | Phone terminal + reward cards (pilot apply stub) |
| `crm_6_settings_*` | `/settings` | 🟡 | Status ribbon, sub-nav, stickers peek + admin mint; payout tab |

## Guest (`localhost:3000`)

| Stitch folder | Route | Status | Notes |
|---------------|-------|--------|-------|
| `g17_hero_hub_discovery` | `/hub` | 🟢 | Ownly WA IA: crimson header, festival poster, Pick Cravings, Delivery Promise + Known & Loved rails, Bestsellers ₹149, mind circles, All Restaurants filters, Direct Perks, sticky dock — D'aMigo tokens (DEC-016). Collections routes (`/hub/collections/*`) still P2. |
| `g2_menu_shop_dish_customizer` | `/r/:id/menu` | 🟢 | Ownly menu: back/search/share, rating+ETA, Best Value seal, Veg/Non-Veg/Egg chips, Top Picks 2-col + food photos + crimson Add + green ₹ + Other Apps range, Menu FAB, sticky dock |
| `g1_*` landing / spin | `/r/:id`, `/s/:token` | 🔴 | Game/profile not Stitch composition |
| `g9`–`g12` checkout | checkout flow | 🟢 | Ownly honesty banner + FREE delivery + Direct D2C seal; location sheet |
| `g13` tracking | `/orders/:id` | 🟡 | Live status + timers; timeline polish ongoing |
| `g16` orders home | `/orders` | 🟡 | Active/Past shells; Ownly sticky patterns via dock |

## How to validate

1. Open **`screen.png`** beside the running route (same folder name as above).  
2. Compare **chrome** (header, nav, cards, typography), not only data.  
3. Track fixes in this file; target **🟢** per screen in dedicated UI PRs.

**Next recommended UI pass:** CRM Orders kitchen → CRM Settings → Guest checkout bill polish.
