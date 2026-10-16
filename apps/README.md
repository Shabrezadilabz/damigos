# Applications

| Product | Frontend | Backend | Port (dev) |
|---------|----------|---------|------------|
| Guest | [guest/frontend](./guest/frontend/) | [guest/backend](./guest/backend/) | 3000 / 4000 |
| CRM | [crm/frontend](./crm/frontend/) | [crm/backend](./crm/backend/) | 3001 / 4001 |

Each pair can be extracted to its own git repository later (`frontend` + `backend` folders unchanged).

Shared packages: `@damigos/auth` (JWT), `@damigos/db`, `@damigos/domain`.

**Dev login:** OTP `000000` · CRM owner phone from seed · Guest any phone with bypass code.
