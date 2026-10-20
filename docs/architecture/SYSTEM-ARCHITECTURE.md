# D'aMigo's — System Architecture

**Version:** 1.0 + **v2.0 planning overlays** | **Date:** 2026-10-15 · overlay 2026-10-18  
**v2 companions:** [DATA-MODEL-V2.md](./DATA-MODEL-V2.md) · [INTEGRATIONS-V2.md](./INTEGRATIONS-V2.md) · [MASTER-PLAN-V2.md](../MASTER-PLAN-V2.md)

---

## 1. Logical architecture

```text
                         ┌──────────────────────────────────────┐
                         │           Edge (TLS, WAF)            │
                         └───────────────────┬──────────────────┘
         ┌──────────────────────────────────┼──────────────────────────────────┐
         ▼                                  ▼                                  ▼
  guest-web (Next.js)              crm-web (Next.js)              marketing (existing)
  Mobile webview                   Desktop / tablet kitchen
         │                                  │
         └──────────────────┬───────────────┘
                            ▼
              ┌─────────────────────────────┐
              │  API Gateway / BFF (optional) │
              └─────────────┬───────────────┘
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
  guest-api                              crm-api
  (public + guest JWT)                   (staff JWT + RBAC)
         │                                     │
         └──────────────────┬──────────────────┘
                            ▼
         ┌──────────────────────────────────────────┐
         │  Domain modules (shared package or monorepo) │
         │  identity, scan, catalog, cart, orders,      │
         │  rewards, wallet, marketing, integrations    │
         └──────────────────┬───────────────────────────┘
                            │
    ┌───────────┬───────────┼───────────┬────────────┐
    ▼           ▼           ▼           ▼            ▼
 PostgreSQL   Redis      S3/R2      BullMQ       Webhook
 (OLTP)       cache      assets     workers      ingress
```

**Phase 1 recommendation:** Monorepo `damigos-platform/` with `apps/guest-web`, `apps/crm-web`, `apps/guest-api`, `apps/crm-api`, `packages/domain`, `packages/db`.

---

## 2. Deployment units

| Unit | Scale | Notes |
|------|-------|-------|
| guest-web | Static/SSR on Vercel or container | CDN for images |
| crm-web | Same | |
| guest-api | Horizontal pods | Stateless |
| crm-api | Horizontal + WS sticky sessions | Kitchen WS |
| workers | 2+ replicas | Campaigns, menu extract, webhooks |
| Postgres | Managed (RDS/Supabase/Neon) | Backups daily |
| Redis | Managed | OTP rate limit, WS pub/sub |

---

## 3. Authentication

| Actor | Method | Token |
|-------|--------|-------|
| Guest | Phone OTP | JWT `sub=customer_id`, short TTL + refresh |
| Staff | Phone OTP | JWT `sub=user_id`, `restaurant_id`, `roles[]` |
| Admin | Phone OTP + allowlist | JWT `PLATFORM_ADMIN` |
| Webhooks | HMAC signature per provider | No JWT |

---

## 4. Critical flows (references)

| Flow | Doc section |
|------|-------------|
| Scan → order | Guest PRD §7, INTEGRATIONS §QR |
| Campaign send | CRM PRD C-04.05, INTEGRATIONS §Kapso |
| Payment | INTEGRATIONS §Razorpay |
| Delivery | INTEGRATIONS §Shiprocket |
| EOD settlement | Worker `settlement_eod` (P1) |

---

## 5. WebSocket (kitchen)

- Channel: `restaurant:{id}:orders`
- Events: `order.created`, `order.updated`, `order.cancelled`
- Fallback: `GET /v1/orders?since=` poll 30s

---

## 6. Observability

| Signal | Tool (suggested) |
|--------|------------------|
| Logs | Structured JSON, correlation id |
| Metrics | Order rate, scan rate, campaign failure rate |
| Traces | OpenTelemetry on API + workers |
| Alerts | Kapso failure spike, payment webhook lag |

---

## 7. Security

- Tenant isolation: every query filters `restaurant_id`
- PII encryption at rest for phone (hash + encrypt)
- Secrets in vault; rotate Kapso/Razorpay keys
- CSP on guest-web for webview

---

## 8. Related documents

- [DATA-MODEL.md](./DATA-MODEL.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
- [API-CONTRACTS-OVERVIEW.md](./API-CONTRACTS-OVERVIEW.md)
- [FLOW-DIAGRAMS.md](./FLOW-DIAGRAMS.md)
