# AetherSDK Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, standalone, public-safe AetherSDK showcase that proves one coherent integration system through two deep, cross-screen operational workflows.

**Architecture:** A React/Vite single-page application reads and mutates one canonical deterministic fixture graph through a reducer and selectors. Screens are projections over shared tenant, actor, request, connector, entity, run, audit, delivery, metering, and health identities; they do not own duplicate domain state. The showcase performs no runtime network calls and remains `noindex, nofollow` until a separately authorized reveal operation.

**Tech Stack:** React 18, Vite 8, React Router 7, Vitest 4, Testing Library, Playwright, JavaScript/JSX, token-driven CSS, GitHub, Vercel

---

## Scope and execution rules

- Canonical remote: `github.com/garthpuckerin/aethersdk-showcase` (private before,
  during, and after reveal unless publishing source is separately authorized).
- Production engine: `github.com/garthpuckerin/aethersdk`; read-only source of truth for concepts and public-safe semantics.
- Portfolio hub: `github.com/garthpuckerin/garthpuckerin-portfolio`; do not modify until the T-0 reveal is separately authorized.
- Exported design: `<downloads> frontend design system.zip`; inspiration and component inventory, not product truth.
- Use `@test-driven-development` for behavior changes, `@adaptive-ui` for implementation fidelity, `@e2e-testing` for browser coverage, `@security-review` for public-safety gates, and `@verification-before-completion` before completion claims.
- Keep the application fully deterministic. Do not add a backend, API client, provider SDK, secret, telemetry client, or environment-dependent fixture.
- Do not make the repository or deployment public, remove `noindex`, or touch portfolio reveal surfaces during implementation. T-0 may publish only the deployed site; repository publication is a separate authorization.
- Execute Tasks 1–15 on `codex/showcase-build` in an isolated worktree. Keep
  `main` at the reviewed documentation baseline until the complete local gate
  passes; advance remote `main` only by a verified fast-forward to `releaseSha`.
- Each numbered task is a review checkpoint and should land as its own commit unless a failing gate requires an immediate follow-up fix.

## Planned file structure

```text
.
├── README.md                         # public-safe product boundary and local commands
├── ARCHITECTURE.md                   # fixture graph, projections, workflows, real/mock mapping
├── package.json                      # pinned scripts and dependencies
├── vite.config.js                    # React and Vitest configuration
├── playwright.config.js              # desktop/mobile projects and local web server
├── eslint.config.js                  # browser/test lint rules
├── index.html                        # noindex metadata, fonts, root shell
├── vercel.json                       # SPA rewrite and security headers
├── artifacts/reveal/.gitkeep         # dated release evidence destination
├── public/fonts/                     # self-hosted Hanken Grotesk/JetBrains Mono WOFF2 + licenses
├── docs/
│   ├── DEMO_DRIVEN_DELTAS.md         # showcase discoveries for production AetherSDK
│   ├── REVEAL_RUNBOOK.md              # explicit private rehearsal and authorized T-0 procedure
│   ├── SOURCE_RECONCILIATION.md       # engine/design/Connex/portfolio capability mapping
│   └── superpowers/{specs,plans}/...  # approved design and this plan
├── scripts/
│   ├── public-safety-scan.mjs         # forbidden-string and secret-pattern gate
│   ├── capture-reveal.mjs             # exact-deployment screenshots and derivatives
│   ├── live-sweep.mjs                 # deployed crawler/asset/console/network checks
│   ├── verify-derived-data.mjs        # imports fixture checks for CI
│   └── write-reveal-manifest.mjs      # records release/sweep evidence without secrets
├── src/
│   ├── main.jsx                       # browser entry
│   ├── App.jsx                        # provider and router composition only
│   ├── app/
│   │   ├── routes.jsx                 # route definitions and authorization metadata
│   │   ├── AppShell.jsx               # desktop navigation and route outlet
│   │   ├── MobileShell.jsx            # companion navigation and route outlet
│   │   ├── CommandPalette.jsx         # shared search/action navigation
│   │   └── DemoControl.jsx            # persona/scenario/theme/density controls
│   ├── demo/
│   │   ├── clock.js                   # seeded anchor-relative time
│   │   ├── seed.js                    # normalized canonical fixture graph
│   │   ├── integrity.js               # referential and cross-foot checks
│   │   ├── selectors.js               # all projections and metrics
│   │   ├── reducer.js                 # deterministic workflow transitions
│   │   ├── persistence.js             # narrow session/local storage contract
│   │   └── DemoProvider.jsx           # context hooks over reducer/selectors
│   ├── access/policy.js               # personas, permissions, record scopes
│   ├── components/
│   │   ├── ui.jsx                     # small semantic primitives
│   │   ├── StatusBadge.jsx            # text/icon/color status representation
│   │   ├── DataState.jsx              # loading/empty/error/denied composition
│   │   ├── Drawer.jsx                 # accessible focus-managed drawer
│   │   ├── Dialog.jsx                 # accessible focus-managed dialog
│   │   ├── DataTable.jsx              # consistent filtering/sorting/table shell
│   │   └── charts.jsx                 # shared keyboard/hover chart primitives
│   ├── features/
│   │   ├── landing/LandingPage.jsx
│   │   ├── onboarding/OnboardingDialog.jsx
│   │   ├── overview/OverviewPage.jsx
│   │   ├── integrations/{IntegrationsPage,ConnectorDrawer}.jsx
│   │   ├── runs/{RunsPage,RunDetailPage,RunTimeline}.jsx
│   │   ├── webhooks/{WebhooksPage,DeliveryDrawer}.jsx
│   │   ├── audit/AuditPage.jsx
│   │   ├── access/AccessPage.jsx
│   │   ├── health/HealthPage.jsx
│   │   ├── settings/SettingsPage.jsx
│   │   └── mobile/{MobileHomePage,MobileRunPage,MobileMorePage}.jsx
│   └── styles/{tokens,global,layout,components}.css
├── src/test/{setup,fixture-builders}.js
├── src/**/*.test.{js,jsx}             # colocated unit/component tests
└── e2e/
    ├── landing-onboarding.spec.js
    ├── connector-sync.spec.js
    ├── webhook-recovery.spec.js
    ├── access-responsive.spec.js
    └── public-safety.spec.js
```

