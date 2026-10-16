# Team Workflow — Weekly Rhythm

## Monday

- Review [PHASE-*-TASKS](../phases/PHASE-1-TASKS.md) — assign owners
- Triage [BUG-LOG](../tracking/BUG-LOG.md)

## Daily

- Update traceability row when PR merges
- Log blockers in standup (template below)

## Standup template

```text
Yesterday:
Today:
Feature IDs:
Blockers:
Test cases run:
```

## Friday

- QA: run suite for active phase; mark GUEST-TC / CRM-TC status
- Product: review [DECISION-LOG](../tracking/DECISION-LOG.md) TBDs
- Regenerate PRD PDFs if PRD changed: `npm run pdf`

## Before pilot expand

- [RELEASE-CHECKLIST](../tracking/RELEASE-CHECKLIST.md) complete
- [GAPS-AND-FLAWS](../gaps/GAPS-AND-FLAWS.md) Stitch fixes or waivers documented
