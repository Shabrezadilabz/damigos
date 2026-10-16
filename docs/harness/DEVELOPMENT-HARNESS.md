# D'aMigo's Development Harness

How the team uses documentation to **build → test → ship** without losing scope.

---

## 1. Roles & doc ownership

| Role | Primary docs |
|------|----------------|
| Product | PRDs, phases, decision log, gaps |
| Frontend (Guest) | Guest PRD, GUEST-TC, traceability rows `G-*` |
| Frontend (CRM) | CRM PRD, CRM-TC, traceability rows `C-*` |
| Backend | Architecture, DATA-MODEL, INTEGRATIONS, INTEGRATION-TC |
| QA | TEST-STRATEGY, all test-cases, BUG-LOG |
| DevOps | RELEASE-CHECKLIST, architecture deployment section |

---

## 2. Feature ID convention

| Prefix | Meaning | Example |
|--------|---------|---------|
| `G-xx.yy` | Guest feature | `G-02.03` = menu item sheet |
| `C-xx.yy` | CRM feature | `C-04.02` = campaign wizard step 2 |
| `P-xx.yy` | Platform / shared backend | `P-03.01` = Kapso marketing send |
| `TC-G-xxx` | Guest test case | Linked in traceability |
| `TC-C-xxx` | CRM test case | |
| `TC-P-xxx` | Platform / E2E test case | |

Every PRD feature **must** have a row in [FEATURE-TRACEABILITY.md](../tracking/FEATURE-TRACEABILITY.md).

---

## 3. Definition of Done (feature)

- [ ] PRD section exists with acceptance criteria
- [ ] API contract documented (OpenAPI stub or architecture table)
- [ ] UI route / component named in PRD
- [ ] Test case(s) written and **automated or manual** tagged
- [ ] Traceability: phase, owner, status
- [ ] Integration flags (Kapso/Shiprocket/Razorpay) noted if applicable
- [ ] Privacy/consent impact noted if PII or marketing

---

## 4. Branch / PR checklist

Copy into PR description:

```markdown
## D'aMigo's doc checklist
- [ ] Feature IDs: ___
- [ ] PRD updated (guest / CRM / both)
- [ ] Test cases updated: TC-___
- [ ] Traceability status → Done / In progress
- [ ] No secrets committed
```

---

## 5. Phase gates

Do not start Phase N+1 until **[phases/PHASE-ROADMAP.md](../phases/PHASE-ROADMAP.md)** exit criteria for Phase N are met.

---

## 6. Local doc commands

```bash
cd damigos_main/docs
npm run pdf          # regenerate PRD PDFs
npm run lint-links   # optional: verify internal links (if script added)
```

---

## 7. Stitch / design reference

UI implementation should map to [design/STITCH-SCREEN-MAP.md](../design/STITCH-SCREEN-MAP.md).  
Known product mismatches (table QR vs packaging) are in [gaps/GAPS-AND-FLAWS.md](../gaps/GAPS-AND-FLAWS.md) — **do not implement table-session expiry for Phase 1 stickers**.

---

## 8. Environments

| Env | Guest URL | CRM URL | Notes |
|-----|-----------|---------|-------|
| local | `http://localhost:3000` | `http://localhost:3001` | TBD ports |
| staging | `https://staging.d-amigos.in` | `https://portal-staging.d-amigos.in` | Kapso sandbox |
| prod | `https://d-amigos.in` | `https://portal.d-amigos.in` | Meta live templates |

Document env-specific IDs in team vault — never in git.