## Task 0: Verify the standalone private workspace and toolchain

**Files:**
- No file changes

- [x] **Step 1: Verify repository identity before any implementation commit**

Run:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short
```

Expected: the top level is the independent showcase checkout, the remote is
`https://github.com/garthpuckerin/aethersdk-showcase.git`, the branch is `main`,
and only the approved plan/spec edits are pending. Stop if the top level is
AetherSDK or the portfolio monorepo.

- [x] **Step 2: Verify private remote and required accounts**

```powershell
gh auth status
gh repo view garthpuckerin/aethersdk-showcase --json visibility,defaultBranchRef
vercel whoami
```

Expected: GitHub authentication succeeds, visibility is `PRIVATE`, default
branch is `main`, and Vercel authentication succeeds. A missing Vercel login
blocks only deployment tasks, not local implementation.

- [x] **Step 3: Verify local runtime and source inputs**

```powershell
node --version
npm --version
Test-Path "<downloads> frontend design system.zip"
```

Expected: Node is 20.19–24.x, npm is 10+, and the design archive exists. Stop
and report any mismatch rather than silently changing the toolchain or design
source.

- [x] **Step 4: Commit and push the approved planning baseline**

Before creating the implementation worktree, commit the approved status change
and complete plan on `main`:

```powershell
git add docs/superpowers/specs/2026-09-03-aethersdk-showcase-design.md docs/superpowers/plans/2026-09-03-aethersdk-showcase-implementation.md
git commit -m "docs: approve standalone showcase implementation plan"
git push origin main
git worktree add ..\_worktrees\aethersdk-showcase-build -b codex/showcase-build
```

Expected: planning files are tracked, remote remains private, and all
implementation starts in the new worktree on `codex/showcase-build`.

## Task 1: Reconcile source systems and lock the signature inventory

**Files:**
- Create: `docs/SOURCE_RECONCILIATION.md`
- Modify: none of the approved spec files; record conflicts for owner decision

- [x] **Step 1: Inventory the design export without copying it into Git**

Run:

```powershell
tar -tf "<downloads> frontend design system.zip"
```

Expected: the two `.dc.html` exports, screenshot references, and support file are listed; no archive contents are committed.

- [x] **Step 2: Map canonical Aether capabilities through the code-graph before raw code inspection**

Query `map`, `find`, `explain`, and `neighbors` for `ExecutionContext`, entity codecs, connector resolution, sync operation journal, entity links, `PushResult`, audit, webhook delivery, dead letters, metering, RBAC, and readiness.

Expected: a compact evidence list of canonical files/symbols and their relationships.

- [x] **Step 3: Discover and compare the optional Connex presentation artifacts**

Run read-only discovery:

```powershell
Get-ChildItem "<downloads>" -File | Where-Object { $_.Name -match 'connex|architecture.map' } | Select-Object Name,Length,LastWriteTime
```

Expected: record each located artifact and what was inspected. If none exists,
write `Unavailable on 2026-09-03; no Connex-derived presentation decisions
accepted` in the reconciliation matrix. Do not copy artifacts into Git.

- [x] **Step 4: Compare the portfolio reveal conventions**

Read the non-code standards/checklists at:

```text
<hub-repo>\BCSTANDARDS.md
<hub-repo>\docs\DEMO_POLISH_CHECKLIST.md
<hub-repo>\docs\REPO_RECONCILIATION_MAP.md
```

Record landing gate, mock boundary, onboarding, mobile companion, capture,
noindex, and T-1/T-0 conventions with source paths and dispositions. If a file
is missing, record it as unavailable instead of substituting memory.

- [x] **Step 5: Write the reconciliation matrix**

Include columns `Capability`, `Canonical evidence`, `Claude artifact`, `Showcase surface`, `Fixture identity`, `Disposition`. At minimum cover:

```markdown
| Capability | Showcase surface | Shared identity |
| --- | --- | --- |
| Execution context | run header, audit, delivery | tenantId + actorId + requestId |
| Typed entity codec | run normalization stage | entityType + canonicalId |
| Provider link | run detail and integration drawer | canonicalId + connectorId + remoteId |
| Push outcome | per-target result and retry | runId + targetId + idempotencyKey |
| Audit → delivery → DLQ | audit and webhooks | eventId + deliveryId + deadLetterId |
```

Explicitly mark Connex-derived ideas as presentation-only and record rejected contradictions.

If canonical evidence materially contradicts the approved spec, add an
`Owner decision required` section, stop implementation, and report the conflict.
Do not silently edit the approved design.

- [x] **Step 6: Verify product naming and public-safety boundary**

Run:

```powershell
rg -n -i "connex|customer|production data|real-time production" docs/SOURCE_RECONCILIATION.md
```

Expected: `Connex` appears only in the source/disposition explanation; no customer or production-data claim exists.

- [x] **Step 7: Commit**

```powershell
git add docs/SOURCE_RECONCILIATION.md
git commit -m "docs: reconcile showcase sources and signature capabilities"
```

