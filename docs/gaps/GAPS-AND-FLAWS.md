# Design vs Product — Gaps & Flaws

**Source:** [design-reference/stitch/](../../design-reference/stitch/) (HTML + `screen.png` per screen).

| # | Flaw | Stitch evidence | PRD correction |
|---|------|-----------------|----------------|
| 1 | Table/dine-in conflated with packaging | `g1` "Dining Table #04"; `g14` 60 min table session | Phase 1 packaging only; remove table copy |
| 2 | Expiry TTL wrong | `g14` 60 minutes | Batch 10–15 days + revoke |
| 3 | CRM labeled "Guest OS" | `crm_4` sidebar | "Restaurant CRM" |
| 4 | NFC hardware upsell | `crm_6` acrylic pedestals | Defer Phase 3 |
| 5 | Hub fake dine signals | `g14` "Table free" | No wait-time/table Phase 1 hub |
| 6 | Brand color drift | Crimson vs navy thesis | Unify in design system DEC |
| 7 | "WhatsApp wallet" | `g14` credits copy | Per-restaurant credits ledger |
| 8 | g6 route collision | `g6_location` vs `g6_hero` | Rename routes: `/checkout/address`, `/hub` |
| 9 | Duplicate guest screens | g16 vs g5 orders | One `/orders` implementation |
| 10 | Marketing site unique QR per order | packaging page copy | Align with DEC-005 |
| 11 | Sector 29 demo address | CRM chip | Use Bangalore pilot names in seed |
| 12 | Meta Tier 2 UI | campaign hub | Display only; wire to real Kapso metrics when available |

**Action for design:** Re-prompt Stitch using 6-shell mega-prompts with packaging-only language.
