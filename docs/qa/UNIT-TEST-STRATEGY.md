# YUMM deep feature-level unit test strategy

Stack mapping: **Vitest ≈ Jest/JUnit/TestNG**, **Playwright ≈ Appium (web)**.

## Scope (required)

| Layer | Coverage |
|-------|----------|
| Every `src/**/*.ts(x)` module | Dedicated `tests/unit/**/*.test.ts(x)` with **positive** + **negative** |
| Pages / layouts / loading / error / not-found | Included (Next mocks in `tests/setup.ts`) |
| Backend routes | Mount `register*` on Fastify + negative bogus-export checks; critical routes also use `app.inject` |
| Pure libs | Hand-written business asserts where rules are fixed (fees, bands, OTP, stickers, …) + deep surface suites for the rest |

## Commands

```bash
npm run test:unit:generate      # create missing per-file suites
npm run test:unit:enrich-deep   # upgrade/include pages+layouts+deep feature suites
npm run test:unit               # run all four projects
npm run test:unit:crm-api
npm run test:unit:guest-api
npm run test:unit:crm-web
npm run test:unit:guest-web
npm run test:e2e                # full UI flows (Playwright)
```

## Inventory (after enrich-deep)

| App | Source files | Unit test files |
|-----|-------------|-----------------|
| CRM API | 82 | ~83 |
| Guest API | 54 | ~54 |
| CRM Web | 100 | ~100 (incl. page/layout) |
| Guest Web | 87 | ~87 (incl. page/layout) |

Hand-written business suites are preserved by the enricher (fees, cart lock, Spark TTL, price bands, bank gate, stickers, waiting penalty, health/scan inject, Button/Badge/`cn`, …).

## Honesty bar

- **File + feature surface:** every module now has a deep pos/neg suite (including pages/layouts).
- **Domain oracle depth:** critical money/auth/menu rules have explicit expected values; remaining modules assert export/mount/render contracts and fail-closed negative paths. Expand oracles as product rules freeze.
- **E2E bible:** still run Playwright + `YUMM-Manual-Test-Runbook.md` for full guest journeys.