## Task 2: Scaffold the private standalone application and quality gates

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `eslint.config.js`
- Create: `playwright.config.js`
- Create: `index.html`
- Create: `vercel.json`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/test/setup.js`
- Create: `public/fonts/HankenGrotesk-Variable.woff2`
- Create: `public/fonts/JetBrainsMono-Variable.woff2`
- Create: `public/fonts/OFL-Hanken-Grotesk.txt`
- Create: `public/fonts/OFL-JetBrains-Mono.txt`
- Modify: `.gitignore`

- [x] **Step 1: Write the scaffold smoke test**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('identifies itself as a mock portfolio demo', () => {
    render(<App />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Create pinned package scripts and dependencies**

Use this complete package contract before any script is invoked:

```json
{
  "name": "aethersdk-showcase",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.19 <25",
    "npm": ">=10"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "verify:data": "node scripts/verify-derived-data.mjs",
    "safety": "node scripts/public-safety-scan.mjs",
    "capture": "node scripts/capture-reveal.mjs",
    "sweep:live": "node scripts/live-sweep.mjs",
    "manifest": "node scripts/write-reveal-manifest.mjs",
    "verify": "npm run lint && npm run test:run && npm run verify:data && npm run build && npm run safety"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "7.18.3"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@playwright/test": "1.62.1",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.1.0",
    "@testing-library/user-event": "14.6.1",
    "@vitejs/plugin-react": "6.1.1",
    "eslint": "10.9.1",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.6",
    "globals": "15.14.0",
    "jsdom": "25.0.1",
    "sharp": "0.35.4",
    "vite": "8.2.2",
    "vitest": "4.1.11"
  }
}
```

Commit the generated `package-lock.json`; do not float versions during the
reveal sprint.

- [x] **Step 3: Implement the minimum render and permanent private-phase metadata**

`index.html` must contain:

```html
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="AetherSDK portfolio demo using fictional mock data." />
```

`vercel.json` must add an SPA rewrite and `X-Robots-Tag: noindex, nofollow` header. The header is removed only in the separately authorized T-0 reveal task.

Download the two SIL Open Font License variable-font WOFF2 files from their
official upstream repositories, store them under `public/fonts`, retain both
license texts, and reference only same-origin `/fonts/...` URLs. Official font
and license retrieval is a required gate; stop if it is unavailable. Never add
a Google Fonts or other third-party runtime request.

- [x] **Step 4: Install and verify the failing-then-passing smoke test**

Run:

```powershell
npm install
npm run test:run -- src/App.test.jsx
```

Expected: the initial test fails before `App` exists, then passes after the minimal render.

- [x] **Step 5: Run scaffold gates**

```powershell
npm run lint
npm run build
```

Expected: both exit 0 and the build contains robots metadata, both self-hosted
WOFF2 font assets, and both corresponding license files.

- [x] **Step 6: Commit**

```powershell
git add .gitignore package.json package-lock.json vite.config.js eslint.config.js playwright.config.js index.html vercel.json public/fonts src
git commit -m "chore: scaffold standalone AetherSDK showcase"
```

## Task 3: Build the design tokens and accessible shared primitives

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/components.css`
- Create: `src/components/ui.jsx`
- Create: `src/components/StatusBadge.jsx`
- Create: `src/components/DataState.jsx`
- Create: `src/components/Drawer.jsx`
- Create: `src/components/Dialog.jsx`
- Create: `src/access/policy.js`
- Test: `src/components/primitives.test.jsx`
- Test: `src/access/policy.test.js`

- [x] **Step 1: Write the failing permission and visibility contract tests**

Define Platform Admin, Integration Operator, Auditor, and Developer expectations
for route visibility, tenant/connector/run record scope, connector validation,
sync, retry, replay, access management, settings, and denied resources. This
policy exists before any selector or reducer depends on it.

- [x] **Step 2: Write failing primitive behavior tests**

Cover semantic button/link behavior, status text plus icon, dialog/drawer accessible names, Escape close, focus restoration, reduced-motion class behavior, and `DataState` variants.

- [x] **Step 3: Run the focused tests and confirm failure**

```powershell
npm run test:run -- src/access/policy.test.js src/components/primitives.test.jsx
```

Expected: FAIL because primitives and tokens do not exist.

- [x] **Step 4: Implement the access policy and token contract**

`src/access/policy.js` is the only persona/permission/record-scope definition.
It must not import fixtures or React and exposes pure functions consumed by
selectors, reducers, route metadata, and controls.

Define only CSS variables for colors, type, spacing, radii, borders, shadows, motion, shell widths, and density. Provide light/dark values with semantic tokens such as:

