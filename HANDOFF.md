# HANDOFF — aethersdk-showcase

Reveal: **Thu 2026-09-10, noon ET.** This repo is the public cockpit for the
Aether SDK reveal and follows the **house showcase SOP** (models:
`grant-tracker-showcase`, `ops-command-center-showcase`). The governing brief
is the aethersdk §9 section of
`<hub-repo>\docs\DEMO_POLISH_CHECKLIST.md`; the ritual is the
`reveal-cycle` skill in `<site-repo>`. Read both before
touching this repo.

## Owner decisions (2026-09-03) — "everything SOP"

Codex built this repo on 2026-09-03 and, lacking the house context, wrote a
private-forever / protected-preview / immutable-SHA policy into its docs. The
owner voided that the same day. What applies:

- **Visibility:** private until T-0, then `gh repo edit
  garthpuckerin/aethersdk-showcase --visibility public
  --accept-visibility-change-consequences` on the owner's go. This repo is the
  canonical dev home from then on.
- **Deploy:** git-integrated Vercel production on `main` behind a **permanent**
  `noindex` at `garthpuckerin-aethersdk.vercel.app`. The Vercel project
  (`<vercel-project-id>`, currently named `aethersdk-showcase`,
  Git deployments disabled by Codex) is renamed and re-enabled at **T-2
  (Sep 8)**. T-1/T-0 sweeps run against that production URL.
