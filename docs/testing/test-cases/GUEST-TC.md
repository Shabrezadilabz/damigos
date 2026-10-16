# Guest — Test Cases

Format: **ID | Priority | Feature | Steps | Expected | Status**

Status: ⬜ Not run | 🔶 Dev ready | ✅ Pass | ❌ Fail | ⏸ Blocked

P0 exit smoke: [P0-EXIT-SMOKE.md](../P0-EXIT-SMOKE.md)

---

| ID | Pri | Feature | Steps | Expected | Status |
|----|-----|---------|-------|----------|--------|
| TC-G-001 | P0 | G-01.01 | Open `/s/valid-token` | Redirect to restaurant landing; scan logged | ✅ |
| TC-G-002 | P0 | G-01.01 | Open `/s/invalid` | G-ERR-01 invalid QR | ✅ |
| TC-G-003 | P1 | G-01.01 | Open expired batch token | G-ERR-02 expired copy (batch dates) | ✅ |
| TC-G-004 | P1 | G-01.01 | Open revoked token | G-ERR-03 | 🔶 |
| TC-G-010 | P0 | G-01.02 | Load landing authenticated | Credits pill matches API | ⬜ |
| TC-G-011 | P1 | G-01.03 | Landing copy | No "Table 04" for packaging scan | ⬜ |
| TC-G-012 | P1 | G-01.04 | Offer carousel | Offers from API; T&C link works | ⬜ |
| TC-G-020 | P1 | G-01.05 | Spin once | Outcome recorded; UI shows prize | ⬜ |
| TC-G-021 | P1 | G-01.05 | Spin twice over limit | Blocked with message | ✅ |
| TC-G-022 | P1 | G-01.05 | No ads on spin screen | No third-party ad slots | ⬜ |
| TC-G-023 | P1 | G-01.06 | Scratch tab | Same engine as spin policy | ⬜ |
| TC-G-024 | P1 | G-01.07 | Avail offer | Claim API success; offer in cart context | ⬜ |
| TC-G-025 | P1 | G-01.07 | Repeat claim same prize | Idempotent | ⬜ |
| TC-G-026 | P1 | G-01.08 | Skip to menu | Menu loads without claim | ⬜ |
| TC-G-030 | P0 | G-02.01 | Checkout without profile | Profile modal blocks pay | ✅ |
| TC-G-031 | P0 | G-02.01 | OTP request | SMS/API success | ⬜ |
| TC-G-032 | P0 | G-02.01 | Wrong OTP | Error; lock after N tries | ⬜ |
| TC-G-033 | P0 | G-02.01 | Valid OTP | JWT/session established | ⬜ |
| TC-G-034 | P0 | G-02.02 | Marketing off | Consent stored false | ⬜ |
| TC-G-035 | P0 | G-02.02 | Game vs marketing | Separate toggles | ⬜ |
| TC-G-040 | P0 | G-03.01 | Published menu | Only live items | ✅ |
| TC-G-041 | P0 | G-03.02 | Out of stock item | Cannot add | ⬜ |
| TC-G-042 | P1 | G-03.03 | Search | Filters list | ⬜ |
| TC-G-043 | P0 | G-03.04 | Open item sheet | Modifiers affect price | ⬜ |
| TC-G-044 | P0 | G-03.04 | Add to cart | Cart bar updates | ⬜ |
| TC-G-045 | P2 | G-03.05 | Reference price | Shows only if set; no brand logos | ⬜ |
| TC-G-046 | P0 | G-03.06 | Cart bar | Nav to checkout | ✅ |
| TC-G-047 | P1 | G-03.07 | Kitchen paused | Order CTA disabled | ⬜ |
| TC-G-048 | P1 | G-03.08 | Back from menu | Goes to `/orders` | ⬜ |
| TC-G-050 | P0 | G-04.01 | Cart review | Lines match API | ✅ |
| TC-G-051 | P1 | G-04.02 | Add address | Saved for guest | ⬜ |
| TC-G-052 | P1 | G-04.02 | Unserviceable pin | Error before pay | ⬜ |
| TC-G-053 | P1 | G-04.02 | Map pin drag | Updates lat/lng | ⬜ |
| TC-G-054 | P1 | G-04.03 | Delivery quote | Shiprocket + ₹5 line visible | ✅ |
| TC-G-055 | P1 | G-04.03 | Quote API fail | Checkout blocked | ✅ |
| TC-G-056 | P1 | G-04.04 | Bill | Convenience ₹2 present | ⬜ |
| TC-G-057 | P1 | G-04.05 | Create order | Idempotency key prevents duplicate | ⏸ |
| TC-G-058 | P1 | G-04.05 | Razorpay test pay | Webhook → PAID | ✅ |
| TC-G-059 | P1 | G-04.05 | Mixed restaurant cart | Rejected server-side G-R01 | ⬜ |
| TC-G-060 | P1 | G-04.06 | Success screen | Track link works | ⬜ |
| TC-G-061 | P1 | G-04.07 | Failed pay | Retry path | ⬜ |
| TC-G-070 | P1 | G-05.01 | Track timeline | Status matches kitchen updates | ✅ |
| TC-G-071 | P2 | G-05.02 | Map | AWB tracking when available | ⬜ |
| TC-G-080 | P1 | G-06.01 | Orders tabs | Active/past split | ✅ |
| TC-G-081 | P1 | G-06.02 | Reorder | Opens correct restaurant menu | ✅ |
| TC-G-090 | P2 | G-07.01 | Hub list | Curated kitchens only | ⬜ |
| TC-G-092 | P2 | G-07.03 | Switch kitchen | Cart cleared after confirm | ⬜ |
| TC-G-100 | P1 | G-ERR | Expired UI | No "60 min table" copy | 🔶 |

---

## Automation mapping (when implemented)

| ID | Spec file (planned) |
|----|---------------------|
| TC-G-001 | `e2e/guest/scan.spec.ts` |
| TC-G-050 | `e2e/guest/checkout.spec.ts` |
| TC-G-058 | `e2e/guest/checkout-stub.spec.ts`, `e2e/guest/razorpay-webhook.spec.ts` |
| TC-G-070 | `e2e/cross/kitchen-flow.spec.ts` |
| TC-G-080/081 | `e2e/guest/orders-home.spec.ts` |
| TC-G-054 | `e2e/guest/checkout-delivery.spec.ts` |
