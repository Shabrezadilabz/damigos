# Stitch Screen → Route Map

Stitch folder names under **[../../design-reference/stitch/](../../design-reference/stitch/)** map to implementation routes. Each folder has `screen.png` + `code.html`.

## Guest

| Stitch folder | Route / component |
|---------------|-------------------|
| `g1_restaurant_landing_post_scan` | `/r/:id` landing |
| `g1_restaurant_landing_spin_game` | `/r/:id` game section |
| `g3_scratch_card_reward` | Modal/tab in G-S1 |
| `g4_win_celebration_offers` | Win sheet |
| `g5_one_time_guest_profile` | Modal `ProfileConsent` |
| `g2_menu_shop_dish_customizer` | `/r/:id/menu` |
| `g8_item_detail_bottom_sheet` | `ItemSheet` |
| `g9_cart_review` | `/r/:id/checkout` step cart |
| `g10_bill_summary_upi_checkout` | checkout pay |
| `g11_payment_failed` | `PaymentFailed` |
| `g12_order_confirmed` | `PaymentSuccess` |
| `g3_cart_upi_checkout_success_inset` | composite checkout |
| `g6_location_check_address` | `/r/:id/checkout/address` |
| `g13_live_order_tracking` | `/orders/:id` |
| `g4_order_tracking_live_timeline` | same |
| `g5_orders_home_hub_active_past` | `/orders` |
| `g16_global_orders_home` | merge into `/orders` |
| `g17_hero_hub_discovery` | `/hub` |
| `g6_hero_discover_hub_switch_kitchen_peek` | `/hub` |
| `g18_switch_kitchen_modal` | `SwitchKitchenModal` |
| `g14_expired_qr_sticker` | `ScanErrorExpired` — fix copy |
| `g15_kitchen_inactive_read_only` | `KitchenPaused` overlay |

## CRM

| Stitch folder | Route |
|---------------|-------|
| `crm_1_get_started_onboarding_login` | `/start` |
| `crm_2_home_overview_analytics_peek` | `/` tab overview |
| `crm_2_home_analytics_full_view` | `/` tab analytics |
| `crm_3_menu_draft_ai_review_item_drawer` | `/menu` |
| `crm_4_grow_offers_game` | `/grow?tab=offers` |
| `crm_4_grow_customers` | `/grow?tab=customers` |
| `crm_4_grow_campaign_wizard_marketing_hub` | `/grow?tab=campaigns` |
| `crm_4_grow_wallet_billing` | `/grow?tab=wallet` |
| `crm_4_grow_ai_poster_copilot` | `/grow?tab=poster` |
| `crm_5_orders_kitchen_mode_counter_redeem_strip` | `/orders/kitchen` |
| `crm_5_orders_counter_loyalty_redeem_terminal` | `/orders/redeem` |
| `crm_6_settings_stickers_platform_admin` | `/settings`, `/settings/admin` |

Design tokens: `crimson_guest_experience/DESIGN.md`