- **Canonical checkout:** `<showcase-checkout>` (this one). The two
  checkouts inside `<engine-repo>\` (`_aethersdk_showcase` on
  `evidence/aether-2026-09-10`, `_worktrees\aethersdk-showcase-build` on
  `codex/showcase-build`) are retired at T+0 — do not develop in them. Codex's
  untracked `HANDOFF.md` in the worktree is superseded by this file.
- **Captures:** LIGHT theme (owner prefers the Claude Design canvas language);
  full-width 1968px source → preview/OG/teaser via a clone of
  `garthpuckerin.dev/scripts/capture-ops-preview.mjs`, from the live deploy.
- **Featured integrations (owner, 2026-09-03):** rewrite the fixture graph to
  the credit-union use case that led to this build — **UKG, Xperience, Docebo,
  LinkedIn Learning, Axonify** (+ Tableau, + 2–3 secondary connectors for
  breadth), fictional credit-union tenant. Two honest entity flows, matching
  the engine's same-entity fan-out design (`SyncService.sync_many`,
  `corporate.employee.v1` / `learning.course.v1`): (1) people out — UKG →
  canonical employee → Docebo + LinkedIn Learning + Axonify provisioning, one
  target fails, retry only it; plus a seeded termination/deactivation run;
  (2) learning in — LMS completion → canonical course entry → audit →
  webhook → DLQ → replay. Developer persona scoped to Docebo + LinkedIn
  Learning. Spelling decided: **"Xperience"** (the vendor uses both; owner's
  spelling wins; one-line rename if it changes). Full detail: the §9 brief.
- **Depth:** T-5 depth pass using the Claude Design canvas as the breadth
  source (catalog, hour drill-down, dense layout, typed audit, Roles/SCIM,
  create/invite/add modals) while preserving the reducer/selector contract.
  Move every "Simulate…" verb out of product UI into Demo controls; auto-advance
  run stages; anchor the clock to `Date.now()`; persist reducer state; give the
  mobile companion bottom tabs and stop its rows escaping to desktop.

## State after the T-5 depth pass (2026-09-04, session ended at usage limit)

DONE and committed on `main`: fixture rewrite (Harborline FCU; UKG/Xperience →
Docebo/LinkedIn Learning/Axonify; Tableau/Slack/Jira; 30 days of history
anchored to the boot clock), autopilot engine (no engine verbs in product UI),
persisted workflow state, canvas design language (light + dark), full breadth on
every desktop screen, phone companion with bottom tabs, house sweeps ported.
Verified: `npm run verify` green (29 files / 241 tests, coherence gate, build,
safety scan); full Playwright 13 passed / 9 skipped-by-project; white-glove
sweep clean (52 screens); viewport sweep clean (20 sizes); mobile sweep clean
(6 viewports / 32 screens) after the integrations-grid and allowlist fixes —
all three sweeps verified clean on 2026-09-04 against the dev server.

DONE 2026-09-05: `verify:release` green from a fresh clone at `be7d0ea` (see
Gates). REMAINING (T-3 → T-2, Sep 6–8):
Vercel: rename project to `garthpuckerin-aethersdk`, re-enable Git production
on `main`, confirm noindex; capture imagery from the live URL with
`garthpuckerin.dev/scripts/capture-aether-preview.mjs` (LIGHT) then
`build-previews.mjs`; onboard this repo into the the code-graph graph manifest;
history-level public-safety review before the T-0 flip. Site side is already
prepared on garthpuckerin.dev `develop` (reveal-meta, case study, chat KB,
wall card; ritual dry-run green except the not-yet-captured assets).

## Owner-caught defects (2026-09-04) — FIXED 2026-09-05

All three below are fixed in `OnboardingDialog.jsx` (+ unit tests, `layout.css`)
and verified in the browser: replay lands on step 1 of 4, Back appears on steps
2–4 only, persona step is a 2-column card grid (1 column ≤560px) with an
initials avatar, bold label, muted description, and an ink-bordered selected
state — checked light + dark and at 390px. The active persona is now
pre-selected on replay (`activePersonaId` passed from `App.jsx`). Kept for the
T+0 retro (owner-caught → detector class: "modal step state survives
close/reopen" — consider a white-glove check that replays every wizard).

1. **Replay onboarding does not restart** — it reopens on the last step
   ("Your cockpit is ready"). `OnboardingDialog` keeps `step` in local state
   that survives close/reopen; reset it to 0 when `open` flips true (or key the
   dialog on an open counter). Cover with a unit test: replay → step 1 of 4.
2. **No back navigation in onboarding** — add a "Back" ghost button on steps
   2–4 (`.onboarding__actions`), keyboard-reachable, and keep Continue / Enter
   cockpit / Skip labels unchanged (e2e greps them).
3. **Persona card is poorly formatted** — the persona buttons in step 2
   (`.onboarding__personas .button`) misalign label/description; rebuild as a
   2-column card grid with the persona label bold, description muted below,
   an avatar/initials mark, and a clear selected state (`aria-pressed`).
   Check both themes and the 390px phone width.

## Provider icons (owner request 2026-09-04, deferred)

The cards/rows use two-letter monograms (`.provider-mark`). Simple Icons (CC0)
only carries Jira, SAP, Snowflake, Okta — LinkedIn, Slack, Salesforce, Tableau,
Workday, Teams, ServiceNow were removed at the vendors' request, and UKG,
Docebo, Axonify, Cornerstone were never included. Real marks for the headline
six need the vendors' own brand kits (UKG, Docebo, LinkedIn Brand Center,
Axonify, Tableau/Salesforce brand, Slack brand) with their usage terms read;
self-host under `public/icons/providers/<slug>.svg`, add `iconSlug` to
`PROVIDER_DEFINITIONS` in `src/demo/seed.js`, render `<img>` with the monogram
as fallback in the three mark helpers (`features/integrations/providerMark.js`,
`features/runs/ProviderMark.jsx`, `features/overview/format.js`/`panels.jsx`).
DONE 2026-09-04 (`4ac618f`): eight self-hosted marks via the shared
`src/components/ProviderMark.jsx`; consider transparent PNGs for Docebo/Jira
(currently JPG on a white tile in dark theme).

## Gates

`npm run verify:release` (lint · vitest 29 files / 244 tests · coherence gate ·
build · public-safety scan · full Playwright 13 passed / 9 skipped-by-project ·
`npm audit --audit-level=high` 0 vulns · `git diff --check`) is green from a
**fresh clone** at `be7d0ea` (2026-09-05). The three house sweeps
(`npm run sweeps`) are clean at `50df878` against the dev server.

Gotchas: the Playwright `webServer` wants port 4173 — if something else holds it
(a stray `python -m http.server 4173` did on 2026-09-05), serve the build on a
spare port and set `E2E_BASE_URL` (the same override is used for the T-1/T-0
runs against production). The dev server answers on `localhost:3400`, not
`127.0.0.1`, so sweeps against it need `BASE_URL=http://localhost:3400`.

## Local dev

```powershell
npm ci
npm run dev -- --port 3400
```

(`garthpuckerin.dev/.claude/launch.json` entry `aethersdk-showcase`.)
