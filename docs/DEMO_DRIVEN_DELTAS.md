# Demo-Driven Production Deltas

This is a handoff, not an assertion that the showcase UI is already backed by
every production endpoint. Canonical support below is based on the symbol-level
evidence captured in `SOURCE_RECONCILIATION.md`; screen-level behavior is
illustrative unless explicitly listed as an existing surface.

## 1. Existing API-backed production surfaces

- Execution context carries tenant, actor, request, provider, and entity
  identity across service and transport boundaries.
- Connector/provider definition and resolution exist under tenant scope.
- Synchronization coordinates connector resolution, typed codecs, push results,
  operation journaling, entity links, audit, metering, and RBAC.
- Audit, webhook delivery/retry, webhook dead-letter handling, metering, RBAC,
  SCIM, and readiness have canonical service/module evidence.
- HTTP, MCP, CLI, and Temporal paths have evidence of shared application/runtime
  seams rather than independent feature implementations.

These bullets describe reviewed capabilities, not this showcase’s combined
dashboard, visual design, or a guarantee of endpoint parity.

## 2. Missing read models/endpoints exposed by the showcase

Production implementation should begin with cohesive server-owned projections,
not one endpoint per screen:

- ~~A tenant operations summary that derives connector health, run outcomes,
  delivery/DLQ pressure, readiness, and metered usage from canonical sources.~~
  **Exists (2026-09-05 review):** `GET /v1/operations` returns activity,
  connectors, incidents, providers, readiness, runs (with per-target states)
  and a summary. What it does not carry is metered usage or latency — see §5.
- A run detail projection returning execution context, stage history,
  per-target results, identity links, linked audit events, and linked deliveries.
- An audit lookup that filters by request, run, resource, actor, and tenant while
  preserving stable identifiers in navigation.
- A delivery/DLQ projection that preserves event, subscription, payload,
  delivery, attempt, and replay lineage.
- Permission/capability metadata suitable for route, command, record, and action
  gating without duplicating policy in the browser.
- A compact mobile incident summary based on those same read models.

Mutation endpoints should return or invalidate these projections consistently.
Retries must be idempotent and target-specific; replay must preserve lineage and
produce audit/metering consequences.

## 3. Frontend patterns worth porting to the Admin UI

- A normalized client query model with one canonical identity per record and
  derived selectors for metrics and filtered views.
- One route registry shared by sidebar, command palette, route guards, and
  responsive navigation.
- Permission-aware deep-link handling, record scoping, and action controls.
- Click-through metrics whose contributing records are inspectable.
- Reusable status, data-state, dialog/drawer, table, and timeline primitives.
- Explicit loading, empty, sanitized error/retry, and denied states.
- A purpose-specific mobile companion rather than a compressed desktop table.
- Automated same-origin, console-clean, fixture-integrity, accessibility, and
  public-safety contracts.

The production Admin UI should consume server capabilities and query caches;
the showcase reducer is only a deterministic interaction model.

## 4. Showcase-only engagement controls that must not enter production

- Persona switching from a demo-control panel.
- LocalStorage-backed theme, density, persona, and onboarding state as a stand-in
  for authenticated preferences.
- Scenario toggles for loading, empty, error, and denied states.
- Artificial stage advancement, delivery failure, attempt exhaustion, and
  replay buttons used to tell the reveal story.
- Fictional credentials, tenant records, payloads, timing, usage, reliability,
  and connector/provider outcomes.
- Session-only landing and onboarding gates.

Production must replace these with authenticated identity, real service state,
server-side authorization, observable jobs, sanitized operational errors, and
audited mutations.

## 5. 2026-09-05 review: engine (`develop` @ 8f4caef) vs this demo

Evidence: code-graph ladder over `github.com/garthpuckerin/aethersdk`
(`sync_many`, `MultiTargetSyncResult`, `SyncOperationState`,
`security/webhook_delivery.py`, `security/webhook_dead_letter.py`,
`runtime/readiness.py`, `security/scim_rbac.py`, `security/metering.py`,
ADR-011), the engine's `docs/openapi-v1.json` (30 paths) and its
`capabilities.yaml` (9 live capabilities), and the admin UI route list.

