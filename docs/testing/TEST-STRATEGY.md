# D'aMigo's — Test Strategy

## 1. Test layers

| Layer | Scope | Tools (suggested) |
|-------|--------|-----------------|
| Unit | Domain rules (cap, pricing, state machine) | Vitest/Jest |
| API | Contract tests per endpoint | Supertest + OpenAPI |
| Integration | Webhooks Razorpay/Shiprocket/Kapso (sandbox) | Staging |
| E2E | Guest scan→pay; CRM campaign | Playwright |
| Manual | WA device webview, UPI real ₹1 | Pilot checklist |

## 2. Environments

- **Local:** mocked integrations
- **Staging:** sandbox keys; Kapso test WABA
- **Pilot prod:** real keys; limited restaurants

## 3. Test data

- Seed restaurant `demo-kitchen`
- Sticker batch `TEST-BATCH-001` with tokens `test-token-{n}`
- Test phone numbers whitelisted for OTP bypass in non-prod only

## 4. Exit gate per phase

All test cases tagged `P0`/`P1`/… for that phase must pass or be waived in BUG-LOG with product sign-off.

## 5. Documents

- [GUEST-TEST-PLAN.md](./GUEST-TEST-PLAN.md)
- [CRM-TEST-PLAN.md](./CRM-TEST-PLAN.md)
- [test-cases/GUEST-TC.md](./test-cases/GUEST-TC.md)
- [test-cases/CRM-TC.md](./test-cases/CRM-TC.md)
- [test-cases/INTEGRATION-TC.md](./test-cases/INTEGRATION-TC.md)
