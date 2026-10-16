# CRM — Test Cases

P0 exit smoke: [P0-EXIT-SMOKE.md](../P0-EXIT-SMOKE.md)

| ID | Pri | Feature | Steps | Expected | Status |
|----|-----|---------|-------|----------|--------|
| TC-C-001 | P0 | C-01.01 | Submit onboarding | Application created | ⏸ |
| TC-C-002 | P0 | C-01.02 | OTP login owner | JWT with OWNER role | ✅ |
| TC-C-003 | P0 | C-01.02 | 5 bad OTPs | Temporary lock | ⬜ |
| TC-C-004 | P0 | C-01.03 | Activate tenant | Guest menu visible | ⬜ |
| TC-C-010 | P1 | C-02.01 | Dashboard KPIs | Match seed data | ⬜ |
| TC-C-011 | P1 | C-02.02 | Recent orders | Max 5 rows | ⬜ |
| TC-C-012 | P1 | C-02.03 | Low wallet alert | Banner when balance < threshold | ⬜ |
| TC-C-013 | P2 | C-02.04 | Funnel chart | Scan→order metrics | ⬜ |
| TC-C-014 | P2 | C-02.04 | Export CSV | File downloads | ⬜ |
| TC-C-020 | P0 | C-03.01 | Live/Draft tabs | Correct counts | ✅ |
| TC-C-021 | P0 | C-03.02 | Create item | Appears in draft | ⬜ |
| TC-C-022 | P1 | C-03.03 | Upload PDF | Job queued | ⬜ |
| TC-C-023 | P1 | C-03.03 | Job complete | Draft rows created | ⬜ |
| TC-C-024 | P1 | C-03.03 | Job failed | Error surfaced | ⬜ |
| TC-C-025 | P1 | C-03.04 | Low confidence highlight | UI flags rows | ⬜ |
| TC-C-026 | P0 | C-03.05 | Edit drawer | Saves item | ⬜ |
| TC-C-027 | P0 | C-03.06 | Publish | Guest API shows new version | ✅ |
| TC-C-028 | P1 | C-03.07 | 86 item | Guest cannot add | ⬜ |
| TC-C-029 | P0 | C-03.08 | Categories CRUD | Items reassign | ⬜ |
| TC-C-040 | P1 | C-04.01 | Configure wheel | Weights validated | ⬜ |
| TC-C-041 | P1 | C-04.01 | Spin limit | Guest respects limit | 🔄 |
| TC-C-042 | P1 | C-04.02 | Customer list | Phone masked | 🔄 |
| TC-C-044 | P1 | C-04.04 | Campaign list | Statuses correct | 🔄 |
| TC-C-045 | P1 | C-04.05 | Wizard step 1 audience | Count preview | ✅ |
| TC-C-046 | P1 | C-04.05 | Step 2 template | Only approved templates | ⬜ |
| TC-C-047 | P1 | C-04.05 | Schedule | Enqueues jobs | ⬜ |
| TC-C-048 | P1 | C-04.05 | 7-day cap | Skips recent recipients | ⬜ |
| TC-C-049 | P1 | C-04.05 | Insufficient wallet | Blocks schedule | ✅ |
| TC-C-050 | P1 | C-04.06 | Top-up ₹999 | Balance increases | ✅ |
| TC-C-051 | P1 | C-04.06 | Ledger | Debit on send | ✅ |
| TC-C-054 | P2 | C-04.07 | AI poster | Requires approve | ⬜ |
| TC-C-060 | P1 | C-05.01 | Order filter | By status | ⬜ |
| TC-C-061 | P1 | C-05.02 | Accept order | Guest track updates | ✅ |
| TC-C-062 | P1 | C-05.02 | Reject order | Guest notified | ⬜ |
| TC-C-063 | P1 | C-05.02 | Kitchen live | SSE refresh on new/updated orders | 🔶 |
| TC-C-064 | P1 | C-05.02 | Poll fallback | 60s refresh works | 🔶 |
| TC-C-067 | P1 | C-05.04 | Redeem valid PIN | Success | ⬜ |
| TC-C-068 | P1 | C-05.04 | Kitchen role only redeem | Owner can access | ⬜ |
| TC-C-070 | P0 | C-06.01 | Update logo | Guest header updates | ⬜ |
| TC-C-071 | P1 | C-06.02 | Invite staff | OTP login as KITCHEN | ⬜ |
| TC-C-073 | P1 | C-06.03 | Razorpay linked | Status displayed | ⬜ |
| TC-C-075 | P1 | C-06.04 | Activate batch | Scan works | ⬜ |
| TC-C-080 | P1 | C-06.05 | Admin mint | Batch + tokens | ⬜ |
| TC-C-081 | P1 | C-06.05 | Non-admin mint | 403 | ⬜ |
| TC-C-083 | P1 | C-06.06 | Revoke batch | Scan fails G-ERR-03 | ⬜ |
| TC-C-084 | P1 | C-06.07 | Pause ordering | Guest g15 state | ⬜ |
