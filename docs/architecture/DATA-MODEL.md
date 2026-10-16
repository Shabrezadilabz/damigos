# D'aMigo's — Data Model (Logical)

**Version:** 1.0

---

## 1. Entity list

| Entity | Purpose |
|--------|---------|
| `restaurants` | Tenant kitchen |
| `users` | Staff accounts |
| `user_restaurant_roles` | RBAC |
| `customers` | Global guest (phone unique) |
| `customer_restaurant_profiles` | Per-kitchen credits, marketing opt-in |
| `consent_records` | DPDP version + timestamp |
| `sticker_batches` | Mint metadata, validity |
| `sticker_tokens` | Public token, status |
| `scan_events` | Analytics |
| `menu_versions` | Published snapshot |
| `menu_categories` | |
| `menu_items` | Draft + live pointer |
| `carts` / `cart_items` | Guest session cart |
| `orders` / `order_items` | |
| `order_status_history` | Timeline |
| `payment_intents` | Razorpay ids |
| `delivery_quotes` / `shipments` | Shiprocket |
| `offers` | CRM-defined |
| `reward_plays` | Spin/scratch log |
| `reward_claims` | Availed offers |
| `wallet_accounts` | Restaurant prepaid |
| `wallet_transactions` | Ledger |
| `campaigns` | |
| `campaign_recipients` | |
| `message_delivery_log` | Kapso statuses |
| `audit_log` | Admin actions |

---

## 2. Key relationships

```text
restaurants 1──* sticker_batches 1──* sticker_tokens
restaurants 1──* menu_items *──1 menu_versions (published)
customers 1──* customer_restaurant_profiles *──1 restaurants
customers 1──* orders *──1 restaurants
orders 1──* order_items *──1 menu_items
restaurants 1──1 wallet_accounts 1──* wallet_transactions
campaigns *──1 restaurants 1──* campaign_recipients *──1 customers
```

---

## 3. Sticker token states

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Scannable within batch dates |
| `EXPIRED` | Past `valid_to` |
| `REVOKED` | Admin action |
| `CONSUMED` | Single-use policy exhausted |

**Open decision:** default multi-scan vs single-use — see DECISION-LOG.

---

## 4. Order states

`DRAFT` → `PAYMENT_PENDING` → `PAID` → `ACCEPTED` → `PREPARING` → `READY` → `DISPATCHED` → `DELIVERED` → `CLOSED`

Terminal: `CANCELLED`, `PAYMENT_FAILED`, `REFUNDED`

---

## 5. Indexing (performance)

| Table | Index |
|-------|-------|
| `sticker_tokens` | `token` unique |
| `orders` | `(restaurant_id, created_at desc)` |
| `customers` | `phone_hash` unique |
| `message_delivery_log` | `(campaign_id, status)` |

---

## 6. Retention

| Data | Retention |
|------|-----------|
| Scan events | 24 months |
| Message logs | 36 months |
| Audit log | 7 years |
| Guest erasure | Anonymize PII per DPDP request |
