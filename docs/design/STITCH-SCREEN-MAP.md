# D'aMigo's — Stitch Screen to Code Map (v2.0 FINAL)

**Source Folders:**
- `C:\Users\SHAHN\Downloads\stitch_d_amigo_s_food_hospitality_platform\stitch_d_amigo_s_food_hospitality_platform\` (`g1`–`g18` and `crm_1`–`crm_6`)
- Design System Override: [APPLE-DESIGN-SYSTEM.md](./APPLE-DESIGN-SYSTEM.md) (SF Pro + 17 Apple principles)
- **WhatsApp Ownly pattern pack:** [WA-OWNLY-GUEST-UI-REFERENCE.md](./WA-OWNLY-GUEST-UI-REFERENCE.md) (DEC-016) — Hub/menu/checkout/profile IA

---

## 1. Guest App (`g*` Folders → `apps/guest/frontend`)

> **Copy Sanitization Rule (Mandatory across all `g*` screens):** Replace all Stitch prototype occurrences of `"Table 04"`, `"Dining Table #04"`, `"Dine-in"`, and `"Table Shared"` with `"Packaging Delivery • Direct D2C"`, `"Seal-Verified Packaging"`, or `"Cross-By 1 km Dispatch"`.

| Stitch Folder | Screen / Flow Role | Target Next.js Route / Component | Key v2.0 Alignment Details |
|---------------|--------------------|----------------------------------|----------------------------|
| `g1_restaurant_landing_spin_game` | Packaging QR Landing + CRED-style Dark Charcoal (`#161616`) Fortune Wheel / Scratch Card + **Dashing Sparkle Win Bottom Sheet** | `/s/[token]` → `/r/[slug]/play` | Triggered after **Spark by D'aMigo** WA Opt-In (`"Yes, Unlock My Reward"`). Shows `Pouch Perk Unlocked`, Min Order / Expiry / Instant grid, and `"Redeem & Place Order"` CTA. |
| `g2_menu_shop_dish_customizer` | Restaurant Menu Shop + Sticky Claimed Reward Pill + CRED VIP Perks Banner + Category Pills + 65/35 Dish Cards (`Est. ₹X elsewhere`) | `/r/[slug]/menu` | **+ Ownly merge:** Best Value banner, Top Picks **2-col grid** with crimson Add + green ₹ pill + “Other Apps: ₹A–₹B”, Menu FAB category jump, dual-layer sticky checkout dock (P-UI-01/05). Prep badge `⚡ 10m` / `🔥 15m`. |
| `g8_item_detail_bottom_sheet` | iOS Rubber-Band (`c=0.55`) Dish Customizer Sheet (Portion Size, Add-ons, Spice Level) | `/r/[slug]/menu` (Sheet modal) | Direct 1:1 pointer drag & velocity handoff (`damping: 0.8, response: 0.3s`). |
| `g3_cart_upi_checkout_success_inset` & `g9_cart_review` | Cart Review + Savings Micro-Banner + **"Cross-By Nearby Kitchen (≤ 1 km)"** Add-on Strip | `/r/[slug]/cart` | Allows adding a **2nd Restaurant** in the same cart. Displays live Haversine distance badge (`≤ 1.0 km: Single Rider` vs `> 1.0 km: 2 Separate Riders`). |
| `g6_location_check_address` | Delivery Location Pin + Distance / Serviceability Check | `/r/[slug]/checkout` (Address step) | **+ Ownly:** map + “Device location is off” sheet + Grant permission + Search address; “+ Add new address” stadium outline CTA. First-order FREE delivery callout. |
| `g10_bill_summary_upi_checkout` | Dashed-Tear Consolidated Tax Invoice + Scoped vs Platform Offer Slot + Razorpay UPI Intent | `/r/[slug]/checkout` | **+ Ownly honesty banner** “No confusing fees…”; FREE delivery strikethrough when subsidized; never hide ₹2; trust seal “Direct D2C · No Aggregator Markup”; cutlery / cooking request checkboxes optional. |
| `g11_payment_failed` | Payment Retry / UPI Timeout Recovery | `/r/[slug]/checkout?payment=failed` | Preserves cart & claimed reward lock; 1-tap retry via Razorpay. |
| `g12_order_confirmed` | Celebratory Order Confirmed + WhatsApp Utility Bill Sync Badge | `/orders/[orderId]?confirmed=1` | Triggers multimodal haptic + spring check-mark; confirms **D'aMigo Food** sent consolidated bill + live track link on WhatsApp. |
| `g4_order_tracking_live_timeline` & `g13_live_order_tracking` | Live Order Tracking + **[1st Order \| 2nd Order] Segmented Toggler** + Live Prep Countdown (`10m` / `15m` + `+5m`) | `/orders/[orderId]` & `/orders/group/[groupId]` | Segmented spring pill switches between Leg 1 & Leg 2 (or concurrent active orders) with independent kitchen timers and rider status. |
| `g5_orders_home_hub_active_past` & `g16_global_orders_home` | Global Orders Home (`Active (N)` vs `Past Orders`) + Concurrent Order Support | `/orders` | Guests can place a new order while an active order is preparing; all active orders appear here and in the Tracking Toggler. |
| `g6_hero_discover_hub_switch_kitchen_peek` & `g17_hero_hub_discovery` | D'aMigo's Hub Marketplace + **"Your Direct Perks" Poster-Level Loyalty Rail** + Near You Kitchens | `/hub` | **+ Ownly merge (DEC-016):** location+VEG+profile header, search+mini promo, festival hero, Pick Your Cravings circles, 30-min / Lowest Price kitchen cards, sticky dual-layer cart dock. Keep Direct Perks poster rail as D'aMigo differentiator. |
| `g18_switch_kitchen_modal` | Cross-By / Switch Kitchen Decision Modal | `/r/[slug]/menu` & `/hub` | Upgraded from destructive "Discard Cart" to **"Add as 2nd Kitchen (Cross-By)"** (if < 2 kitchens in cart) or **"Replace Kitchen"** (if cart already has 2 kitchens). |
| `g5_one_time_guest_profile` | First-time Guest Name & Dietary Preference Capture | `/onboarding/profile` | Post-WA opt-in / OTP lightweight profile step. |
| `g14_expired_qr_sticker` | Expired / Already-Claimed Packaging Sticker Fallback | `/s/[token]` (Error state) | Deep-links guest to `/hub` or restaurant direct menu without dead-ending. |
| `g15_kitchen_inactive_read_only` | Kitchen Offline / Paused Read-Only Menu | `/r/[slug]/menu` (Paused state) | Allows browsing & claiming rewards for later while disabling checkout CTA. |

