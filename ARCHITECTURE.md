# Showcase Architecture

## Product and simulation boundary

The showcase is a frontend-only, local simulation of evidence-backed AetherSDK
concepts. The canonical product evidence is recorded in
[`docs/SOURCE_RECONCILIATION.md`](docs/SOURCE_RECONCILIATION.md); that document
names the reviewed runtime, synchronization, identity-link, audit, delivery,
dead-letter, metering, access, and readiness symbols. This repository does not
claim that its aggregate console or every read model already exists in the
production product.

All visible records originate in `createSeedState`. Mutations pass through
`showcaseReducer`; query-shaped UI data comes from selectors or tenant-scoped
state collections. Fixtures use stable foreign keys, so a single action updates
every related projection without components copying or reconciling records.

```text
fictional normalized fixture graph
             |
             v
      `showcaseReducer` actions
             |
             v
 shared state + permission policy
             |
      +------+------+ 
      v      v      v
  desktop  mobile  persistence
  screens  companion theme/persona/density
```

## Identity-continuous workflow

`VALIDATE_CONNECTOR` changes the connector consumed by
`selectVisibleConnectors`. `START_SYNC` creates one run and target outcomes.
`RETRY_FAILED_TARGET` changes only the failed target and creates its missing
identity link idempotently. `ADVANCE_RUN_STAGE` creates the audit and metering
records, then the delivery record, using the original request and run IDs.
`EXHAUST_DELIVERY` creates its dead letter and degrades the delivery dependency.
`REPLAY_DEAD_LETTER` resolves that same delivery, removes the generated dead
letter, adds audit/metering records, and restores health.

The run, audit, webhook, overview, health, and settings screens therefore show
different projections of one graph—not separate demo stories.

## Screen-to-state contract

| Surface | Route | Shared reads | Shared actions / behavior |
| --- | --- | --- | --- |
| Landing | `/` | presentation constants only | session entry; no fixture mutation |
| Onboarding | modal over `/app/overview` | personas from the access policy | persona selection persisted before entry |
| Overview | `/app/overview` | `selectOverviewMetrics`, `selectVisibleConnectors`, `selectVisibleRuns`, `selectAuditEvents` | metric and exception records link to source views |
| Integrations | `/app/integrations` | `selectVisibleConnectors`, connector/provider definitions | `VALIDATE_CONNECTOR`, `START_SYNC` |
| Sync runs | `/app/runs` | `selectVisibleRuns` plus target outcomes | rows navigate to their stable run identity |
| Run detail | `/app/runs/:runId` | `selectVisibleRuns`, outcomes, links, audit and delivery references | `ADVANCE_RUN_STAGE`, `FAIL_TARGET`, `RETRY_FAILED_TARGET` |
| Audit | `/app/audit` | `selectAuditEvents` | filters and links retain request/run/resource IDs |
| Webhooks | `/app/webhooks` | `selectDeliveries`, `selectDeadLetters` | `ADVANCE_DELIVERY_ATTEMPT`, `EXHAUST_DELIVERY`, `REPLAY_DEAD_LETTER` |
| Access | `/app/access` | personas, actors, grants, and the common permission policy | SCIM is labeled as local simulation only |
| Health | `/app/health` | tenant dependencies and connector state from `selectVisibleConnectors` | status changes are consequences of the same workflow |
| Settings | `/app/settings` | metering data through `selectOverviewMetrics` | theme/density preferences only; no billing mutation |
| Mobile home | `/m` | `selectOverviewMetrics`, `selectVisibleConnectors`, `selectVisibleRuns` | exception and active-run links use the same record IDs |
| Mobile run detail | `/m/runs/:runId` | `selectVisibleRuns`, target outcomes | permission-aware failed-target retry |
| Mobile more | `/m/more` | `selectAuditEvents`, `selectDeadLetters`, health and persona context | links return to shared records or desktop-only disclosure |

## Access and record scope

Route registration declares a permission. Sidebar and command navigation apply
the same `can` decision used by reducer mutations. Deep links apply the route
guard independently, so hiding a link is never the authorization boundary.
`selectVisibleConnectors` and `selectVisibleRuns` apply tenant and connector
grants; `selectAuditEvents` derives its visibility from those scoped runs.

Persona controls are an engagement affordance, not authentication. They let the
viewer inspect Admin, Operator, Auditor, and Developer perspectives over the
fictional tenant. Production must source actor, tenant, role, and grant context
from trusted server-side identity and authorization infrastructure.

## Responsive split

At 768 px and above, the application exposes the desktop administration
cockpit. At 767 px and below, it routes to a full-bleed mobile operations
companion focused on health, exceptions, active runs, retry, and quick
inspection. The companion intentionally omits dense configuration and payload
tables and provides a desktop escape. It does not maintain separate data.

## Public-safety model

The app has no runtime network dependency. Fonts and all other assets are
self-hosted; automated browser tests fail on external requests, browser errors,
warnings, failed responses, or missing assets. A repository-wide scan checks
secrets and production endpoints. A second public-surface scan rejects personal
paths, unrevealed sibling names, and misleading claims in deployable content.

Private authoring evidence may retain local source paths because it is excluded
from `dist` and the repository remains private. Public release still requires a
protected live sweep, immutable release/deployment identity match, crawler
checks, owner authorization, and a new sweep of the public deployment.
