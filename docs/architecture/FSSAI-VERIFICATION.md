# FSSAI license verification (India)

Restaurants on D'aMigo's must not rely on **self-typed** license numbers alone. We verify against an authoritative or licensed data source, store **verification metadata**, and optionally show the number on the guest menu footer (see [INTEGRATIONS.md](./INTEGRATIONS.md)).

## What “genuine” means

| Check | Why |
|-------|-----|
| **Format** | FSSAI registration/license numbers are typically **14 digits**; reject malformed input early. |
| **Registry lookup** | Number exists in FSSAI **FoSCoS** registry and status is **Active** (not expired/suspended/cancelled). |
| **Name / state match** (recommended) | Legal name or state on the license should **fuzzy-match** what the owner entered in Step 1 — catches typos and wrong licenses. |
| **Expiry** | Block or warn if `expiry_date` is in the past or within 30 days. |
| **Re-verify** | Cron or manual re-check before renewal windows; store `verified_at` and `provider_ref`. |

## Official public channel (no documented REST API)

FSSAI operates **FoSCoS** public verification for citizens and businesses:

- About: [fssai.gov.in — License verification](https://www.fssai.gov.in/citizen/about-license-verification)
- Portal: [foscos.fssai.gov.in/verification](https://foscos.fssai.gov.in/verification)

There is **no published, stable government REST API** in our research suitable for direct server-to-server integration without scraping (fragile, likely against ToS, and JS-heavy). **Do not scrape FoSCoS in production** unless FSSAI publishes an official API.

**Manual fallback (pilot):** ops copies FoSCoS screenshot into admin review queue — acceptable for first 10 kitchens (P1-T14).

## Programmatic providers (production path)

Use a **KYC/compliance vendor** that sources FoSCoS (or equivalent) data:

| Provider | Endpoint (docs) | Notes |
|----------|-----------------|-------|
| **Eko** | `POST …/ekoapi/v3/tools/kyc/fetch-fssai` | Returns license status, category, FBO name, address, state, expiry. Requires `developer_key`, HMAC, `initiator_id`. [Docs](https://eps.eko.in/docs/fetch-fssai.md) |
| **Attestr** | `POST https://api.attestr.com/api/v1/public/checkx/fssai` | Public check API; `reg` + optional `fetchProducts`. Requires Attestr account/API key. |

**Recommendation for D'aMigo's:**

1. **P1 pilot:** `FSSAI_VERIFY_MODE=stub` + ops manual check for go-live.
2. **P2 scale:** `FSSAI_VERIFY_MODE=attestr` or `eko` with env credentials; log full provider JSON in `restaurant_compliance_events` (audit).
3. **Always** persist: `fssai_number`, `fssai_verified_at`, `fssai_license_status`, `fssai_legal_name`, `fssai_expiry_date`, `fssai_verify_provider`, `fssai_verify_ref`.

## App wiring (this repo)

| Env | Behavior |
|-----|----------|
| `FSSAI_VERIFY_MODE=stub` (default) | Demo numbers return synthetic Active payload; unknown numbers → `NOT_FOUND`. |
| `FSSAI_VERIFY_MODE=attestr` | `ATTESTR_API_KEY` + live HTTP call. |
| `FSSAI_VERIFY_MODE=eko` | `EKO_DEVELOPER_KEY`, `EKO_SECRET`, `EKO_INITIATOR_ID`. |

CRM API: `POST /v1/onboarding/fssai/verify` — body `{ "fssai": "11521998000045" }`.

Stub demo license (matches Eko doc example): **`11521998000045`**.

## Compliance note

FSSAI field remains **optional** in PRD for early onboarding, but **hub listing / WhatsApp campaigns** may require `fssai_verified_at` before go-live flags are set (product rule — configure per pilot).
