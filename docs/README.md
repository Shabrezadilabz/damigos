# D'aMigo's — Product & Engineering Documentation Hub

**Last updated:** 2026-10-18 (v2.0 planning suite)  
**Owner:** Product / Engineering  
**Status:** Living docs — **PLANNING LOCK in progress; no new build scope until MASTER-PLAN-V2 §9 sign-off**

This folder is the **single source of truth** for building, testing, and releasing the D'aMigo's platform (guest webview + restaurant CRM + shared backend).

**Workspace root:** [../README.md](../README.md) · **Stitch PNG/HTML:** [../design-reference/stitch/](../design-reference/stitch/)

---

## Start here (v2.0)

1. **[MASTER-PLAN-V2.md](./MASTER-PLAN-V2.md)** — ✅ FINALIZED phased plan + sign-off
2. **[design/APPLE-DESIGN-SYSTEM.md](./design/APPLE-DESIGN-SYSTEM.md)** — SF Pro + 17 Apple principles
3. **[design/WA-OWNLY-GUEST-UI-REFERENCE.md](./design/WA-OWNLY-GUEST-UI-REFERENCE.md)** — WhatsApp Ownly UI pack (DEC-016)
4. **[design/STITCH-SCREEN-MAP.md](./design/STITCH-SCREEN-MAP.md)** — `g*` / `crm_*` → routes
5. **[tracking/DECISION-LOG.md](./tracking/DECISION-LOG.md)** — DEC-001…016
6. PRD overlays: [GUEST-APP-PRD-V2-ADDENDUM.md](./prd/GUEST-APP-PRD-V2-ADDENDUM.md) · [CRM-APP-PRD-V2-ADDENDUM.md](./prd/CRM-APP-PRD-V2-ADDENDUM.md)

---

## Quick start (team workflow)

1. Read **[harness/DEVELOPMENT-HARNESS.md](./harness/DEVELOPMENT-HARNESS.md)** — how we use these docs day to day.
2. Pick your app PRD:
   - **[prd/GUEST-APP-PRD.md](./prd/GUEST-APP-PRD.md)** + v2 addendum → `guest-web` + guest API
   - **[prd/CRM-APP-PRD.md](./prd/CRM-APP-PRD.md)** + v2 addendum → `crm-web` + CRM API
3. Check **[architecture/SYSTEM-ARCHITECTURE.md](./architecture/SYSTEM-ARCHITECTURE.md)** + **DATA-MODEL-V2** / **INTEGRATIONS-V2**.
4. Implement against **[tracking/FEATURE-TRACEABILITY.md](./tracking/FEATURE-TRACEABILITY.md)** (feature ID → phase → test case).
5. Execute tests from **[testing/TEST-CASE-INDEX.md](./testing/TEST-CASE-INDEX.md)** and mark cases in `testing/test-cases/`.
6. Log bugs in **[tracking/BUG-LOG.md](./tracking/BUG-LOG.md)**; release via **[tracking/RELEASE-CHECKLIST.md](./tracking/RELEASE-CHECKLIST.md)**.

---

## PDF exports

| Document | Markdown | PDF |
|----------|----------|-----|
| Guest PRD | [prd/GUEST-APP-PRD.md](./prd/GUEST-APP-PRD.md) | [prd/pdf/GUEST-APP-PRD.pdf](./prd/pdf/GUEST-APP-PRD.pdf) |
| CRM PRD | [prd/CRM-APP-PRD.md](./prd/CRM-APP-PRD.md) | [prd/pdf/CRM-APP-PRD.pdf](./prd/pdf/CRM-APP-PRD.pdf) |

Generate PDFs locally:

```powershell
cd damigos_main/docs
npm install
npm run pdf
```

---

## Directory map

| Path | Purpose |
|------|---------|
| [prd/](./prd/) | Product requirements (two apps + PDF) |
| [architecture/](./architecture/) | System design, data model, integrations, flows |
| [harness/](./harness/) | Dev workflow, conventions, definition of done |
| [phases/](./phases/) | Roadmap and phased task checklists |
| [testing/](./testing/) | Test strategy, plans, executable test cases |
| [tracking/](./tracking/) | Traceability matrix, bugs, decisions, release |
| [gaps/](./gaps/) | Design vs product gaps, open decisions |
| [design/](./design/) | Stitch screen → route mapping |
| [scripts/](./scripts/) | PDF generation and doc utilities |

---

## Product thesis (one paragraph)

D'aMigo's is a **post-aggregator layer** for delivery-heavy restaurants: **packaging QR/barcode** (one sticker = one kitchen) opens a **restaurant-branded mobile webview** (rewards → menu → cart → UPI → track). The **CRM** gives owners menu AI, sticker activation, kitchen ops, prepaid wallet, and **capped WhatsApp marketing**. Platform revenue: wallet top-up, message margin, sticker margin, guest convenience fee, delivery markup — **zero food commission**.

**Phase 1 pilot:** Bangalore micro-market; ICP = cloud kitchens + delivery-heavy independents.

---

## Related repos / apps (target layout)

| App | Repo path (planned) | PRD |
|-----|---------------------|-----|
| Guest webview | `damigos-guest-web` (TBD) | Guest PRD |
| CRM web | `damigos-crm-web` (TBD) | CRM PRD |
| Guest API | `damigos-guest-api` (TBD) | Architecture + both PRDs |
| CRM API | `damigos-crm-api` (TBD) | Architecture + both PRD |
| Marketing | `damigos-whatsapp-order-flow` | Out of scope except links |

---

## Document control

When you change behavior, update in order:

1. PRD (if user-visible or contractual)
2. Architecture / integrations (if APIs or third parties change)
3. Feature traceability + test cases
4. Phase task checklist item status
5. Decision log (if tradeoff locked)
