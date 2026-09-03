# AetherSDK Showcase Design

**Date:** 2026-09-03  
**Status:** Proposed for owner review  
**Reveal:** 2026-09-10  
**Repository:** `garthpuckerin/aethersdk-showcase`  
**Source systems:** `AetherSDK` engine repository and the exported Claude Design console

## Goal

Build a standalone, public-safe showcase of AetherSDK as the integration and
sync substrate behind a multi-product SaaS suite. The showcase must make the
system's defining quality visible: connectors, synchronization, canonical
identity, audit, webhook delivery, recovery, authorization, metering, and
runtime health participate in one coherent operational flow.

This is the cockpit, not the engine. It is a frontend-only Vite application
with coherent mock fixtures, no backend, no network dependency, no credentials,
and no private engine source. It must be honest about that boundary everywhere.

## Product Story

Working title: **AetherSDK — the seams between systems, made operable.**

The audience is a technical evaluator, platform leader, integration engineer,
or hiring manager assessing whether the builder understands production
integration systems beyond isolated API wrappers. The first ten seconds must
communicate that Aether is a tenant-aware control plane for typed,
multi-provider synchronization—not a generic SaaS dashboard and not the Connex
application from which Aether's substrate evolved.

The product story is:

1. Configure and validate a tenant-owned connector.
2. Synchronize a typed entity across systems through one canonical runtime.
3. Observe the exact stages, identities, outcomes, audit events, and delivery
   effects produced by that run.
4. Recover a failed downstream delivery through the same governed path.

## Public/Private Boundary

The repository contains only:

- frontend components and interaction state;
- fictional tenants, people, connectors, entities, runs, events, and payloads;
- deterministic derivations and simulations;
- public-safe architecture prose and diagrams; and
- tests and capture tooling.

It never contains:

- AetherSDK production code or internal package source;
- real provider credentials, tokens, endpoints, tenants, or customer data;
- a functioning provider adapter or network client;
- production deployment configuration; or
- claims that the showcase itself is production-ready.

Every entry surface states `Portfolio demo · mock data`. Operations that would
cause a real external side effect complete as an explicitly simulated state
transition and explain the production boundary in context.

## Technical Shape

- Vite 5 and React 18, matching the existing showcase repositories.
- Plain JavaScript/JSX unless a later owner decision standardizes showcases on
  TypeScript.
- Token-driven CSS with Hanken Grotesk for interface text and JetBrains Mono for
  identifiers, metrics, payloads, and operational labels.
- Self-contained fixtures with no runtime environment variables.
- SPA deep links with a Vercel rewrite.
- `noindex` until the reveal ritual removes it.

The repository is the canonical development home for the public Aether cockpit.
The production `AetherSDK/admin-ui` remains the authenticated operational
client for real services. Discoveries from the showcase become dated
demo-driven deltas in AetherSDK documentation; code is not copied blindly in
either direction.

## Information Architecture

### Landing

The landing page explains the product in one sentence, names the cockpit/engine
boundary, previews the two signature workflows, and offers `Launch demo`. It
uses the same visual tokens as the cockpit and is the source for the initial OG
and case-study composition.

### Global shell

- AetherSDK identity and tenant selector.
- Explicit mock-data and environment labels.
- Global command/search palette.
- Roomy/dense display control and light/dark theme control.
- Current persona and demo-control entry.
- Sidebar navigation grouped by Observe, Operate, Govern, and System.

### Screens

1. **Overview** — derived throughput, success, entity, failure, integration,
   activity, and usage summaries. Every figure links to the records behind it.
2. **Integrations** — connector catalog, configuration, validation, enabled
   state, direction, supported entity types, last run, and health.
3. **Sync runs** — filterable run table with status, direction, entity count,
   latency, duration, source, target, and start time.
4. **Run detail** — pipeline timeline, canonical/provider identities, target
   outcomes, sanitized failure, sample payload, related audit events, and retry.
5. **Webhooks** — subscriptions, delivery status, recent attempts, dead-letter
   queue, replay, and write-only-secret explanation.
6. **Audit** — read-only filterable event stream sharing identifiers with runs,
   connectors, deliveries, actors, and requests.
