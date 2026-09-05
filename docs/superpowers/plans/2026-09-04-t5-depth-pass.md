# T-5 depth pass — shared brief for every implementer

**Date:** 2026-09-04 · **Reveal:** Thu 2026-09-10 noon ET · **Repo:** this checkout
**Governing docs:** `HANDOFF.md` (owner decisions), the aethersdk §9 brief in
the hub repo's `docs/DEMO_POLISH_CHECKLIST.md` (depth bar, tells,
design-canvas diff). Read `HANDOFF.md` before touching anything.

## The story (fixture graph, already rewritten — do not change `src/demo/seed.js` shapes)

Tenant **Harborline Federal Credit Union** (fictional, `tenant_harborline`).
People data flows **in** from the HR systems of record — **UKG Pro**
(`con_ukg`) and **Xperience** (`con_xperience`) — as canonical
`corporate.employee.v1` records and is provisioned **out** to three learning
platforms — **Docebo** (`con_docebo`), **LinkedIn Learning** (`con_linkedin`),
**Axonify** (`con_axonify`). Course completions (`learning.course.v1`) flow
**back in** from those platforms and out to **Tableau** (`con_tableau`).
**Slack** (`con_slack`) carries notifications, **Jira** (`con_jira`) access
tickets. A second tenant (`tenant_other`, Northstar Labs) exists only as the
isolation control. Everything is fictional; never name a real client.

Two signature flows, one identity chain (ids in `state.liveIds`):
1. **People out** — validate UKG → "Start governed sync" → `run_live_harborline_001`
   fans out to Docebo + LinkedIn Learning + Axonify. The **autopilot**
   (`src/demo/autopilot.js`, driven by `DemoProvider`) advances the stages
   itself; at `provider_write` Axonify fails `PROVIDER_RATE_LIMIT` and the
   run waits. The human verb is **Retry failed target** (reuses the
   idempotency key, creates the missing identity link). The engine then
   finishes: audit event `evt_live_harborline_001`, deliveries to every active
   subscription; the one to `sub_hr` (`delivery_live_harborline_001`) retries
   twice on its own and exhausts into `dlq_live_harborline_001`.
2. **Learning in / recovery** — the human verb is **Replay dead letter**; the
   same event/subscription/payload identity delivers, audit + metering are
   written, event-delivery health recovers.

## Contracts you code against

- **State:** see `src/demo/seed.js` `createSeedState()` for every collection
  and field. Key shapes: `connectors` (`role`, `status`, `direction`,
  `credentialState`, `validatedAt`, `credentialRotatedAt`, `scheduleMinutes`,
  `enabled`), `providerDefinitions` (`category`, `entityTypes`, `authType`,
  `host`, `description`), `runs` (`operation`: provision | deactivate |
  completion | ticket_sync | notify; `stage`; `startedAt`/`completedAt`;
  `triggeredBy`; `faultConnectorId`), `targetOutcomes`, `auditEvents`
  (`action`, `actorId`, `resourceType`, `resourceId`, `requestId`, `runId`,
  `detail`, `createdAt`), `webhookSubscriptions` (`status` active | paused,
  `destination`, `eventTypes`), `deliveries` / `deliveryAttempts` /
  `deadLetters`, `meteringEvents`, `dependencies` (`name`, `label`, `status`,
  `latencyMs`, `detail`), `runtime`, `members` (`status` active | invited |
  deprovisioned, `lastActiveAt`, `kind`), `scim`, `tenants`.
- **Selectors:** `src/demo/selectors.js` — `selectOverviewMetrics(state,
  persona?, range?)`, `selectThroughputSeries(state, range)` (24 hourly or
  7/30 daily buckets, each with `value`, `runs`, `failed`, `recordIds`, `p95`,
  `successRate`, `startIso`), `selectExceptions`, `selectConnectorVolume`,
  `selectConnectorRuns`, `selectConnectorHealth`, `selectCatalog`,
  `selectCategories`, `selectLatencyStats`, `selectAuditEvents`,
  `selectDeliveries`, `selectSubscriptions`, `selectDeadLetters`,
  `selectMembers`, `selectDependencies`, `selectTenant`, `RANGES`.
  **Every number on screen comes from a selector or a record.** Never hand-type
  a metric, a percentage, a count, or a date.
