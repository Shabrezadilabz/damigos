# Phase 1 — MVP Pilot Task Checklist

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P1-T01 | Rewards engine + spin/scratch APIs | BE | 🔄 | daily limit + scratch + TC-G-024 checkout claim E2E |
| P1-T02 | Guest checkout + Razorpay webhooks | BE | 🔄 | raw-body webhook + HMAC; verify-razorpay; edge proxy note in DEVELOPMENT |
| P1-T03 | Shiprocket quote + shipment create | BE | 🔄 | mock quote + mock AWB on PAID; live SR ⬜ |
| P1-T04 | Kitchen order APIs + WS or poll | BE | 🔄 | REST + SSE/Redis refresh; WS optional ⬜ |
| P1-T05 | Wallet ledger + top-up | BE | 🔄 | DB ledger + stub top-up; Razorpay live ⬜ |
| P1-T06 | Campaign queue + Kapso marketing | BE | 🔄 | DB campaigns + mock dispatch; live Kapso ⬜ |
| P1-T07 | 7-day marketing cap worker | BE | 🔄 | Preview + queue + scheduler auto-dispatch (TC-C-052) |
| P1-T08 | Menu PDF import worker | BE | 🔄 | C-03.03–04 mock extract + split review UI; live DeepSeek ⬜ |
| P1-T09 | Guest track + orders home | FE-G | 🔄 | G-05 track; G-06 tabs + reorder |
| P1-T10 | CRM Grow tabs + campaign wizard | FE-C | 🔄 | C-04 tabs + 4-step wizard; DB campaigns (T06) |
| P1-T11 | CRM kitchen mode | FE-C | 🔄 | C-05.02 — board + actions |
| P1-T12 | Sticker activate UI | FE-C | ✅ | C-06.04 — Settings (P0) |
| P1-T13 | Error states g14/g15/g11 | FE-G | ✅ | G-ERR — g11/g14/g15 + TC-G-003/004 E2E |
| P1-T14 | Pilot onboarding 10 kitchens | Ops | ⬜ | — |
| P1-T15 | Full regression P1 test suite | QA | 🔄 | 36 Playwright tests — API session seed in fixtures |
