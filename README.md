# D'aMigo's — Main product workspace

Central home for **product docs**, **design reference**, and **application code** for the guest + CRM platform.

**Build & run:** [DEVELOPMENT.md](./DEVELOPMENT.md)

## Contents

| Path | Description |
|------|-------------|
| **[docs/](./docs/)** | PRDs (PDF + Markdown), architecture, phases, testing, tracking — **[start at docs/README.md](./docs/README.md)** |
| **[design-reference/stitch/](./design-reference/stitch/)** | Stitch export: `screen.png` per flow, `code.html`, [DESIGN.md](./design-reference/stitch/crimson_guest_experience/DESIGN.md) |
| **[apps/](./apps/)** | `guest/` and `crm/` — each with `frontend/` + `backend/` |
| **[packages/](./packages/)** | `@damigos/db`, `@damigos/domain` |

## Quick commands

```powershell
cd d:\ADC\prosols\damigos_main\docs
npm install
npm run pdf
```

## Design reference

- Open PNGs: `design-reference/stitch/<screen-name>/screen.png`
- Interactive HTML mockups: same folder, `code.html`
- Screen → route map: [docs/design/STITCH-SCREEN-MAP.md](./docs/design/STITCH-SCREEN-MAP.md)

## Related repos (prosols)

- `damigos-whatsapp-order-flow` — marketing / explainer site
- `damigos-restaurant-contacts` — outreach tooling
