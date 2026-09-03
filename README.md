# AetherSDK Showcase

An interactive systems-cohesion cockpit that demonstrates how AetherSDK concepts
fit together across connector validation, governed synchronization, audit,
webhook delivery, dead-letter recovery, metering, health, and access control.

**Portfolio demo · mock data.** Every tenant, identity, connector, event, and
payload is fictional and local. The app performs no runtime API, analytics,
telemetry, font-CDN, or image-host requests. It is an illustrative interface,
not a production control plane and not the production AetherSDK repository.

Reveal-season status: the repository is private until the reveal (Thu Sep 10
2026, noon ET), when it flips public and becomes the canonical development home
for this cockpit, per the house showcase SOP (see `HANDOFF.md`). The live demo
serves behind a permanent `noindex` at `garthpuckerin-aethersdk.vercel.app`.

## Signature workflows

The primary workflow preserves the same request, run, entity, audit, delivery,
and payload identities through:

```text
connector validation → governed sync → failed-target retry → linked audit event
→ webhook attempt exhaustion → generated dead letter → dead-letter replay
→ updated overview, health, and usage projections
```

The secondary workflow changes persona and proves that navigation, deep links,
record scope, commands, and retry/replay actions all use the same permission
policy. Desktop administration and the mobile operations companion consume the
same reducer and fixture graph.

See the [Architecture](ARCHITECTURE.md) for the screen-to-state map and
[`docs/DEMO_DRIVEN_DELTAS.md`](docs/DEMO_DRIVEN_DELTAS.md) for the explicit
handoff between existing product concepts, production gaps exposed by this
showcase, and presentation-only behavior.

## Run locally

Prerequisites: Node.js 20.19–24 and npm 10 or newer.

```powershell
npm ci
npx playwright install chromium
npm run dev
```

Open the local URL printed by Vite. Use **Enter showcase** to start a clean
session, or choose a persona during onboarding.

## Verify

```powershell
npm run verify
npm run test:e2e
npm audit --audit-level=high
git diff --check
# or run the same release sequence with:
npm run verify:release
```

`npm run verify` runs linting, unit/component/contract tests, fixture-graph
integrity, the production build, and the tiered public-safety scanner. The
Playwright suite separately verifies the cohesive workflows, responsive routing,
SPA reloads, persistence, same-origin behavior, and a clean browser console.

## Repository guide

- `src/demo`: normalized fixture graph, reducer, selectors, persistence, and
  integrity contract.
- `src/access`: persona permissions and record scoping.
- `src/features`: desktop and mobile projections of shared state.
- `e2e`: browser proof for the two signature workflows and public safety.
- `scripts`: fixture, safety, capture, live-sweep, and reveal-manifest gates.
- `docs/SOURCE_RECONCILIATION.md`: private authoring evidence behind terminology
  and scope decisions.
- `docs/REVEAL_RUNBOOK.md`: the repo-local rehearsal/verification tooling; the
  reveal ritual itself is the house one (`HANDOFF.md`).

## Publication boundary

The build contains only static assets and fictional fixtures. Authoring specs,
plans, and source-reconciliation notes are not copied into `dist`. The GitHub
repository is private until reveal day and public afterwards (house SOP); the
public-safety scan plus a history-level review run at T-2 so that flip is safe.
