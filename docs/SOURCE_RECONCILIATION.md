# AetherSDK Showcase Source Reconciliation

**Recorded:** 2026-09-03  
**Disposition:** implementation may proceed; no owner decision is required  
**Boundary:** private authoring evidence only; this file is never copied into the deployed bundle

## Source hierarchy

When sources disagree, use this order:

1. The canonical `garthpuckerin/aethersdk` graph, tests, and public-safe docs
   define product behavior and terminology.
2. The approved showcase design defines reveal scope and interaction depth.
3. The Claude Design export defines the starting visual language.
4. Portfolio checklists define the reveal and quality ritual.
5. Connex artifacts may contribute presentation ideas only. Connex is a
   sibling application platform, not the AetherSDK product or a source of
   canonical behavior.

## Inspected sources

### Canonical AetherSDK graph

Queried through the code-graph ladder `map`, `find`, `explain`, and `neighbors` for the
canonical repo `github.com/garthpuckerin/aethersdk`.

Key evidence:

- `runtime/context.py:ExecutionContext` binds tenant, actor, request, provider,
  and entity context across services and transports.
- `runtime/connectors.py:ConnectorResolver` resolves installed connectors
  inside an explicit tenant boundary.
- `runtime/provider_definitions.py:ProviderDefinition` describes a validated
  provider/entity configuration contract.
- `runtime/entity_codecs.py:EntityCodecRegistry` encodes and decodes typed
  corporate, CRM, learning, and media entities.
- `application/sync_service.py:SyncService` imports connector resolution,
  execution context, codecs, push results, sync operations, entity links,
  audit, metering, and RBAC. This is the key cohesion seam.
- `application/sync_operations.py:SyncOperationJournal` owns durable operation
  claims, results, linked/manual state, tenant listing, and conflict behavior.
- `application/entity_links.py:EntityLinkStore` and `EntityMatcher` connect
  canonical identities to provider identities under tenant scope.
- `runtime/push_results.py:PushResult` represents provider-write results.
- `security/audit.py:AuditEvent` and the audit loggers retain actor, request,
  resource, and tenant context.
- `security/webhook_delivery.py` defines endpoints, retries, attempts, results,
  and delivery execution.
- `security/webhook_dead_letter.py` creates tenant-scoped dead letters from
  failed audit-event fan-out and supports retrieval/deletion.
- `security/metering.py:AuditMeteringBridge` produces stable, tenant-isolated
  usage events from mapped audit actions.
- `security/rbac.py:require_permission` and SCIM/RBAC modules enforce action and
  identity boundaries.
- `mcp_server.py:build_mcp_server`, `engines/pro.py:TemporalSyncEngine`, and the
  HTTP/MCP/CLI equivalence and runtime-connector seam tests show that transports
  consume shared application/runtime services rather than separate feature
  implementations.
- `application/control_plane_client.py:readiness` supplies the control-plane
  readiness surface; runtime and engine dependency evidence determines what the
  showcase may label healthy.

### Claude Design export