```css
:root {
  --color-canvas: #f4f4ef;
  --color-ink: #131512;
  --color-accent: #c7f43d;
  --color-positive: #16794f;
  --color-warning: #9a6700;
  --color-danger: #b42318;
  --font-sans: "Hanken Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Use semantic status tokens independently of the lime brand accent. Add `prefers-reduced-motion` overrides and reserve dimensions for asynchronous/changing content to prevent CLS.

- [x] **Step 5: Implement focused primitives**

Keep focus management inside `Dialog`/`Drawer`, state composition inside `DataState`, and status semantics inside `StatusBadge`; feature components may not reimplement these contracts.

- [x] **Step 6: Run tests, lint, and contrast spot-check**

```powershell
npm run test:run -- src/access/policy.test.js src/components/primitives.test.jsx
npm run lint
```

Expected: PASS and no literal feature-level hex colors outside token files.

- [x] **Step 7: Commit**

```powershell
git add src/access src/components src/styles
git commit -m "feat: add showcase design system primitives"
```

## Task 4: Create the canonical fixture graph and integrity contract

**Files:**
- Create: `src/demo/clock.js`
- Create: `src/demo/seed.js`
- Create: `src/demo/integrity.js`
- Create: `src/demo/selectors.js`
- Create: `src/test/fixture-builders.js`
- Test: `src/demo/integrity.test.js`
- Test: `src/demo/selectors.test.js`

- [x] **Step 1: Write failing fixture integrity tests**

Assert unique IDs, valid foreign keys, tenant isolation, run-to-connector links, entity/provider links, audit resources, delivery/event/subscription links, DLQ/delivery agreement, metering sources, and readiness dependencies.

Core assertion shape:

```js
const result = validateFixtureGraph(seedState);
expect(result).toEqual({ valid: true, errors: [] });
```

- [x] **Step 2: Write failing cross-foot selector tests**

Assert that overview totals equal filtered records, failed outcomes equal displayed failures, usage equals metering events, role-scoped counts use the permission policy, and every KPI drill-down returns its contributing IDs.

- [x] **Step 3: Run and confirm failures**

```powershell
npm run test:run -- src/demo/integrity.test.js src/demo/selectors.test.js
```

Expected: FAIL because the fixture graph and selectors do not exist.

- [x] **Step 4: Implement normalized seed state**

Use keyed maps plus stable ordered ID lists. Include at least two tenants internally, but expose only fictional `Northstar Labs` in normal demo flows. Include four personas, six provider definitions, eight connector instances, typed CRM/learning/media/corporate entities, linked provider identities, 20–30 historical runs, audit events, subscriptions, attempts, one historical DLQ item, metering events, and dependencies. Reserve deterministic IDs for the live signature chain; do not pre-seed its run, audit event, delivery, or DLQ record.

Do not store precomputed dashboard totals in fixtures.

- [x] **Step 5: Implement the anchor-relative clock and selectors**

All relative time derives from one fixed demo anchor and all metrics return both value and record IDs:

```js
export function selectFailedRunMetric(state, scope) {
  const recordIds = selectVisibleRuns(state, scope)
    .filter((run) => run.targetOutcomeIds.some((id) => state.targetOutcomes[id].status === 'failed'))
    .map((run) => run.id);
  return { value: recordIds.length, recordIds };
}
```

- [x] **Step 6: Pass integrity and selector tests**

```powershell
npm run test:run -- src/demo/integrity.test.js src/demo/selectors.test.js
```

Expected: PASS with no orphan or cross-foot errors.

- [x] **Step 7: Commit**

```powershell
git add src/demo src/test/fixture-builders.js
git commit -m "feat: add coherent Aether fixture graph"
```

## Task 5: Implement the shared reducer and both workflow state machines

**Files:**
- Create: `src/demo/reducer.js`
- Create: `src/demo/DemoProvider.jsx`
- Test: `src/demo/reducer.test.js`
- Test: `src/demo/DemoProvider.test.jsx`

- [x] **Step 1: Write one failing identity-continuous workflow test**

Cover connector validation, run creation, staged progression, one failed target,
failed-target-only retry, stable idempotency key, no duplicate provider link,
audit fan-out, webhook delivery creation, deterministic attempt exhaustion, DLQ
creation, replay, DLQ removal, and metering projections. The entire chain must
preserve and assert:

```text
requestId → runId → eventId → deliveryId → deadLetterId
             └── canonicalId + connectorId + remoteId
