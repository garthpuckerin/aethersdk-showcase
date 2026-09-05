# Decisions — aethersdk-showcase

> Routing rule: this file records **decisions with rationale** (Work Item
> Routing Standard). If a future engineer would ask "why is it like this?",
> the answer belongs here. Defects → `ISSUES.md`; ideas →
> `FEATURES-BACKLOG.md`; sequencing → `ROADMAP.md`.

## ADR-001 · Cockpit, not engine (2026-09-03)
The repo ships the operator console over deterministic mock data and nothing
of the engine. Rationale: the engine is private IP; the showcase must prove
operability and depth without publishing adapters, schemas, or services.

## ADR-002 · Credit-union story with real vendor names, fictional tenant (2026-09-03)
Fixtures tell the use case that led to the build — UKG and Xperience feeding
Docebo, LinkedIn Learning, Axonify and Tableau — for a fictional Harborline
FCU. Rationale: honest provenance without naming the real client; the two
flows (people out, learning in) match the engine's same-entity fan-out design.
"Xperience" is the owner's spelling.

## ADR-003 · The reducer is the only mutation boundary; autopilot drives stages (2026-09-04)
All state changes go through the pure reducer; a pure autopilot advances run
stages and delivery attempts on a timer. Product UI carries only human verbs;
engine verbs live in Demo controls. Rationale: the fixture graph stays
coherent under any click order, and the demo never reads as puppeteered.

## ADR-004 · Boot-anchored clock, persisted workflow state (2026-09-04)
Every timestamp derives from the boot clock and shifts on rehydrate; no
absolute dates in prose or JSX. Rationale: the demo must read as current on
any day after the reveal without a re-seed.

## ADR-005 · Light-theme captures in the canvas design language (2026-09-03)
Rationale: each product's own design language picks its capture theme; the
hub's chrome carries its own palette. The app still ships light and dark.

## ADR-006 · Direct-to-`main` branch model, Vercel production on `main`, permanent noindex (2026-09-03)
Solo-maintained repo; local gates replace pull-request review; SEO lives on
the hub. Rationale: the house showcase SOP, shared with the earlier reveal
showcases.

## ADR-007 · Same-entity ingest credentials, hook-driven re-ingest (2026-09-05)
The fleet-manifest entry is `personal`; the repo reuses that entity's ingest
key through the standard hook installer rather than a per-repo key.
Rationale: keys are entity-bound in the graph substrate, and one key per
entity is the established pattern for the sibling showcases.

## ADR-008 · Content Security Policy scoped to self-hosted assets (2026-09-05)
`default-src 'self'` with `img-src` allowing data URIs and frames denied.
Rationale: the app makes no external requests by contract (the public-safety
e2e proves it), so the policy costs nothing and the Security Headers standard
requires a CSP for the `production-public` profile.
