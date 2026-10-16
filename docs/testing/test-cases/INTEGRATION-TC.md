# Platform & Integration — Test Cases

| ID | System | Steps | Expected | Status |
|----|--------|-------|----------|--------|
| TC-P-001 | Razorpay | Guest pay test mode | Webhook idempotent; order PAID | ⬜ |
| TC-P-002 | Razorpay | Wallet top-up | Credit wallet | ⬜ |
| TC-P-003 | Razorpay | Route split | Restaurant receives food amount | ⬜ |
| TC-P-004 | Shiprocket | Quote valid pin | Rate returned | ⬜ |
| TC-P-005 | Shiprocket | Invalid pin | Serviceability false | ⬜ |
| TC-P-006 | Shiprocket | Create AWB post-pay | Tracking id stored | ⬜ |
| TC-P-007 | Shiprocket | Webhook delivered | Order CLOSED/DELIVERED | ⬜ |
| TC-P-008 | Kapso | Utility order confirm | Template delivered | ⬜ |
| TC-P-009 | Kapso | Marketing send opt-in false | Not sent | ⬜ |
| TC-P-010 | Kapso | Marketing 7-day cap | Second send skipped | ⬜ |
| TC-P-011 | Kapso | Failed delivery webhook | Logged; retry policy | ⬜ |
| TC-P-012 | DeepSeek | Menu PDF job | JSON draft rows | ⬜ |
| TC-P-013 | Webhooks | Bad signature | 401/403 no state change | ⬜ |
| TC-P-014 | E2E | Scan→pay→kitchen | Full path under 5 min manual | ⬜ |