eventId + subscriptionId → stable payloadId across every attempt and replay
```

- [x] **Step 2: Write focused permission and idempotency edge-case tests**

Cover unauthorized retry/replay, duplicate reducer dispatches, reset during a
timer, and replay of an already-resolved dead letter. No reducer action may
fork a second copy of the signature chain.

- [x] **Step 3: Run and confirm failures**

```powershell
npm run test:run -- src/demo/reducer.test.js src/demo/DemoProvider.test.jsx
```

Expected: FAIL because actions/provider do not exist.

- [x] **Step 4: Implement deterministic reducer actions**

Supported actions:

```js
VALIDATE_CONNECTOR
START_SYNC
ADVANCE_RUN_STAGE
FAIL_TARGET
RETRY_FAILED_TARGET
ADVANCE_DELIVERY_ATTEMPT
EXHAUST_DELIVERY
REPLAY_DEAD_LETTER
SET_PERSONA
SET_SCENARIO
RESET_DEMO
SET_THEME
SET_DENSITY
```

Each domain mutation must update the normalized graph once; all UI changes must come from selectors. Completing the sync's webhook-fan-out stage creates the
linked delivery for that exact run/audit event; attempt exhaustion creates its
DLQ record. Timer-driven progression belongs in a provider effect that
dispatches explicit reducer actions and cleans up on route/reset.

- [x] **Step 5: Pass reducer/provider tests and re-run integrity after mutations**

```powershell
npm run test:run -- src/demo/reducer.test.js src/demo/DemoProvider.test.jsx src/demo/integrity.test.js src/demo/selectors.test.js
```

Expected: PASS before and after both workflows.

- [x] **Step 6: Commit**

```powershell
git add src/demo
git commit -m "feat: model cohesive showcase workflows"
```

## Task 6: Implement landing, onboarding, and persistence semantics

**Files:**
- Create: `src/demo/persistence.js`
- Create: `src/features/landing/LandingPage.jsx`
- Create: `src/features/onboarding/OnboardingDialog.jsx`
- Modify: `src/App.jsx`
- Test: `src/demo/persistence.test.js`
- Test: `src/features/landing/LandingPage.test.jsx`
- Test: `src/features/onboarding/OnboardingDialog.test.jsx`

- [x] **Step 1: Write failing storage contract tests**

Use exactly these keys:

```js
sessionStorage['aether-demo-entered']
localStorage['aether-onboarding-complete']
localStorage['aether-persona']
localStorage['aether-theme']
localStorage['aether-density']
```

Test fresh session, launch, skip, completion, replay-onboarding, sign-out/reset, and malformed-storage fallback.

- [x] **Step 2: Write failing landing/onboarding interaction tests**

Assert the mock boundary is visible before `Launch demo`; onboarding has four named steps; persona selection affects the provider; Skip marks completion; reset returns to pristine landing.

- [x] **Step 3: Implement landing and onboarding**

The hero must communicate within ten seconds: typed multi-provider sync, one governed runtime, operational recovery, and mock-data boundary. Preview both signature workflows without unsupported production claims.

- [x] **Step 4: Run focused tests**

```powershell
npm run test:run -- src/demo/persistence.test.js src/features/landing/LandingPage.test.jsx src/features/onboarding/OnboardingDialog.test.jsx
```

Expected: PASS.

- [x] **Step 5: Commit**

```powershell
git add src/App.jsx src/demo/persistence.js src/features/landing src/features/onboarding
git commit -m "feat: add honest landing and guided onboarding"
```

## Task 7: Implement routes, desktop shell, and demo controls

**Files:**
- Create: `src/app/routes.jsx`
- Create: `src/app/routeRegistry.js`
- Create: `src/app/PlaceholderPage.jsx`
- Create: `src/app/AppShell.jsx`
- Create: `src/app/CommandPalette.jsx`
- Create: `src/app/DemoControl.jsx`
- Modify: `src/App.jsx`
- Test: `src/app/AppShell.test.jsx`

- [x] **Step 1: Write failing shell/navigation and denied-route tests**

Assert active navigation, grouped navigation, tenant/environment/mock labels, theme/density/persona controls, command search, unknown-route handling, and a designed permission notice naming the missing permission.

- [x] **Step 2: Implement route metadata over the existing access policy**

Every route declares label, group, icon key, permission, desktop component, and optional mobile component. Sidebar and command palette consume the same metadata.

- [x] **Step 3: Implement shell and controls**

Persona changes navigation, visible records, KPIs, and actions. Demo scenarios set deterministic loading/empty/error/denied fixture overlays without forking the canonical graph.

- [x] **Step 4: Run focused and existing tests**

```powershell
npm run test:run -- src/access/policy.test.js src/app/AppShell.test.jsx
```

Expected: PASS with no duplicated route registry.

- [x] **Step 5: Commit**

```powershell
git add src/app src/App.jsx
git commit -m "feat: add role-aware showcase shell"
```

## Task 8: Build Overview and Integrations as shared projections

**Files:**
- Create: `src/components/DataTable.jsx`
- Create: `src/components/charts.jsx`
- Create: `src/features/overview/OverviewPage.jsx`
- Create: `src/features/integrations/IntegrationsPage.jsx`
- Create: `src/features/integrations/ConnectorDrawer.jsx`
- Test: `src/components/charts.test.jsx`
- Test: `src/features/overview/OverviewPage.test.jsx`
- Test: `src/features/integrations/IntegrationsPage.test.jsx`

- [x] **Step 1: Write failing projection and chart tests**

Assert KPI values/record IDs, chart keyboard navigation, percentage numerator/denominator, filter results, connector health/last-run consistency, and KPI drill-down to contributing records.

- [x] **Step 2: Write failing connector-validation test**

Opening a connector must show provider, type, credential-reference state, supported entity types, direction, validation, and recent runs. Validation must dispatch the shared reducer action and update Overview through selectors.

- [x] **Step 3: Implement Overview with one narrative**

Use a primary operational-health story, a throughput/history chart, actionable connector/run exceptions, usage, and recent shared activity. Avoid a grid of unrelated decorative KPIs.

- [x] **Step 4: Implement Integrations and connector drawer**

Use the shared `DataTable`, `Drawer`, `StatusBadge`, and selector drill-down contract. No provider card is a dead affordance.

- [x] **Step 5: Run tests**

```powershell
npm run test:run -- src/components/charts.test.jsx src/features/overview/OverviewPage.test.jsx src/features/integrations/IntegrationsPage.test.jsx
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add src/components/DataTable.jsx src/components/charts.jsx src/features/overview src/features/integrations
git commit -m "feat: connect overview and integration projections"
```

## Task 9: Build Sync Runs and the governed-sync signature workflow

**Files:**
- Create: `src/features/runs/RunsPage.jsx`
- Create: `src/features/runs/RunDetailPage.jsx`
- Create: `src/features/runs/RunTimeline.jsx`
- Create: `src/features/runs/runStages.js`
- Test: `src/features/runs/RunsPage.test.jsx`
- Test: `src/features/runs/RunDetailPage.test.jsx`

- [x] **Step 1: Write failing run-list tests**

Test status/direction/entity/provider/time filters, stable deep links, role scoping, and derived durations/latencies.

- [x] **Step 2: Write failing signature-workflow component test**

From a validated connector: start sync, navigate to the new run, progress through queue/authorization/fetch/normalization/match/write/link/audit/webhook/metering, retain the successful target, fail one target, and retry only that target with the original idempotency identity. Assert the webhook stage creates a delivery carrying the same `requestId`, `runId`, and generated `eventId`; do not complete replay in this component test.

- [x] **Step 3: Implement run list, detail, and timeline**

Render canonical/provider identities, per-target outcomes, sanitized error, sample fictional payload, and links to related audit/delivery objects. Raw data views must be clearly fictional and copy-safe.

- [x] **Step 4: Verify cross-screen projections**

After retry, assert Overview, connector health, run totals, audit, and usage all update through selectors without component-owned patches.

- [x] **Step 5: Run tests**

```powershell
npm run test:run -- src/features/runs/RunsPage.test.jsx src/features/runs/RunDetailPage.test.jsx src/demo/reducer.test.js src/demo/selectors.test.js
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add src/features/runs
git commit -m "feat: add governed sync trace and recovery"
```

## Task 10: Build Audit, Webhooks, DLQ, and recovery workflow

**Files:**
- Create: `src/features/audit/AuditPage.jsx`
- Create: `src/features/webhooks/WebhooksPage.jsx`
- Create: `src/features/webhooks/DeliveryDrawer.jsx`
- Test: `src/features/audit/AuditPage.test.jsx`
- Test: `src/features/webhooks/WebhooksPage.test.jsx`

- [x] **Step 1: Write failing linked-audit tests**

Test actor/action/resource/request filters, stable resource deep links, read-only semantics, and shared run/connector/delivery identifiers.

- [x] **Step 2: Write failing recovery-workflow test**

Start from the run created by the governed-sync workflow, navigate its generated
audit event → generated delivery attempts → generated DLQ item, then replay as
Operator. Assert `requestId`, `runId`, `eventId`, `deliveryId`, `payloadId`, and
`subscriptionId` continuity; DLQ removal; success state; replay audit event;
and metering/overview/health updates. Assert Auditor cannot replay and receives
the designed permission message. A seeded historical DLQ item is insufficient
for this test.

- [x] **Step 3: Implement Audit and Webhooks**

Show write-only-secret explanation without any usable secret, signed-delivery metadata without signature material, sanitized retry history, and clear simulation feedback.

- [x] **Step 4: Run tests**

```powershell
npm run test:run -- src/features/audit/AuditPage.test.jsx src/features/webhooks/WebhooksPage.test.jsx src/demo/reducer.test.js
```

Expected: PASS.

- [x] **Step 5: Commit**

```powershell
git add src/features/audit src/features/webhooks
git commit -m "feat: connect audit delivery and dead-letter recovery"
```

## Task 11: Complete governance, health, settings, and designed states

**Files:**
- Create: `src/features/access/AccessPage.jsx`
- Create: `src/features/health/HealthPage.jsx`
- Create: `src/features/settings/SettingsPage.jsx`
- Test: `src/features/access/AccessPage.test.jsx`
- Test: `src/features/health/HealthPage.test.jsx`
- Test: `src/features/settings/SettingsPage.test.jsx`
- Test: `src/app/scenarios.test.jsx`

- [ ] **Step 1: Write failing supporting-screen tests**

Assert role/member/service-actor/SCIM presentation, runtime identity and actual simulated dependency set, usage/plan derivation, and explicit simulation messages for billing/destructive controls.

- [ ] **Step 2: Write failing scenario matrix tests**

For each data surface, exercise loading, empty, sanitized error/retry, and permission denied where applicable. Assert controls remain keyboard reachable and scenarios reset cleanly.

- [ ] **Step 3: Implement supporting screens as projections**

These screens may be shallower than the two signature workflows, but every visible affordance must navigate, mutate local state, or explain its mock boundary. Do not create a second data model for members, dependencies, or usage.

- [ ] **Step 4: Run tests**

```powershell
npm run test:run -- src/features/access src/features/health src/features/settings src/app/scenarios.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/access src/features/health src/features/settings src/app/scenarios.test.jsx
git commit -m "feat: complete governed system projections"
```

## Task 12: Build the full-bleed mobile companion

**Files:**
- Create: `src/app/MobileShell.jsx`
- Create: `src/features/mobile/MobileHomePage.jsx`
- Create: `src/features/mobile/MobileRunPage.jsx`
- Create: `src/features/mobile/MobileMorePage.jsx`
- Modify: `src/app/routes.jsx`
- Modify: `src/styles/layout.css`
- Test: `src/app/MobileShell.test.jsx`

- [ ] **Step 1: Write failing boot-routing tests**

At 767 px and below, default to companion routes. `?view=desktop` must persist for the current navigation session. Desktop widths must not auto-route to mobile.

- [ ] **Step 2: Write failing companion interaction tests**

Test the persistent `Portfolio demo · mock data` boundary, health summary,
attention connectors, failed/active runs, run detail, DLQ items,
permission-aware retry/replay, home/landing/More routes, and the absence of dead
chevrons/cards/rows. Exercise loading, empty, sanitized error/retry, and denied
states on companion surfaces, not only desktop surfaces.

- [ ] **Step 3: Implement a full-bleed companion**

No decorative device bezel. Omit dense admin forms and payload tables. Reuse the canonical reducer/selectors and shared status/data-state primitives.

- [ ] **Step 4: Run tests at boundary widths**

```powershell
npm run test:run -- src/app/MobileShell.test.jsx
```

Expected: PASS at 320, 390, 767, and 768 px cases.

- [ ] **Step 5: Commit**

```powershell
git add src/app/MobileShell.jsx src/app/routes.jsx src/features/mobile src/styles/layout.css
git commit -m "feat: add Aether mobile operations companion"
```

## Task 13: Add end-to-end proof and no-network/public-safety gates

**Files:**
- Create: `e2e/landing-onboarding.spec.js`
- Create: `e2e/connector-sync.spec.js`
- Create: `e2e/webhook-recovery.spec.js`
- Create: `e2e/access-responsive.spec.js`
- Create: `e2e/public-safety.spec.js`
- Create: `scripts/public-safety-scan.mjs`
- Create: `scripts/verify-derived-data.mjs`
- Create: `src/quality-contracts.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing Playwright journeys**

