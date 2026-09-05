# AetherSDK Showcase

An interactive operations cockpit for **Aether SDK**, the multi-tenant
integration substrate, shown through the use case that led to the build: a
credit union whose HR systems of record had to keep its learning platforms and
analytics in step.

**Portfolio demo · mock data.** The tenant (**Harborline Federal Credit
Union**), every person, connector, run, event, and payload is fictional and
local. The app performs no runtime API, analytics, telemetry, font-CDN, or
image-host requests. Vendor names (UKG, Xperience, Docebo, LinkedIn Learning,
Axonify, Tableau, Slack, Jira) describe the systems such a tenant integrates;
they are not partnerships, and the engine's vendor connectors are built per
deployment from its OpenAPI adapter generator. This is the cockpit, not the
engine.

Reveal-season status: the repository is private until the reveal (Thu Sep 10
2026, noon ET), when it flips public and becomes the canonical development home
for this cockpit, per the house showcase SOP (see `HANDOFF.md`). The live demo
serves behind a permanent `noindex` at `garthpuckerin-aethersdk.vercel.app`.

## The story

People data flows **in** from the HR systems of record — UKG Pro and
Xperience — as canonical `corporate.employee.v1` records and is provisioned
**out** to three learning platforms — Docebo, LinkedIn Learning, Axonify. Course
completions (`learning.course.v1`) flow **back in** and out to Tableau. Slack
carries notifications; Jira carries access tickets. Terminations reach every
system through the same governed path.

## Signature workflows

One identity chain, driven by the demo's workflow engine (the *autopilot*)
with two human decisions:

```text
validate UKG → governed sync (request · run · canonical employee · idempotency key)
  → Docebo ✓ · LinkedIn Learning ✓ · Axonify ✗ (rate limited)
  → Retry failed target  ← human verb: same idempotency key, no duplicate links
  → audit event → webhook deliveries → the HR receipts delivery retries, exhausts
  → dead letter
  → Replay dead letter   ← human verb: same event, subscription, payload identity
  → audit + metering + overview + health projections update
```

The engine advances stages and delivery attempts itself; product screens never
ask the operator to "simulate" anything. Demo controls (persona, theme,
density, data scenarios, autopilot on/off, step) are the only place engine
verbs live.

Desktop administration (overview, integrations catalog, sync runs, webhooks,
audit trail, access with roles and SCIM, runtime health, settings) and the
phone companion (pulse, runs, recovery queue, more) read the same fixture
graph and the same permission policy. Four personas — Platform Admin,
Integration Operator, Auditor, Developer (scoped to the two learning
connectors) — change what is visible and what can be done.

See [Architecture](ARCHITECTURE.md) for the screen-to-state map and
[`docs/DEMO_DRIVEN_DELTAS.md`](docs/DEMO_DRIVEN_DELTAS.md) for the handoff
between existing engine capabilities, gaps this showcase exposes, and
presentation-only behaviour.

## Run locally

Prerequisites: Node.js 20.19–24 and npm 10 or newer.

```powershell
npm ci
npx playwright install chromium
npm run dev
```

Open the local URL printed by Vite. Use **Launch demo** to start a clean
session, or choose a persona during onboarding. Workflow state persists across
a refresh; **Sign out / reset demo** in Demo controls clears it.

## Verify

```powershell
npm run verify          # lint · unit/component/contract tests · fixture-coherence gate · build · public-safety scan
npm run test:e2e        # Playwright: both signature workflows (desktop + phone), access, persistence, public safety
npm run sweeps          # white-glove · mobile · viewport sweeps against a preview (BASE_URL=…)
npm run verify:release  # all of the above + npm audit + git diff --check
```

The fixture-coherence gate (`scripts/verify-derived-data.mjs`) fails the build
when the generated graph stops telling one story: referential integrity, the
featured providers, an anchor-relative clock with an in-flight run straddling
"now", no pre-seeded live identities, KPI ↔ chart ↔ usage cross-footing, a
non-linear throughput series, and the signature chain completing under the
autopilot.

## Repository guide

- `src/demo`: normalized fixture graph (`seed.js`), reducer (the only mutation
  boundary), autopilot engine, selectors, clock, persistence, integrity
  contract.
- `src/access`: persona permissions, labels, and record scoping.
- `src/features`: desktop and mobile projections of shared state.
- `src/styles`: design tokens (the AetherSDK Console canvas language) and
  shared primitives; per-feature CSS under `styles/features`.
- `e2e`: browser proof for the signature workflows and public safety.
- `scripts`: coherence gate, public-safety scan, house sweeps, capture,
  live-sweep, and reveal-manifest tooling.
- `docs/SOURCE_RECONCILIATION.md`: authoring evidence behind terminology and
  scope decisions.
- `docs/REVEAL_RUNBOOK.md`: repo-local rehearsal/verification tooling; the
  reveal ritual itself is the house one (`HANDOFF.md`).

## Publication boundary

The build contains only static assets and fictional fixtures. Authoring specs,
plans, and source-reconciliation notes are not copied into `dist`. The GitHub
repository is private until reveal day and public afterwards (house SOP); the
public-safety scan plus a history-level review run at T-2 so that flip is safe.
