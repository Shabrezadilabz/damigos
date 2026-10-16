# Phase 0 — Exit smoke (manual)

Run after `npm run db:migrate`, `npm run db:seed`, `npm run dev:api`, `npm run dev:web`.

**Legend:** Mark test case status in [GUEST-TC.md](./test-cases/GUEST-TC.md) / [CRM-TC.md](./test-cases/CRM-TC.md) as ✅ Pass or ❌ Fail after each row.

| Harness ID | Test case | Steps | Expected |
|------------|-----------|-------|----------|
| P0-T30-a | TC-G-001 | Guest open `http://localhost:3000/s/{sampleToken}` from seed JSON | Lands on `/r/{id}?scan=…`; no error page |
| P0-T30-b | TC-G-040 | Open menu for same restaurant | "Draft Special" **not** listed; biryani items visible |
| P0-T30-c | TC-G-046 | Add item; use cart bar → checkout | Checkout page loads with line items |
| P0-T30-d | TC-G-030 | Checkout logged out → Pay | Profile/OTP gate before mock pay succeeds |
| P0-T30-e | TC-G-050 | Mock pay (substitutes TC-G-057 until Razorpay) | Order PAID; track page; CRM kitchen shows order |
| P0-T30-f | TC-C-002 | CRM `/start` owner `9876543210` OTP `000000` | Enters shell; menu API authorized |
| P0-T30-g | TC-C-020 | Menu Live/Draft tabs | Draft item only in Draft tab |
| P0-T30-h | TC-C-027 | Publish draft item; refresh guest menu | New item on guest menu after publish |

**Not in P0 exit (defer):** TC-C-001 onboarding form, TC-G-057 idempotency (P1 Razorpay).

**Bonus (P1 built):** spin → claim → checkout discount → kitchen Accept flow — see [DEVELOPMENT.md](../../DEVELOPMENT.md) happy path.

## Automated (Playwright)

With `ENABLE_DEV_FIXTURES=true` in root `.env`:

```powershell
npm run dev:api
npm run dev:web
npm run test:e2e
```

See [e2e/README.md](../../e2e/README.md). CRM publish: `e2e/crm/publish-menu.spec.ts` (TC-C-027). Kitchen loop: `e2e/cross/kitchen-flow.spec.ts` (P0-T30-e).

CI sets `PAYMENT_MODE=stub` so `guest/checkout-stub.spec.ts` (TC-G-058) runs alongside mock/stub pay button in checkout smoke.
