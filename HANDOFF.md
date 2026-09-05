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
sweep clean (52 screens); viewport sweep clean (20 sizes). Last fixes landed
without a re-run: integrations grid single-column ≤900px (tablet-portrait
overflow), mobile-sweep allowlist now covers nested grids — **re-run
`BASE_URL=http://localhost:3400 npm run sweeps` first thing next session.**

REMAINING (T-3 → T-2, Sep 6–8): re-run sweeps + `npm run verify:release`;
Vercel: rename project to `garthpuckerin-aethersdk`, re-enable Git production
on `main`, confirm noindex; capture imagery from the live URL with
`garthpuckerin.dev/scripts/capture-aether-preview.mjs` (LIGHT) then
`build-previews.mjs`; onboard this repo into the the code-graph graph manifest;
history-level public-safety review before the T-0 flip. Site side is already
prepared on garthpuckerin.dev `develop` (reveal-meta, case study, chat KB,
wall card; ritual dry-run green except the not-yet-captured assets).

## Gates

`npm run verify` (lint · vitest · fixture verify · build · public-safety scan)
and `npm run test:e2e` are green at `4cc14eb`. Still to port from the house
suite before T-3: `whiteglove-sweep.mjs`, `mobile-sweep.mjs`,
`viewport-sweep.mjs`, the anchor-relative coherence gate, and phone-width e2e
of both signature workflows.

## Local dev

```powershell
npm ci
npm run dev -- --port 3400
```

(`garthpuckerin.dev/.claude/launch.json` entry `aethersdk-showcase`.)