- **Actions:** `ACTIONS` in `src/demo/reducer.js`. Human verbs only in
  product UI: `VALIDATE_CONNECTOR`, `ROTATE_CREDENTIAL`, `ADD_CONNECTOR`,
  `SET_CONNECTOR_ENABLED`, `START_SYNC` (`{sourceConnectorId,
  targetConnectorIds, entityType?, entitiesProcessed?, operation?}`),
  `RETRY_FAILED_TARGET`, `REPLAY_DEAD_LETTER`, `CREATE_SUBSCRIPTION`,
  `SET_SUBSCRIPTION_STATUS`, `INVITE_MEMBER`, `SCIM_RECONCILE`, `EXPORT_AUDIT`.
  Engine verbs (`ADVANCE_RUN_STAGE`, `ADVANCE_DELIVERY_ATTEMPT`,
  `EXHAUST_DELIVERY`, `FAIL_TARGET`) are dispatched **only** by the autopilot
  or by Demo controls — **never render a button that says "Simulate",
  "Advance", or "Send next attempt" in a product screen.** Denied actions set
  `state.lastDeniedPermission`; gate buttons with `can(state.activePersonaId,
  permission)` and show a `.permission-note` instead.
- **Time:** `const rel = useRelativeTime()` from `src/demo/context.js`, then
  `rel(iso)` → "18m ago". `formatDuration`, `formatUptime`, `hourLabel` in
  `src/demo/clock.js`. **Never render a raw ISO string or an absolute date.**
  The quality contract test rejects `20\d\d-\d\d-\d\d`, thousands-separated
  literals, and `99.x%` literals in feature JSX.
- **Access:** `can`, `PERSONAS`, `PERMISSION_LABELS`, `personaPermissions`,
  `actorIdFor` in `src/access/policy.js`.

## Design language (the AetherSDK Console canvas — owner's choice)

Tokens live in `src/styles/tokens.css`; shared primitives in
`components.css` / `layout.css`. **Use only CSS custom properties for colour**
(the quality contract rejects literal colours outside tokens.css).
- Canvas off-white, white cards with a 1px hairline (`.panel`), 10px radius,
  restrained shadow. Near-black `.panel--dark` for the hero chart only.
- Type: page title `h1` is 21px (already set), section titles 14px, body 13px,
  mono for identifiers / metrics / eyebrows. **No display-size headings inside
  the cockpit.** Eyebrows are 10px mono uppercase.
- Lime accent only for: the active nav pill, `.button--primary`, chart bars,
  `.chip--accent`. Semantic status colours via `StatusBadge` / `.status-dot`.
- Shared classes to reuse (don't reinvent): `.page-heading` (+`__actions`,
  `__status`), `.kpi-strip` / `.kpi` (+`--link`, `--positive`, `--danger`,
  `.kpi-strip--bar` for the dense KPI bar), `.panel` (+`__header`, `__link`,
  `--dark`, `--flush`, `--muted`), `.chip` / `.chip-row`, `.segmented`,
  `.avatar`, `.provider-mark`, `.detail-grid` / `.detail-list`, `.record-list`,
  `.activity-list` (+`__dot--sync|failed|secure|access|webhook`),
  `.attempt-list`, `.field` / `.form-grid` / `.form-actions` / `.check-list`,
  `.callout` (+`--warning|danger|positive`), `.tabs`, `.usage-bar`,
  `.table-toolbar`, `.data-table` (`td.num` right-aligns), `.grid-2`,
  `.grid-3`, `.grid-main-rail`, `.button` (+`--primary|ghost|quiet|danger|sm`).
