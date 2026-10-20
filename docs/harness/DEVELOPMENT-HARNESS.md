# D'aMigo's — Development Harness (v2.0)

**Purpose:** Repeatable rules for engineering, QA, and release so every phase ships with verified quality, Apple-grade interaction feel, and full traceability.

---

## 1. Branching & Commits

- `main` — deployable; protected.
- `feat/<phase>-<feature-id>-<slug>` — e.g. `feat/p1-G-04.06-cross-by-checkout`.
- `fix/<bug-id>-<slug>` — linked to `BUG-LOG.md`.
- Conventional commits: `feat(G-04.06): ...`, `fix(BUG-012): ...`, `test(TC-G-055): ...`.

---

## 2. Definition of Done (Per Feature ID)

A feature row in [FEATURE-TRACEABILITY.md](../tracking/FEATURE-TRACEABILITY.md) may move to **Done** only when:

1. **PRD Acceptance Criteria** in [GUEST-APP-PRD.md](../prd/GUEST-APP-PRD.md) or [CRM-APP-PRD.md](../prd/CRM-APP-PRD.md) are met.
2. **API Contract** matches [API-CONTRACTS-OVERVIEW.md](../architecture/API-CONTRACTS-OVERVIEW.md); OpenAPI / Zod schemas updated.
3. **Apple Design & Stitch Alignment Gate** ([APPLE-DESIGN-SYSTEM.md](../design/APPLE-DESIGN-SYSTEM.md)):
   - Uses Apple SF Pro font stack (`--font-display`, `--font-text`, `--font-mono`) with `tabular-nums` on all `₹` prices, distances, and timers.
   - Implements `pointerdown` scale response (`scale(0.97)` in `100ms`), spring physics (`damping: 0.8–1.0`), rubber-banding (`c = 0.55`) on sheets, and single-layer frosted glass (`backdrop-filter: blur(20px) saturate(180%)`).
   - Zero deprecated dine-in copy (`"Table 04"`, `"Dine-in"`) on any packaging delivery screen.
4. **Automated Tests** added/updated (unit + API + Playwright E2E).
5. **Mapped Test Cases** (`TC-G-*`, `TC-C-*`, `TC-I-*`) executed and recorded **PASS**.
6. **Observability:** Structured logs include `correlationId`, `restaurantId`, `checkoutGroupId`, `orderId`, `customerId` (PII masked).
7. **Security:** RBAC tested for CRM routes; HMAC webhook verification tested for Razorpay, Shiprocket, and Kapso (`Spark by D'aMigo` & `D'aMigo Food`).

---

## 3. Environments

| Env | Purpose | Payments / Delivery / WhatsApp |
|-----|---------|-------------------------------|
| `local` | Dev + unit/integration | Mock adapters + deterministic Haversine & timer clocks |
| `staging` | Full E2E + QA | Razorpay Test, Shiprocket Sandbox, Kapso Dual WABA Sandbox (`Spark` + `D'aMigo Food`) |
| `production` | Live pilot kitchens | Live keys; feature flags per restaurant |

---

## 4. Phase Gate Checklist (Before Starting Next Phase)

- [ ] All tasks in `PHASE-N-TASKS.md` marked complete.
- [ ] All `P0` / phase-scoped test cases in `TEST-CASE-INDEX.md` **PASS**.
- [ ] **60-Second Apple Design Feel Check** passed on mobile (`390×844`) and kitchen tablet (`1024×768`).
- [ ] Zero **Sev-1** / **Sev-2** open bugs in `BUG-LOG.md`.
- [ ] `DECISION-LOG.md` has no `OPEN` items blocking the next phase.
- [ ] Demo script run end-to-end recorded in `PROGRESS-DASHBOARD.md`.

---

## 5. Traceability Rule

Every PR description must include:
- `Features:` list of `G-xx.xx` / `C-xx.xx` / `P-xx.xx`
- `Tests:` list of `TC-*` IDs run
- `Design:` reference to Stitch folder (`g*` / `crm_*`) and Apple Design checklist
- `Docs:` any PRD/OpenAPI changes