Cover fresh landing/onboarding, role switch/denied links, command palette, SPA
deep link reload, theme/density persistence, mobile auto-routing/desktop escape,
and state scenarios. Include one uninterrupted primary journey:

```text
connector validation → sync → failed-target retry → linked audit event →
delivery attempt exhaustion → generated DLQ → replay → overview/health/usage
```

The journey asserts the displayed `requestId`, `runId`, `eventId`, `deliveryId`,
and payload/subscription identities at every hop, proving the two signature
workflows are one chain rather than two seeded demos.

- [ ] **Step 2: Add a no-runtime-network assertion**

Fail if the app requests any origin other than its own document and static
assets, including font CDNs, analytics, telemetry, APIs, and image hosts. Fail
on console errors, warnings, page errors, failed responses, and missing assets.

- [ ] **Step 3: Add executable quality-contract gates**

`verify-derived-data.mjs` must import the built fixture/integrity contract and
fail on referential or cross-foot errors. `quality-contracts.test.js` must fail
for hardcoded calendar/presentation statistics outside fixtures, literal
feature-level colors outside token files, absent font licenses, broken
focus-return/Escape behavior, missing mock-boundary routes, or an invalid dated
sweep-output schema.

- [ ] **Step 4: Add tiered public-safety scanning**

The private repository may retain authoring-only plan/spec paths and source
names because the repository remains private. Scan **all tracked files** for
secrets, credentials, tokens, real customer identities, and production
endpoints with no broad allowlist. Separately scan `src`, `public`, `index.html`,
`README.md`, `ARCHITECTURE.md`, and built `dist` for personal absolute paths,
unrevealed sibling names, and misleading production claims. Authoring docs are
never copied into `dist`; repository publication remains a separately
authorized operation requiring a fresh history/public-safety decision.

