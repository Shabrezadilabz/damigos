# Phase 1 — MVP Pilot Task Checklist (v2.0)

**Plan cases:** P1-C01…C10 in [MASTER-PLAN-V2.md](../MASTER-PLAN-V2.md)  
**PRDs:** [GUEST-APP-PRD-V2-ADDENDUM.md](../prd/GUEST-APP-PRD-V2-ADDENDUM.md), [CRM-APP-PRD-V2-ADDENDUM.md](../prd/CRM-APP-PRD-V2-ADDENDUM.md)  
**Do not start Cross-By (P1.5) until P1 exit.**

| ID | Task | Owner | Status | Feature IDs |
|----|------|-------|--------|-------------|
| P1-T01 | Rewards engine + spin/scratch APIs | BE | ✅ | Grow dailySpinLimit + engineEnabled |
| P1-T02 | Guest checkout + Razorpay webhooks | BE | ✅ | single + checkout_group webhook capture |
| P1-T03 | Shiprocket quote + shipment on Accept | BE | ✅ | G-04.03, C-05.06; mock on Accept; live SR ⬜ |
| P1-T04 | Kitchen order APIs + SSE/WS or poll | BE | ✅ | SSE + 60s poll; WS → P2 |
| P1-T05 | Wallet ledger + top-up | BE | ✅ | stub packs + live prepare/verify |
| P1-T06 | Campaign queue + **Spark by D'aMigo** Kapso | BE | ✅ | C-04.05; mock/live Kapso |
| P1-T07 | 7-day marketing cap worker | BE | ✅ | preview + queue skip; scheduler ticks |
| P1-T08 | Menu PDF import worker | BE | ✅ | mock worker + e2e; live DeepSeek ⬜ |
| P1-T09 | Guest track + orders home (single order) | FE-G | ✅ | g12 confirmed + active poll + track |
| P1-T10 | CRM Grow tabs + campaign wizard | FE-C | ✅ | wallet cost preview on wizard |
| P1-T11 | CRM kitchen mode board + Accept | FE-C | ✅ | Accept CTA uses menu prep SLA |
| P1-T12 | Sticker activate UI | FE-C | ✅ | C-06.04 |
| P1-T13 | Error states g14/g15/g11 | FE-G | ✅ | G-ERR |
| P1-T14 | Pilot onboarding 10 kitchens + **GPS lat/lng** | Ops | 🔄 | seed Biryani+Masala GPS; expand to 10 ops |
| P1-T15 | Full regression P1 test suite | QA | 🔄 | See TEST-CASE-INDEX |
| P1-T16 | **Spark opt-in → auto game launch API** | BE | ✅ | G-01.10; mock Kapso; live ⬜ |
| P1-T17 | **Sparkle Win sheet + Apple motion (g1)** | FE-G | ✅ | G-01.07b; scope badge + spring sheet |
| P1-T18 | **Offer scope + first-order free delivery** | BE+FE | ✅ | G-04.08 scope + G-04.09 FREE delivery |
| P1-T19 | Migration geo + prep_category + offer.scope + timer/penalty + payout ledger | BE | ✅ | ensure-kitchen-schema + drizzle cols; offer.scope ✅ |
| P1-T20 | Menu item prep category UI + publish gate | FE-C | ✅ | Prep SLA drawer + PREP_CATEGORY_REQUIRED gate |
| P1-T21 | Kitchen Accept → timer 10/15 + +5m + Shiprocket | BE+FE | ✅ | server prep_deadline; FE board wired |
| P1-T22 | Waiting penalty job + ledger debit | BE | ✅ | finalize on DISPATCHED; rider-arrived stub |
| P1-T23 | Guest track live countdown | FE-G | ✅ | uses `prep_deadline_at` from Accept |
| P1-T24 | Settings location map pin | FE-C | ✅ | Settings → Kitchen location + geolocation |
| P1-T25 | **D'aMigo Food** utility confirm/track templates | BE | ✅ | confirm on PAID; HI; template env hooks |
| P1-T26 | Apple SF Pro tokens on guest+CRM shells | FE | ✅ | SF Pro stacks + pressable on guest+CRM |
| P1-T27 | Sanitize all Table 04 / Dine-in copy | FE-G | ✅ | CRM analytics + Grow labels → packaging |
