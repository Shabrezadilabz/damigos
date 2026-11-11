# YUMM Manual Test Runbook (1-by-1)

Use with local stacks:
- Guest: http://localhost:3000 · API http://localhost:4000/health
- CRM: http://localhost:3001/start · API http://localhost:4001/health
- Owner OTP: `9876543210` / `000000` (dev)

Mark each row: **Pass / Fail / Blocked** + notes.

Related Excel: `docs/qa/YUMM-Full-QA-Scenarios-v2.xlsx`

---

## Wave 0 — Theme

| # | Scenario | Steps | Expected | Result |
|---|----------|-------|----------|--------|
| T0.1 | CRM plum/milk | Open CRM home after login | Background milk `#fff3e6`-family; primary plum; no lime CTAs | |
| T0.2 | Guest plum/milk | Open guest hub | Same palette; accent soft plum | |
| T0.3 | Header wallet chip | CRM any logged-in page | Top bar shows Wallet balance → `/grow?tab=wallet` | |

---

## Wave 1 — P0 product

| # | ID | Scenario | Steps | Expected | Result |
|---|-----|----------|-------|----------|--------|
| T1.1 | TC-WAL-ONB-01 | Welcome ₹1000 | Fresh ACTIVE kitchen → Grow wallet | Ledger `WELCOME_CREDIT` ₹1000 once; no double on re-login | |
| T1.2 | C-01.02 | Bank before activate | Onboarding without bank → submit | Blocked / BANK_DETAILS_REQUIRED; with bank → activate | |
| T1.3 | C-06.04 | Sticker one-scan burn | Scan active token twice | 1st → Spark; 2nd → STICKER_CONSUMED | |
| T1.4 | Spark TTL | Start Spark session; wait / mock clock | Default expires 6h; `ttl=1h` ultra-short | |
| T1.5 | Guest 49/99 | CRM add item not 49/99 | Rejected; 49 or 99 OK; guest cart stale price → refresh/block | |
| T1.6 | Menu OFF | CRM toggle storefront OFF | Kitchen hidden/unorderable on guest hub | |
| T1.7 | Better luck | Spin until no_prize (or force) | Sheet “No win”; no redeem CTA | |
| T1.8 | 5-in-1 cap | Collect 5 unredeemed wins | 6th play/claim blocked | |
| T1.9 | Silent fees | Guest checkout bill | Food + delivery only; no Convenience line; totals include micro-fees | |

---

## Wave 2 — P1

| # | Scenario | Steps | Expected | Result |
|---|----------|-------|----------|--------|
| T2.1 | Dual images | Set guest image on item | Guest menu shows guest image | |
| T2.2 | Categories | Create/hide category | Guest menu groups; hidden excluded | |
| T2.3 | Auto campaigns | Enable program + scheduler | Manual still works; poster needs Approve | |
| T2.4 | Wallet debit | Run campaign with balance | Idempotent debit; header wallet updates | |
| T2.5 | Sticker activate | Mint in prod-like env | RequiresActivation when auto-activate off | |

---

## Wave 3 — P2

| # | Scenario | Steps | Expected | Result |
|---|----------|-------|----------|--------|
| T3.1 | Direct/ONDC rails | Dashboard settlement | Direct vs ONDC counts (ONDC 0 until ingest) | |
| T3.2 | Shiprocket quote | Checkout with pincode | Quote works; first-order free zeros delivery | |
| T3.3 | Kapso mock | Spark opt-in | Templates mock OK | |

---

## Awards UI

| # | Scenario | Steps | Expected | Result |
|---|----------|-------|----------|--------|
| T4.1 | Wheel motion | Spin | Idle wobble → eased spin → lands on prize | |
| T4.2 | Scratch | Scratch mode | Finger foil; reveal then win sheet | |
| T4.3 | Confetti | Win (not no_prize) | Plum/milk confetti | |

---

## Known gaps (document only — may Fail)

- Import/publish can bypass 49/99
- ONDC order create → rail stays 0
- Birthday auto-dispatch not wired
- Grow program scheduler off unless `GROW_PROGRAM_SCHEDULER_ENABLED=true`

---

## Browser session log

| Date | Tester | Environment | Notes |
|------|--------|-------------|-------|
| 2026-11-11 | Auto / agent | localhost CRM:3001 Guest:3000 | **T0.3 Pass** — header chip `₹8,986.00 Wallet` after owner OTP; Grow wallet tab loads balance + ledger. **T0.1/T0.2** milk/plum chrome visible. Guest hub loads. Playwright `header-wallet.spec.ts` added (needs `npx playwright install` locally). |

### Session Pass marks

| # | Result | Evidence |
|---|--------|----------|
| T0.3 | **Pass** | CRM home + Grow header chip; `/grow?tab=wallet` kitchen wallet ₹8986 / spendable ₹7986 |
| T0.2 | **Pass** | Guest `/hub` renders |
| Login | **Pass** | Owner `9876543210` / `000000` → CRM shell |