7. **Access** — members, service actors, roles, SCIM status, and designed
   permission-denied examples. Role switching changes visible data and actions.
8. **Health** — runtime identity and the actual dependency set used by the
   simulated execution path.
9. **Settings** — tenant display settings and plan/usage presentation. Billing
   and destructive operations remain labeled simulations.

## Signature Workflow 1: Connector to Governed Sync

The evaluator starts from an integration that needs attention.

1. Open the connector detail drawer.
2. Inspect provider type, entity discriminator, credential-reference state,
   direction, validation state, and recent runs.
3. Validate the connector. The simulated validation moves through loading to a
   deterministic result derived from fixture state.
4. Run a sync for a typed entity and explicit source/target connectors.
5. Navigate automatically to a running record whose timeline advances through
   queue, authorization, fetch, normalization, canonical matching, provider
   write, identity-link persistence, audit, webhook fan-out, and metering.
6. One target initially fails with a sanitized retryable provider error while a
   successful target remains successful.
7. Retry only the failed target. The retry reuses the run's idempotency identity
   and completes without duplicating the provider record.
8. Overview, integration health, usage, run counts, and audit activity all
   re-derive from the updated shared state.

This workflow proves the project's central claim: a sync is not an isolated
button action; every relevant subsystem sees the same tenant, actor, request,
connector, entity, and idempotency context.

## Signature Workflow 2: Delivery Failure to Recovery

The successful sync produces a matching audit event and webhook delivery.

1. Open the event from the audit stream or run detail.
2. Follow its linked delivery attempt into Webhooks.
3. Inspect the signed-delivery metadata and sanitized retry history.
4. Observe the exhausted attempt in the dead-letter queue.
5. Replay it as an authorized operator.
6. The same subscription and payload identity are reused; the delivery becomes
   successful and the dead-letter item is removed.
7. A replay audit event and delivery metric appear everywhere their projections
   are shown.

This workflow turns the showcase from a connector catalog into an operational
system with believable failure and recovery semantics.

## State and Fixture Architecture

All screens read from one canonical in-memory demo store. Components never own
duplicate copies of entities or hand-type derived metrics.

The fixture model contains:

- tenants and personas;
- roles, permissions, and record visibility scopes;
- provider definitions and connector instances;
- canonical entities and per-connector provider identities;
- sync runs, stages, target outcomes, and idempotency keys;
- audit events with request/resource links;
- webhook subscriptions, attempts, and dead-letter records;
- readiness dependencies; and
- metering events and plan limits.

Selectors derive every count, percentage, chart point, status, health summary,
and usage value. Mutations are deterministic reducer actions. A seeded clock
keeps relative dates coherent while avoiding stale calendar claims.

The data graph must cross-foot:

- every displayed count resolves to visible records;
- overview failures equal failed run outcomes;
- integration last-run values resolve to actual runs;
- audit resource IDs open the corresponding object;
- delivery and dead-letter states agree;
- metering totals derive from completed simulated operations; and
- role-scoped totals derive from the records visible to that persona.

## Persona and Permission Model

The floating demo control switches among:

- **Platform Admin** — full connector, access, tenant, and recovery controls;
- **Integration Operator** — run, inspect, and replay permissions without member
  or tenant administration;
- **Auditor** — read-only audit, run, delivery, and health visibility; and
- **Developer** — connector/run visibility scoped to assigned integrations.

Changing persona changes navigation, visible records, KPIs, and actions—not
only button disabled states. Deep links to an unauthorized resource render a
designed access notice naming the required permission.

## Mobile Companion

Aether is desktop-first. Phones receive a purpose-built companion rather than a
compressed workstation:

- health and incident summary;
- integrations needing attention;
- active and failed runs;
- run stage/status detail;
- dead-letter items awaiting replay; and
- safe acknowledge/retry/replay actions when permitted.

The mobile landing identifies this as the companion and links to the desktop
view. Administrative forms, raw payloads, and dense catalog tables remain
desktop surfaces with honest labels.

## Visual System

Retain the Claude Design identity:

- clinical off-white surfaces;
- near-black operational hero panels;
- electric lime as action/positive brand accent;
- green, amber, red, blue, and neutral semantic states independent of brand;
- compact radii, crisp hairlines, restrained shadow, and high information
  density; and