- [ ] **Step 5: Run the suites and fix behavior, not tests**

```powershell
npx playwright install chromium
npm run test:e2e
npm run verify:data
npm run test:run -- src/quality-contracts.test.js
npm run safety
```

Expected: all projects pass; zero console/network failures; safety scan exits 0.

- [ ] **Step 6: Commit**

```powershell
git add e2e scripts src/quality-contracts.test.js package.json package-lock.json
git commit -m "test: prove cohesive showcase journeys"
```

## Task 14: Document architecture and production handoff

**Files:**
- Modify: `README.md`
- Create: `ARCHITECTURE.md`
- Create: `docs/DEMO_DRIVEN_DELTAS.md`
- Create: `docs/REVEAL_COPY.md`
- Create: `docs/REVEAL_RUNBOOK.md`
- Test: `src/docs.test.js`

- [ ] **Step 1: Write failing documentation contract tests**

Assert README contains mock boundary, local commands, private-phase status, signature workflows, architecture link, and no unverified production claims. Assert architecture maps every screen to fixture selectors/actions.

- [ ] **Step 2: Write the real-versus-illustrative architecture**

Document canonical Aether concepts supported by code evidence, showcase-only fixture behavior, state/projection flow, persona scoping, mobile split, and public-safety model.

- [ ] **Step 3: Write demo-driven production deltas**

Use four sections:

```markdown
1. Existing API-backed production surfaces
2. Missing read models/endpoints exposed by the showcase
3. Frontend patterns worth porting to the Admin UI
4. Showcase-only engagement controls that must not enter production
```

Do not edit production AetherSDK from this task.

- [ ] **Step 4: Verify Git-grounded claims**

For every public timeline/engineering claim, add a Git commit/tag/date citation or label it illustrative. Remove claims that cannot be proven.

- [ ] **Step 5: Write reveal copy and the authorization-gated runbook**

`REVEAL_COPY.md` contains aligned title, description, case-study summary, OG
alt text, teaser, and portfolio card copy. `REVEAL_RUNBOOK.md` contains exact
T-2/T-1/T-0 commands and stop conditions for private Vercel linking, crawler
checks, fresh-session sweeps, exact-deployment captures, asset-byte checks,
portfolio metadata/nav/sitemap/chat updates, and rollback. Its T-0 section must
state that only the site becomes public; the GitHub repository remains private.
Removing robots protections or modifying the portfolio requires explicit owner
authorization at execution time.

- [ ] **Step 6: Run docs test and commit**

```powershell
npm run test:run -- src/docs.test.js
git add README.md ARCHITECTURE.md docs/DEMO_DRIVEN_DELTAS.md docs/REVEAL_COPY.md docs/REVEAL_RUNBOOK.md src/docs.test.js
git commit -m "docs: explain showcase architecture and production deltas"
```

## Task 15: Build reveal tooling, verify an immutable release, and rehearse privately

**Files:**
- Create: `artifacts/reveal/.gitkeep`
- Create: `scripts/capture-reveal.mjs`
- Create: `scripts/live-sweep.mjs`
- Create: `scripts/write-reveal-manifest.mjs`
- Test: `scripts/reveal-tools.test.js`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write failing release-tool tests before implementation**

Test the dated result schema, secret/path redaction, release-SHA validation,
deployment-ID validation, required route/viewport matrix, crawler/robots result,
asset-byte result, console/network result, and expected capture derivatives.

The manifest schema must require:

```json
{
  "releaseSha": "40-character commit SHA",
  "deploymentId": "provider deployment identifier",
  "deploymentUrl": "https URL",
  "createdAt": "ISO-8601",
  "robotsProtected": true,
  "commands": [],
  "sweeps": [],
  "captures": []
}
```

- [ ] **Step 2: Implement executable capture and live-sweep tooling**

`capture-reveal.mjs --url <url> --out <directory>` uses Playwright for fresh
browser contexts and Sharp for derivatives. It captures full-width desktop,
mobile companion, both workflow moments, OG 1200×630, preview, and teaser, then
records relative paths and content hashes.