Inspected from
the exported design archive (owner's downloads, not in Git) without copying
the archive or generated HTML into Git.

Located:

- `AetherSDK Console.dc.html`
- `Aether Console - Explorations.dc.html`
- `screenshots/all3.png`
- `screenshots/drawer.png`
- `screenshots/explorations.png`
- `screenshots/hour-drawer.png`

Accepted visual ideas:

- clinical off-white canvas, near-black operational feature panel, and electric
  lime accent;
- Hanken Grotesk plus JetBrains Mono;
- crisp hairlines, compact radii, dense operational tables, persistent sidebar,
  tenant switcher, command search, density control, and strong status labeling;
- dashboard compositions that emphasize integrations, runs, activity, and
  drill-down rather than decorative analytics.

Adapted or rejected:

- Replace `Production` labeling with `Portfolio demo · mock data` and an
  explicitly simulated environment.
- Replace disconnected hardcoded KPIs with selector-derived values whose
  contributing records are navigable.
- Treat visible `Run sync`, catalog, cards, rows, and chart points as real local
  interactions; no decorative dead affordances.
- Expand the attractive shallow shell into one identity-continuous governed
  workflow plus purpose-built loading, empty, error, and denied states.
- Do not copy generated HTML/CSS wholesale; retain the visual grammar through a
  tokenized, accessible implementation.

### Connex artifacts

Read-only discovery in the owner's downloads folder located:

- `connex-dashboard.tar.gz`
- `Connex_Architecture_Map.png`
- `Connex_Finish_Line_Tasks (1).csv`
- `cursor_guardrails_connex.md`

`connex-dashboard.tar.gz` contains a Next.js dashboard whose source centers on
system cards, field mappings, confidence/review states, AI suggestions, and an
activity timeline. `Connex_Architecture_Map.png` depicts a universal
adapter/router bridging legacy systems, modern requests, a suite,
microservices, analytics stores, and external APIs.

Accepted presentation ideas:

- make mappings and routing consequences inspectable;
- expose uncertainty or manual review honestly;
- connect an activity record to the system object that caused it.

Rejected as Aether product claims:

- universal mainframe/legacy strangler positioning;
- AI-inferred mapping approval as a signature Aether capability;
- Connex names, modules, real-party identities, data, routing topology, or application
  scope;
- any implication that Connex and AetherSDK are the same product.

### Portfolio reveal conventions

Inspected:

- the hub repo's `BCSTANDARDS.md`
- the hub repo's `docs/DEMO_POLISH_CHECKLIST.md`
- the hub repo's `docs/REPO_RECONCILIATION_MAP.md`

Accepted requirements:

- cockpit, not engine; frontend-only mock fixtures clearly labeled as such;
- independent showcase repository and Git-integrated deployment source;
- one story across OG, landing, cockpit, mobile, case study, and reveal copy;
- a session-scoped landing gate and localStorage-backed replayable onboarding;
- a full-bleed mobile companion with an explicit desktop escape and no dead
  rows;
- cross-footed fixture checks, state completeness, white-glove/mobile/viewport
  sweeps, no console or failed-asset noise, and live fresh-session rehearsal;
- exact-deployment full-width captures and OG/preview/teaser derivatives;
- noindex/crawler/spoiler controls through T-0 and chat/navigation/sitemap
  checks before public links are posted.

The portfolio map explicitly distinguishes canonical AetherSDK from Connex and
states that the work is product-lineage clarity, not a merge.

## Capability-to-showcase contract

| Capability | Canonical evidence | Claude/Connex input | Showcase surface | Fixture identity | Disposition |
| --- | --- | --- | --- | --- | --- |
| Shared execution context | `ExecutionContext`; HTTP/MCP/CLI equivalence tests | Tenant switcher and run drawer | Run header, audit, delivery, command results | `tenantId + actorId + requestId` | Preserve across the entire signature chain |
| Connector definition and resolution | `ProviderDefinition`; `ConnectorResolver` | Integration cards/system cards | Integrations catalog and connector drawer | `providerDefinitionId + connectorId + tenantId` | Validate locally; never handle real credentials |
| Typed entity codec | `EntityCodecRegistry` | Field/mapping presentation | Normalization stage and payload comparison | `entityType + canonicalId` | Use fictional typed entities and sanitized payloads |
| Canonical/provider link | `EntityLinkStore`; `EntityMatcher` | Mapping inspection | Run identity panel and integration detail | `canonicalId + connectorId + remoteId` | Show deterministic matching and link persistence |
| Per-target push result | `PushResult`; `SyncService` | Status cards and run table | Run target outcomes | `runId + targetId + idempotencyKey` | One target may fail without rolling back success |
| Idempotent operation recovery | `SyncOperationJournal`; sync idempotency tests | Retry affordance | Failed-target retry | original `requestId + runId + idempotencyKey` | Retry only failed target; never duplicate link |
| Audit → webhook → DLQ | audit, webhook delivery, dead-letter modules | Activity timeline | Run detail, Audit, Webhooks, DLQ | `runId + eventId + deliveryId + deadLetterId` | Delivery must originate from the created sync event |
| Stable delivery replay | delivery retry policy and dead-letter handling | Review/resolve interaction | Delivery drawer and replay | `eventId + subscriptionId + payloadId` | Replay removes generated DLQ and writes audit/metering |
| Metering projection | `AuditMeteringBridge` | Business-tier usage panel | Overview and Settings | `meteringEventId + sourceEventId + tenantId` | Always derived from completed simulated operations |
| RBAC and SCIM | `require_permission`; SCIM/RBAC modules | Access shell | Persona switch, nav, record scope, denied state | `actorId + roleId + permission` | Persona changes scope and actions, not styling only |
| Readiness dependencies | control-plane readiness and runtime builders | Health navigation | Health and mobile incident summary | `dependencyId + runtimeId` | Display only dependencies used by the simulated path |
| Transport-neutral runtime | MCP server, Temporal engine, HTTP/MCP/CLI tests | Architecture-map routing concept | Run architecture context and docs | `runtimeId + transport` | Explain shared service seam; do not simulate live transports |

## Signature identity chain

The two reveal workflows are one continuous graph, not two demonstrations:

```text
connector validation
  → sync(requestId, runId, canonicalId, idempotencyKey)
  → audit(eventId, requestId, runId)
  → delivery(deliveryId, eventId, subscriptionId, payloadId)
  → attempts(same deliveryId and payloadId)
  → dead letter(deadLetterId, deliveryId)
  → replay(same eventId, subscriptionId, payloadId)
  → audit + metering + overview + health projections
```

The reducer owns mutations once. Selectors derive every downstream screen.
Components may never patch their own copies of a run, event, delivery, DLQ,
usage value, or health value.

## Owner decisions required

None. The inspected sources support the approved design. Connex-only mapping and
legacy-router concepts are explicitly excluded from the reveal scope.
