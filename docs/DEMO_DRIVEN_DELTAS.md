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

- A tenant operations summary that derives connector health, run outcomes,
  delivery/DLQ pressure, readiness, and metered usage from canonical sources.
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
