# Known Risks

**Audit date:** 2026-11-22 (Africa/Cairo)

| ID | Severity | Risk | Evidence | Affected components | Business impact | Recommended remediation |
|---|---|---|---|---|---|---|
| CRIT-01 | Critical | No authoritative backend/database; commerce records are mock or browser-local | No API/DB/migrations; mock adapters and localStorage submissions | Product, stock, cart, orders, newsletter/contact | Cannot reliably sell, fulfill, or receive customer requests | Approve and implement backend API plus durable data model and migration/transaction rules |
| CRIT-02 | Critical | No real authentication/authorization | No server-side identity or role checks | Account and future admin diagnostics | No trusted access boundary for private or privileged data | Implement server-enforced identity, roles and authorization tests |
| HIGH-01 | High | No deployment topology or CI/CD | No Dockerfile, Compose, proxy config, pipeline | Entire release process | Cannot reproducibly deploy or gate releases | Design container/service topology and CI; prove from a clean environment |
| HIGH-02 | High | No validated configuration/secret delivery | No Pydantic settings or `.env.example`; only ignore rule | Future backend integrations and operations | Misconfiguration and secret exposure controls are undefined | Add validated settings, secret injection, redaction and allow-listed diagnostics |
| HIGH-03 | High | Checkout and communications are local demos | UI explicitly discloses no payment/email delivery | Checkout, newsletter, contact | No transaction or business notification is completed | Implement server-side provider flows, signed webhooks and delivery monitoring |
| HIGH-04 | High | No persistent object storage or workers | No storage/queue/Redis/worker configuration | Future uploads and asynchronous jobs | No managed media or reliable background work | Add only when required, with access, retry, retention and monitoring design |
| HIGH-05 | High | Current unit test failure | 6/7 Vitest tests pass; search test sees duplicated matching text | Search UI / regression gate | In-progress app has a known regression | Correct suggestion/results behavior or scope the assertion, then rerun tests |
| HIGH-06 | High | Three current Playwright failures | 5/8 pass; mobile menu selector contract, inspection transition, responsive page scroll timeout | Navigation, inspection and responsive showroom | Existing key journeys are not regression-clean | Reconcile navigation/route behavior and responsive test timeout, then rerun browser coverage |
| MED-01 | Medium | M3 storefront work remains unaccepted and current changes are not Git-attributable | M3 plan and expanded routes exist; no `.git` metadata | Frontend routes, services, state and styling | Review/recovery and ownership uncertainty; integration rework risk | Establish version-control baseline and complete M3 acceptance before backend integration |
| MED-02 | Medium | Large JavaScript chunks | Build reports app 542.10 kB and Three module 569.67 kB minified | Initial load and 3D experience | Mobile bandwidth/parse cost; actual field impact unmeasured | Measure on target devices, split noncritical routes, set measured bundle budgets |
| MED-03 | Medium | External Google Fonts dependency | Runtime stylesheet links in `index.html` | Rendering, privacy and availability | Font fallback/latency and third-party request | Review self-hosting/license/privacy and deployment CSP |
| MED-04 | Medium | No production security headers, observability or backups | No proxy config, telemetry config, DB or backup procedure | Production operations | Incidents may be harder to prevent, detect, diagnose or recover from | Define edge headers, logging/metrics/alerts and tested backup/restore with deployment design |
| LOW-01 | Low | No live API health/readiness or admin service status | Requested endpoints are absent with the backend | Operator diagnostics | Operators cannot inspect dependency state in an admin view | Implement only after auth/config/backend exist; expose sanitized status only |
| LOW-02 | Low | Point-in-time dependency audit can age | npm audit found zero advisories on 2026-11-22; no CI scanner | npm dependency tree | Newly disclosed advisories may go unnoticed | Automate lockfile scanning and review update cadence |
| INFO-01 | Informational | No Git metadata available | `git rev-parse`/`git status` fail because `.git` is absent | Audit attribution and change review | Cannot provide branch/status or reliable diff | Restore/establish project version control before further milestone work |
| INFO-02 | Informational | Audit is limited to repository/local configuration | No deployment environment or services were available | All production controls | Live cloud posture, network exposure and runtime behavior remain unknown | Re-audit the actual deployment configuration before any release |

## Open owner decisions

- Confirm the product, inventory, shipping, tax, currency and market requirements before finalizing commerce schemas.
- Select identity and administrator provisioning model.
- Decide which payment, email, image storage and hosting providers are intended; no paid service was activated during this audit.
- Confirm whether Redis and background workers solve an actual requirement or should be omitted initially.
- Review and accept the current M3 frontend before starting the FastAPI/backend milestone.
