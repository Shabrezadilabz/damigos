# D'aMigo's — Data Model v2.0 (Logical Additions)

**Parent:** [DATA-MODEL.md](./DATA-MODEL.md)  
**Version:** 2.0 | **Date:** 2026-10-18  
**Status:** PLAN FREEZE — migrations in P1 / P1.5 only after PLAN-5 sign-off

---

## 1. New entities

### `checkout_groups`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `customer_id` | uuid FK | |
| `payment_intent_id` | text nullable | Razorpay |
| `status` | enum | `DRAFT`, `PAYMENT_PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `rider_mode` | enum | `SINGLE`, `SPLIT` |
| `distance_meters` | int nullable | Between R1–R2 when 2 legs |
| `delivery_fee_paise` | int | Guest-facing total delivery |
| `platform_delivery_subsidy_paise` | int | First-order free |
| `convenience_fee_paise` | int | Default 200 |
| `currency` | text | `INR` |
| `idempotency_key` | text unique | |
| `created_at` | timestamptz | |

### `restaurant_payout_ledger`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `order_id` | uuid FK nullable | |
| `entry_type` | enum | `ORDER_CREDIT`, `WAITING_PENALTY_DEBIT`, `ADJUSTMENT`, `PAYOUT` |
| `amount_paise` | int | Signed: credit +, debit − |
| `meta` | jsonb | overtime minutes, rates |
| `created_at` | timestamptz | |

---

## 2. Column additions

### `restaurants`

| Column | Type | Notes |
|--------|------|-------|
| `lat` | numeric(9,6) | Required for ordering_enabled |
| `lng` | numeric(9,6) | |
| `geo_updated_at` | timestamptz | |

### `menu_items`

| Column | Type | Notes |
|--------|------|-------|
| `prep_category` | enum | `READY_10M`, `COOKED_15M` default `COOKED_15M` |
| `prep_minutes` | int nullable | Override; else 10 or 15 |

### `offers`

| Column | Type | Notes |
|--------|------|-------|
| `scope` | enum | `RESTAURANT_SCOPED`, `PLATFORM_WIDE` |
| `restaurant_id` | uuid nullable | null only if PLATFORM_WIDE |

### `orders`

| Column | Type | Notes |
|--------|------|-------|
| `checkout_group_id` | uuid FK nullable | null for legacy single-cart |
| `leg_index` | smallint | 1 or 2 |
| `committed_prep_minutes` | int nullable | Set on Accept |
| `extended_prep_minutes` | int default 0 | 0 or 5 |
| `prep_deadline_at` | timestamptz | |
| `rider_arrived_at` | timestamptz | |
| `ready_for_pickup_at` | timestamptz | |
| `waiting_penalty_paise` | int default 0 | |
| `waiting_penalty_finalized` | bool default false | |

### `customer_restaurant_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `marketing_opt_in_source` | text | e.g. `SPARK_QR` |
| `marketing_opt_in_at` | timestamptz | |

### `carts` (logical)

| Change | Notes |
|--------|-------|
| Allow up to 2 distinct `restaurant_id` via `cart_legs` or `cart_items.restaurant_id` | Enforce max 2 in API |

Recommended: `cart_legs (cart_id, restaurant_id, sort_index)` with UNIQUE(cart_id, restaurant_id) and CHECK max 2 via trigger/app.

---

## 3. Relationships (v2)

```text
customers 1──* checkout_groups 1──* orders (leg_index 1..2)
restaurants 1──* restaurant_payout_ledger
orders *──1 restaurants
offers.scope → RESTAURANT_SCOPED requires restaurant_id
```

---

## 4. Order states (v2 addition)

Insert `READY_FOR_PICKUP` between `PREPARING` and `DISPATCHED` (alias of former `READY`).

`DRAFT` → `PAYMENT_PENDING` → `PAID` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `DISPATCHED` → `DELIVERED` → `CLOSED`

---

## 5. Indexes

| Table | Index |
|-------|-------|
| `checkout_groups` | `(customer_id, created_at desc)` |
| `orders` | `(checkout_group_id)` |
| `orders` | `(restaurant_id, status, created_at desc)` |
| `restaurant_payout_ledger` | `(restaurant_id, created_at desc)` |
| `restaurants` | optional GiST/postgis later; P1 uses lat/lng Haversine in app |

---

## 6. Migration plan

| Migration | Phase | Contents |
|-----------|-------|----------|
| `00xx_geo_prep_offers` | P1 | restaurants lat/lng; menu prep; offers.scope; order timer/penalty cols; payout ledger |
| `00xy_checkout_groups` | P1.5 | checkout_groups; orders.checkout_group_id; cart_legs |