---

## 2. CRM App (`crm_*` Folders → `apps/crm/frontend`)

| Stitch Folder | Screen / Flow Role | Target Next.js Route | Key v2.0 Alignment Details |
|---------------|--------------------|----------------------|----------------------------|
| `crm_1_get_started_onboarding_login` | Partner Onboarding (FSSAI + **Mandatory Kitchen GPS `lat`/`lng` Pin**) + Staff OTP Login | `/get-started`, `/login` | Kitchen `lat`/`lng` powers the `1.0 km` Cross-By Haversine rule and Shiprocket pickup routing. |
| `crm_2_home_overview_analytics_peek` & `crm_2_home_analytics_full_view` | Today's Pulse KPIs + Funnel + **Payout & Waiting Penalty Settlement Summary** | `/dashboard`, `/dashboard/analytics` | Displays gross direct sales, D'aMigo's first-order delivery subsidy, and any rider waiting penalty deductions. |
| `crm_3_menu_draft_ai_review_item_drawer` | Menu Categories, Items, AI Import, 86 Toggle & **Prep Category (`READY_10M` vs `COOKED_15M`)** | `/menu`, `/menu/import` | Each dish configures `READY_10M` (10 min SLA: drinks, desserts, pre-prepped) or `COOKED_15M` (15 min SLA: biryani, wok, curries). |
| `crm_4_grow_offers_game` | Fortune Wheel & Scratch Card Editor + **Offer Scope Badge (`RESTAURANT_SCOPED`)** | `/grow/offers` | Configures 5–15% off, Free Add-on, Next-Order Voucher, and Loyalty Stamp/Coin rules scoped strictly to this restaurant. |
| `crm_4_grow_customers` | Auto-Captured Guest CRM (from Spark QR Scans & Orders) | `/grow/customers` | Shows guest segments (`NEW`, `REGULAR`, `VIP`), scan count, order count, and 7-day WA frequency cap badge. |
| `crm_4_grow_campaign_wizard_marketing_hub` | 4-Step WhatsApp Broadcast Wizard (via **Spark by D'aMigo**) | `/grow/campaigns/new` | Enforces 7-day global WA marketing cap and per-message wallet deduction. |
| `crm_4_grow_ai_poster_copilot` | Festival Sticker Print Studio & AI Poster Copilot | `/grow/posters` | Generates packaging QR stickers with dynamic `?t=<token>` deep-links to Spark by D'aMigo. |
| `crm_4_grow_wallet_billing` | Marketing Wallet Balance, Top-Up & **Payout Settlement Ledger** | `/grow/wallet` | Tracks campaign debits and order payout settlements (including Shiprocket waiting charge deductions). |
| `crm_5_orders_kitchen_mode_counter_redeem_strip` & `crm_5_orders_counter_loyalty_redeem_terminal` | Live Kitchen KDS (`PAID` Loud Audio Alert + **`Accept` → Auto Rider + `10m`/`15m` Countdown + `+5m` Extension + Waiting Penalty Ticker**) | `/orders`, `/orders/kitchen` | `Accept` triggers Shiprocket pickup + starts `10:00` or `15:00` timer. One-time `+5 min` extension allowed before `T-3m`. Overtime after rider arrival accrues waiting penalty (`3m` grace, then `₹2/min`). |
| `crm_6_settings_stickers_platform_admin` | Outlet Hours, Kitchen GPS Coordinates, Staff RBAC, Sticker Activation & Platform Admin | `/settings/*`, `/admin/*` | Includes Platform Admin toggle for `PLATFORM_WIDE` offers (`First-Order FREE Delivery`). |
