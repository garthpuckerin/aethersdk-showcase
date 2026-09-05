# Showcase Architecture

## Product and simulation boundary

The showcase is a frontend-only, local simulation of evidence-backed AetherSDK
concepts. The canonical product evidence is recorded in
[`docs/SOURCE_RECONCILIATION.md`](docs/SOURCE_RECONCILIATION.md); that document
names the reviewed runtime, synchronization, identity-link, audit, delivery,
dead-letter, metering, access, and readiness symbols. This repository does not
claim that its aggregate console or every read model already exists in the
engine, nor that the engine ships adapters for the named vendors.

All visible records originate in `createSeedState()` — one fictional
credit-union tenant, generated relative to the boot clock so the cockpit is
coherent on any day it is opened. Mutations pass through `showcaseReducer`;
query-shaped UI data comes from selectors. Fixtures use stable foreign keys, so
a single action updates every related projection without components copying or
reconciling records.

```text
fictional normalized fixture graph (anchored to Date.now())
             |
             v
      `showcaseReducer` actions  ←— `autopilot` (engine verbs) + humans (product verbs)
             |
             v
 shared state + permission policy
             |
      +------+------+
      v      v      v
  desktop  mobile  persistence
  screens  companion (preferences + workflow state, timestamps re-anchored on load)
```

## The workflow engine

`src/demo/autopilot.js` (`nextAutopilotAction`) is pure: given the state it
returns the single next action a real runtime would perform on its own — a running run advancing to
its next stage, a retrying delivery attempting again and finally exhausting —
and a believable delay. `DemoProvider` schedules it. Human verbs (validate,
rotate, start sync, retry, replay, create, invite) are never produced by the
engine, and engine verbs are never rendered in product screens; Demo controls
exposes an autopilot toggle and a manual step for rehearsal.

## Identity-continuous workflow

`START_SYNC` from the UKG connector to Docebo + LinkedIn Learning + Axonify
reserves the live identities (`state.liveIds`). The engine advances the run;
at `provider_write` the deterministic fault fails Axonify only, and the run
waits. `RETRY_FAILED_TARGET` succeeds the failed target with the same
idempotency key and creates its missing identity link idempotently. The engine
then writes the audit event and metering record, fans deliveries out to every
active subscription, and — for the HR receipts subscription only — retries and
exhausts into a dead letter, degrading the event-delivery dependency.
`REPLAY_DEAD_LETTER` reuses the event, subscription, and payload identity,
removes the dead letter, records audit + metering, and restores health. The
run, audit, webhook, overview, health, settings, and phone screens are
projections of that one graph.

## Screen-to-state contract

| Surface | Route | Shared reads | Shared actions / behaviour |
| --- | --- | --- | --- |
| Landing | `/` | presentation constants only | session entry; no fixture mutation |
| Onboarding | modal over `/app/overview` | personas from the access policy | persona selection persisted before entry |
| Overview | `/app/overview` | `selectOverviewMetrics`, `selectThroughputSeries`, `selectExceptions`, `selectVisibleConnectors`, `selectVisibleRuns`, `selectAuditEvents` | range switch (24h/7d/30d); every figure links to the records behind it; bucket drill-down drawer; dense layout swaps to KPI bar + matrix + power table |
| Integrations | `/app/integrations` | `selectVisibleConnectors`, `selectCatalog`, `selectConnectorVolume`, `selectConnectorHealth`, `selectConnectorRuns` | `VALIDATE_CONNECTOR`, `ROTATE_CREDENTIAL`, `START_SYNC`, `ADD_CONNECTOR`, `SET_CONNECTOR_ENABLED` |
| Sync runs | `/app/runs` | `selectVisibleRuns` plus target outcomes | filters, pagination, run-sync dialog (`START_SYNC`) |
| Run detail | `/app/runs/:runId` | `selectVisibleRuns`, outcomes, links, audit and delivery references | `RETRY_FAILED_TARGET`; stages advance under the engine |
| Webhooks | `/app/webhooks` | `selectSubscriptions`, `selectDeliveries`, `selectDeadLetters` | `CREATE_SUBSCRIPTION`, `SET_SUBSCRIPTION_STATUS`, `REPLAY_DEAD_LETTER`; attempts advance under the engine |
| Audit | `/app/audit` | `selectAuditEvents` | filters and links retain request/run/resource IDs; `EXPORT_AUDIT` |
| Access | `/app/access` | `selectMembers`, personas, `state.scim` | `INVITE_MEMBER`, `SCIM_RECONCILE` (labelled local preview) |
| Health | `/app/health` | `selectDependencies`, `selectRuntimeHealth`, `selectLatencyStats`, `selectExceptions`, `state.runtime` | status changes are consequences of the same workflow |
| Settings | `/app/settings` | `selectTenant`, `selectUsageMetric` | theme/density/autopilot preferences only; billing and deletion are labelled simulations |
| Mobile home | `/mobile/home` | `selectOverviewMetrics`, `selectExceptions`, `selectVisibleRuns` | rows open companion surfaces, never the desktop console |
| Mobile runs | `/mobile/runs` | `selectVisibleRuns` | status filters; rows open run detail |
| Mobile run detail | `/mobile/runs/:runId` | `selectVisibleRuns`, target outcomes | permission-aware `RETRY_FAILED_TARGET` |
| Mobile integration | `/mobile/integrations/:connectorId` | connector, `selectConnectorRuns` | `VALIDATE_CONNECTOR`; explicit "Open on desktop" for authoring |
| Mobile queue | `/mobile/queue` | `selectDeadLetters`, failed runs | `REPLAY_DEAD_LETTER` |
| Mobile more | `/mobile/more` | persona, health, preferences | persona/theme/autopilot; explicit desktop escape; reset |

## Access and record scope

Route registration declares a permission. Sidebar, command palette, deep-link
guards, and reducer mutations apply the same `can` decision. Hiding a link is
never the authorization boundary. `selectVisibleConnectors`, `selectVisibleRuns`,
and `selectAuditEvents` apply tenant and connector grants; the Developer persona
sees only the Docebo and LinkedIn Learning connectors and their runs.

Persona controls are an engagement affordance, not authentication. Production
must source actor, tenant, role, and grant context from trusted server-side
identity and authorization infrastructure.

## Time

`src/demo/clock.js` owns time. The graph is anchored to the boot clock, every
timestamp is generated relative to it, screens format through
`useRelativeTime()` / `formatDuration` / `formatUptime`, and persisted workflow
state is shifted forward by the elapsed time on load. No screen renders a raw
ISO string or an absolute calendar date; the quality contracts and the
white-glove sweep enforce this.

## Responsive split

At 768 px and above, the application exposes the desktop administration
cockpit. At 767 px and below, it routes to a full-bleed phone companion with a
bottom tab bar (Home · Runs · Queue · More) focused on triage, approvals, and
monitoring. Authoring stays on the desktop and is labelled as such; the only
desktop escapes are the explicit "Open on desktop" and "Open full desktop
console" buttons. `?view=desktop` is a persistent evaluator override.

## Public-safety model

The app has no runtime network dependency. Fonts and all other assets are
self-hosted; automated browser tests fail on external requests, browser errors,
warnings, failed responses, or missing assets. A repository-wide scan checks
secrets and production endpoints. A second public-surface scan rejects personal
paths, unrevealed sibling names, and misleading claims in deployable content.

Authoring evidence may reference local source paths only until the T-2
history-level review, because the repository flips public on reveal day (house
SOP). Reveal still requires the live sweeps against the production URL, crawler
checks, and a post-reveal sweep of the public deployment.