- Hanken Grotesk plus JetBrains Mono.

Add a dark theme that preserves semantic contrast. Use CSS custom properties
for all colors, spacing, radius, type, and motion. Active navigation uses a
strong non-ambiguous state. Motion is short, purposeful, and disabled under
`prefers-reduced-motion`.

## Interaction and Accessibility

- Every visible control performs a real local state transition, navigates, or
  gives an explicit mock-boundary response.
- Navigation, filters, tabs, tables, drawers, dialogs, and command search use
  semantic elements and accessible names.
- Escape closes the top overlay; focus is trapped and restored for dialogs and
  drawers.
- Keyboard order follows the visual order and focus indicators remain visible.
- Status is never communicated through color alone.
- Text and controls meet WCAG 2.1 AA contrast in every theme.
- Reduced-motion users receive no pulsing or sliding dependency.

## Production-State Completeness

Every data surface supplies:

- a brief intentional initial loading state;
- an empty state with a relevant next action;
- a sanitized error state with retry where appropriate; and
- a permission-denied state where the current persona lacks access.

The demo controls expose deterministic state scenarios so reviewers and tests
can reach these states without corrupting the canonical fixture graph.

## Testing and Reveal Gates

### Unit and coherence gates

- Fixture schema and referential integrity.
- Cross-footed dashboard, run, audit, delivery, and usage metrics.
- State-machine transitions for both signature workflows.
- Idempotent failed-target retry behavior.
- Dead-letter replay removal and audit/metering projections.
- Role visibility and permission matrices.
- Anchor-relative dates and absence of hardcoded presentation statistics.
- Token-only color contract.

### Browser tests

- Landing → onboarding/demo control → cockpit.
- Both signature workflows end to end.
- Persona switching and denied deep links.
- Command palette and SPA deep links.
- Theme, density, and persistence behavior.
- Empty, loading, error, and denied scenarios.
- Keyboard focus and Escape behavior.

### Sweeps

- White-glove sweep across every screen, drawer, dialog, filter, and visible
  affordance.
- Mobile sweep across phone portrait/landscape and tablet portrait/landscape.
- Viewport sweep through desktop widths and full-width capture point.
- Console/network sweep with zero errors, warnings, or failed asset requests.
- Public-safety scan for secrets, private engine paths, internal identities,
  unrevealed sibling names, and misleading production claims.

### Reveal artifacts

- Standalone private GitHub repository before T-2.
- Vercel project serving the repository with `noindex` until reveal.
- Full-width desktop source captures downscaled to preview, OG, and teaser.
- README and architecture document explaining real versus illustrative behavior.
- Reveal metadata and case-study copy aligned with the landing and cockpit.

## Explicit Non-Goals for the Reveal

- Implementing missing production Aether APIs.
- Connecting the showcase to the production control plane.
- Shipping real provider OAuth or credential workflows.
- Creating a general-purpose iPaaS workflow builder.
- Reproducing every provider or entity domain supported by AetherSDK.
- Claiming real uptime, throughput, customers, compliance certification, or
  production readiness.

## Follow-On Production Handoff

The showcase produces a dated `DEMO_DRIVEN_DELTAS.md` entry for AetherSDK that
separates:

1. existing API-backed production surfaces;
2. missing read models and endpoints exposed by the showcase;
3. frontend components worth porting into the production Admin UI; and
4. showcase-only engagement controls that should not enter production.

The production sequence remains contract-first: add shared read models and APIs,
then connect the production Admin UI. The showcase is evidence for prioritizing
that work, not a substitute for it.

## Acceptance Criteria

The showcase is reveal-ready only when:

- the landing, application, case study, and social preview tell one consistent
  Aether—not Connex—story;
- both signature workflows are fully interactive and cross-screen coherent;
- every displayed metric derives from the canonical fixture graph;
- every visible control is functional or explicitly explains its simulated
  boundary;
- role switching changes visible scope and actions;
- loading, empty, error, and denied states are reachable and designed;
- desktop and mobile experiences pass their respective sweeps;
- accessibility and console checks are clean;
- the repository contains no production engine code, secrets, or misleading
  claims; and
- the standalone build passes independently of the portfolio monorepo.