- **Density is a real layout change**: `[data-density="dense"]` tightens rows
  and gutters globally; Overview additionally swaps to the KPI-bar + matrix +
  power-table layout in dense mode.
- Dark theme must keep working (`[data-theme="dark"]`) — check it once.
- Feature-specific CSS goes in `src/styles/features/<feature>.css`, imported
  from the feature's page component. Do not edit the shared CSS files unless
  you own the shell (agent A); ask for a shared class by adding it to your
  feature file and noting it in your report.

## Components available

`Dialog` (focus-trapped, Escape closes, `className="dialog--wide"` for wide),
`Drawer`, `DataTable` (`columns: [{key,label,render,className}]`, `rows`,
`getRowId`, `emptyMessage`), `DataState`, `StatusBadge` (labels healthy,
success, running, warning, failed, inactive, queued, retrying, active, paused,
invited, deprovisioned), `Button`/`IconButton`/`Eyebrow` in `components/ui.jsx`.
Provider marks: render `<span className="provider-mark">{initials}</span>`
with a 2-letter initial from the provider name.

## Non-negotiables (owner-caught defect classes from prior reveals)

1. Every visible control does something real (state transition, navigation)
   or explains its simulated boundary in context. No dead chevrons or rows.
2. Same metric, same number everywhere (overview ↔ detail ↔ mobile ↔ chart).
3. Every surface handles the four scenarios (`state.scenario`: loading, empty,
   error, denied are rendered by `routes.jsx` around your page; your page
   must also handle genuinely empty filters with `DataState`/empty rows).
4. Persona changes scope and actions, not just styling.
5. No console errors/warnings (React keys!), no external requests, no
   `console.log`.
6. Public-safety scan: no personal absolute paths, no readiness claims,
   never name sibling projects that reveal later (the safety scan carries their hashes).
7. Keyboard: dialogs/drawers close on Escape and return focus; interactive
   chart points are buttons.
8. Tests: keep the colocated `*.test.jsx` for your feature green and
   meaningful (render with a real seed via `src/test/fixture-builders.js`
   `buildState`, wrap in `DemoProvider` + `MemoryRouter`). Delete assertions
   about removed behaviour; add assertions for the new one. Run
   `npx vitest run <your files>` and `npx eslint <your files>` before
   reporting. Do **not** run the full suite or e2e (other agents are editing).

## Ownership map (parallel agents)

| Agent | Owns |
| --- | --- |
| A shell | `src/app/AppShell.jsx`, `CommandPalette.jsx`, `DemoControl.jsx`, `routes.jsx` (scenario copy only), `src/components/*`, `src/styles/{global,layout,components}.css`, `src/features/landing/*`, `src/features/onboarding/*`, `index.html`, `src/app/*.test.jsx`, `src/components/*.test.jsx`, `src/App.test.jsx` |
| B overview | `src/features/overview/*`, `src/components/charts.jsx` (+test), `src/styles/features/overview.css` |
| C integrations | `src/features/integrations/*`, `src/styles/features/integrations.css` |
| D runs | `src/features/runs/*`, `src/styles/features/runs.css` |
| E webhooks | `src/features/webhooks/*`, `src/styles/features/webhooks.css` |
| F audit + access | `src/features/audit/*`, `src/features/access/*`, `src/styles/features/{audit,access}.css` |
| G health + settings | `src/features/health/*`, `src/features/settings/*`, `src/styles/features/{health,settings}.css` |
| H mobile | `src/app/MobileShell.jsx` (+test), `src/features/mobile/*`, `src/styles/features/mobile.css`, mobile routes in `routes.jsx` (coordinate: add routes only) |
| I demo tests | `src/demo/*.test.js*` (except reducer.test.js), `src/access/policy.test.js`, `src/test/*`, `src/docs.test.js`, `src/quality-contracts.test.js` |

The integrator (Claude, main session) owns `src/demo/*` non-test files, e2e,
scripts, docs, and the final sweep.