`live-sweep.mjs --url <url> --out <directory>` checks every route/view at 1440,
1280, 1024, 768, 767, 430, 390, and 320 px plus phone/tablet landscape. It
records CLS, body overflow, console/page errors, same-origin requests, failed
responses, focus/Escape behavior, metadata, robots header/meta, crawler-facing
HTML, sitemap exclusion, and non-zero bytes/content hashes for every asset.

`write-reveal-manifest.mjs --release <sha> --deployment <id> --url <url>
--input <directory> --output <path>` validates all inputs and refuses a
mismatched release checkout. It permits untracked changes only inside the exact
`--input`/`--output` evidence directory and rejects every other dirty path.

- [ ] **Step 3: Pass tooling and complete local gates**

```powershell
npm run test:run -- scripts/reveal-tools.test.js src/quality-contracts.test.js
npm run lint
npm run test:run
npm run verify:data
npm run build
npm run safety
npm run test:e2e
git diff --check
```

Expected: every command exits 0 with no console warnings, failed requests,
fixture errors, hardcoded-stat/color violations, or whitespace errors.

- [ ] **Step 4: Commit all implementation and tooling before naming a release**

```powershell
git add .gitignore README.md artifacts/reveal/.gitkeep scripts package.json package-lock.json
git commit -m "chore: add private reveal verification tooling"
git status --short
git rev-parse HEAD
```

Expected: clean status. Save the returned SHA as `releaseSha`; this exact commit,
not a later evidence commit, is the release candidate.

- [ ] **Step 5: Re-run the full gate on the clean release SHA and push the feature branch**

```powershell
npm run verify
npm run test:e2e
git diff --check
git status --short
git push -u origin codex/showcase-build
gh repo view garthpuckerin/aethersdk-showcase --json visibility
```

Expected: all gates pass, status stays clean, the feature branch push succeeds,
and repository visibility is `PRIVATE`; `main` is not advanced yet.

- [ ] **Step 6: Link Vercel to the standalone Git repository before release push**

Precondition: Vercel authentication and deployment protection are confirmed.
Run from the standalone repository only:

```powershell
vercel link --yes
vercel git connect --yes
```

Expected: the linked Vercel project reports the GitHub repository as its Git
source and `main` as its production branch. Stop if it links another project,
repository, or production branch.

- [ ] **Step 7: Fast-forward remote main and wait for its Git-triggered deployment**

Advance `main` to the already verified feature SHA without creating a new commit:

```powershell
git push origin <release-sha>:main
vercel list aethersdk-showcase --environment production --meta githubCommitSha=<release-sha> --status BUILDING,READY
vercel inspect <git-deployment-url> --wait --timeout 5m
```

Expected: the push is a fast-forward, Vercel Git integration—not `vercel
deploy`—creates the production deployment, the deployment metadata contains the
same GitHub repository and `githubCommitSha == releaseSha`, and inspection
returns its deployment ID and `READY` state. Stop on any SHA/source mismatch.

- [ ] **Step 8: Configure protected automation access outside Git**

Create a Vercel Protection Bypass for Automation secret in project settings and
expose it only as the process environment variable
`VERCEL_AUTOMATION_BYPASS_SECRET`. `capture-reveal.mjs` and `live-sweep.mjs`
must require it for a protected deployment and send it only as the
`x-vercel-protection-bypass` request header plus
`x-vercel-set-bypass-cookie: true`. They must redact the value from command
echoes, Playwright traces, URLs, logs, screenshots, and manifests. Never use a
query-string secret or commit an environment file.

Reference: <https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation>

- [ ] **Step 9: Run T-1 fresh-session live sweeps and exact-deployment captures**

```powershell
npm run sweep:live -- --url <deployment-url> --out artifacts/reveal/2026-09-10
npm run capture -- --url <deployment-url> --out artifacts/reveal/2026-09-10/captures
npm run manifest -- --release <release-sha> --deployment <deployment-id> --url <deployment-url> --input artifacts/reveal/2026-09-10 --output artifacts/reveal/2026-09-10/manifest.json
```

Expected: fresh contexts pass the full route/viewport/persona/scenario matrix;
robots and crawler-spoiler checks pass; asset bytes/hashes are recorded; preview,
OG, teaser, desktop, mobile, and workflow images are generated from this exact
deployment; the manifest validates and names `releaseSha` plus deployment ID.

- [ ] **Step 10: Preserve evidence without changing the production branch**

Create an evidence branch from the verified release, commit only the dated
artifacts, and return to `main`:

```powershell
git switch -c evidence/aether-2026-09-10 <release-sha>
git add artifacts/reveal/2026-09-10
git commit -m "docs: record Aether reveal candidate evidence"
git push origin evidence/aether-2026-09-10
git switch main
git rev-parse HEAD
```

Expected: `main` still resolves to `releaseSha`; Vercel does not deploy the
evidence branch; the manifest resolves to the exact deployed commit. If the
production branch changes for any reason, repeat Steps 5–8 for the new SHA.

- [ ] **Step 11: Execute only the private portion of the reveal runbook**

Verify the private source repository, protected/noindex site, portfolio spoiler
exclusions, metadata/copy readiness, rollback path, and T-0 checklist. Do not
remove robots protection, expose the deployment, modify the portfolio, or
publish the repository. Those T-0 actions remain blocked on explicit owner
authorization and require new live sweeps of the final public-site deployment.

## Completion definition

Implementation is complete only when Tasks 0–15 are checked, the complete gate
is green from a clean checkout, the single identity-continuous workflow updates
every related projection through one reducer/selector infrastructure, the
private GitHub repository is the deployment source, the protected live
candidate remains `noindex, nofollow`, and the evidence manifest identifies the
exact verified release commit and deployment without changing that production
SHA.
