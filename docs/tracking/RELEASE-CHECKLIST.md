# Release Checklist

## Pre-release (staging)

- [ ] All phase-gate test cases for target phase executed (see TEST-STRATEGY)
- [ ] FEATURE-TRACEABILITY QA column updated
- [ ] No open S0/S1 bugs
- [ ] Webhook secrets rotated if leaked
- [ ] Kapso templates approved in Meta for this release
- [ ] Razorpay live keys only on prod env
- [ ] Database migration applied + backup taken
- [ ] Rollback plan documented (previous image tag)

## Guest web

- [ ] `/s/:token` resolve tested with prod-like domain
- [ ] CSP allows Razorpay + Shiprocket scripts
- [ ] WhatsApp webview smoke on iOS + Android

## CRM web

- [ ] RBAC regression
- [ ] Kitchen WS on staging load test

## Post-release

- [ ] Monitor payment webhook lag 30 min
- [ ] Monitor Kapso failure rate 24h
- [ ] Update BUG-LOG any hotfixes
- [ ] Announce pilot restaurants ops channel

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product | | |
| Eng lead | | |
| QA | | |