### Demo claims the engine backs today
| Demo surface | Engine evidence |
|---|---|
| Multi-target sync, partial outcome, retry only the retryable target, idempotency reuse | `application/sync_service.py: sync_many`, `MultiTargetSyncResult`; `tests/test_sync_service_multi_target.py::test_partial_retry_only_reinvokes_retryable_target`; `SyncResponse.partial`, `parent_idempotency_key` |
| Subscriptions, delivery retry, dead letter, replay with the same identities | `POST/GET /v1/webhooks`, `RetryPolicy`, `webhook_dead_letter.py`, `POST /v1/webhooks/dead-letter/{id}/replay` (`ReplayResponse`) |
| Connector validate, tenant-scoped providers and connectors | `POST /v1/connectors/{id}/validate`, `/v1/connector-providers`, `ConnectorResolver` |
| Runtime health with named dependencies; incidents needing attention | `runtime/readiness.py` (`ReadinessResult`), `/v1/ready`, `OperationsSnapshot.incidents` (readiness · sync · webhook_dead_letter) |
| Audit trail, tenant-scoped actor/request context | `/v1/audit-log` (cursor), `security/audit.py`, `ExecutionContext` |
| Roles and SCIM | `/scim/v2/*`, `ScimRoleMappingPolicy`, `scim_rbac_bridge.py` |
| Canonical `corporate.employee.v1` / `learning.course.v1` | `runtime/entity_codecs.py`, `domains/corporate`, `domains/learning` |

### Gaps the demo exposes (engine-side backlog)
| # | Demo shows | Engine today | Suggested production shape |
|---|---|---|---|
| G1 | Eleven-stage run rail with timestamps | `SyncOperationState` = pending · provider_succeeded · linked · retryable_failure · terminal_failure · manual_resolution; run status = succeeded/partial/failed/pending | A run-detail projection that derives a stage timeline from the audit actions already emitted (`entity.fetched` → `entity.normalized` → `entity.pushed` → `sync.target.completed` → `sync.batch.completed` → webhook/metering) |
| G2 | Usage tier bar (period usage vs plan limit) | `MeteringEvent.emit`; ADR-011 defers aggregation; no usage schema in OpenAPI | A tenant usage summary read model (period, metric, count, limit) — the admin UI has nowhere to show usage today |
| G3 | p95 latency, peak-per-hour, throughput history | `OperationsSummary` carries counts only | Either an observability-backed metrics surface or a latency/throughput series on the snapshot |
| G4 | Webhook delivery attempts table (per delivery, attempt, status code) | Delivery attempts exist in `webhook_delivery.py` but only dead letters are listable | `GET /v1/webhooks/{subscription_id}/deliveries` with attempt lineage |
| G5 | "Export audit trail" | Paginated list only | An export endpoint or a documented client-side export from the cursor list |
| G6 | "Rotate credential reference" + `connector.credential.rotated` audit action | `reference_secrets.get/set_credential`; rotation exists only for webhook signing secrets | A rotate verb that audits `connector.credential.rotated` |
| G7 | Permission-gated routes, commands, records | `require_permission` server-side; no capability metadata for a UI | `/v1/tenants/me` extended with effective permissions (already returns actor + tenant) |
| G8 | Access page: members, invite, roles | SCIM-driven; no member listing/invite | Decide: keep SCIM-only (then the demo's invite is illustrative by design) or add a member read model |
| G9 | Vendors UKG, Xperience, Docebo, LinkedIn Learning, Axonify, Tableau, Slack | Adapters: Salesforce, HubSpot, Pipedrive, Dynamics 365, BambooHR, Jira, Linear, GitHub Issues, Notion, Obsidian, Discord, MAL, AniList, local_*; roadmap C4 targets Workday, Rippling, NetSuite, Oracle Fusion, ServiceNow | Per-deployment generation from the OpenAPI adapter generator (as the README states); no claim of shipped vendor adapters anywhere |
| G10 | Phone companion (pulse, runs, recovery queue) | Admin UI is desktop-only | §3 porting list |

### Demo-side follow-ups (filed in `ISSUES.md`)
- ISSUE-006: the demo's audit vocabulary (`sync.completed`, `sync.retried`,
  `webhook.replayed`, `webhook.delivery.exhausted`, `member.invited`,
  `role.updated`, `scim.user.deprovisioned`) diverges from the engine's
  (`sync.batch.completed`, `sync.target.completed`, `webhook.replay.succeeded`,
  `webhook.delivery.failed`, `webhook.dead_letter.created`,
  `connector.validated`, `authz.deny`). Aligning is a fixture rename.
- The stale "operations summary missing" bullet in §2 is corrected above.
