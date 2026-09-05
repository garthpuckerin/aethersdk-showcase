# Issues — aethersdk-showcase

> Routing rule: this file is the home for anything **broken, wrong, missing,
> or knowingly deferred** (Work Item Routing Standard). Ideas go to
> `FEATURES-BACKLOG.md`, sequenced commitments to `ROADMAP.md`, decisions to
> `DECISIONS.md`. Every entry carries evidence or says it is undiagnosed, and
> says whether it is user-visible.

## Open

### ISSUE-001 · Docebo and Jira marks are JPG on a white tile in dark theme
- **Severity:** low · **Status:** open (deferred hardening) · **Visible:** yes, dark theme only
- **Evidence:** `public/icons/providers/docebo.jpg` and `jira.jpg` have no
  alpha channel; `.provider-mark--image` paints the surface color behind them,
  so the tile reads white on dark panels (seen 2026-09-04 in the dark-theme walk).
- **Next action:** replace with transparent PNG/SVG from the vendors' brand
  kits (usage terms read), then drop the white tile.

### ISSUE-002 · White-glove sweep does not detect content escaping its container
- **Severity:** low · **Status:** open (latent) · **Visible:** no — the one
  known instance (long provider names in the dense integration matrix) was
  fixed in `d01b807`
- **Evidence:** the owner caught "Jira Service Management" overflowing its
  card on 2026-09-04; `scripts/whiteglove-sweep.mjs` checks pills inside table
  cells only.
- **Next action:** add an "element right edge exceeds parent right edge" check
  for cards, chips and buttons to the sweep.

### ISSUE-003 · Sweeps do not exercise multi-step dialogs across close and reopen
- **Severity:** low · **Status:** open (latent) · **Visible:** no — the
  onboarding instance was fixed in `50df878`
- **Evidence:** replaying onboarding reopened on the last step for a day
  without any gate noticing; the sweeps open each drawer once and never reopen it.
- **Next action:** for every wizard or modal, walk to the last step, close,
  reopen, assert step 1 and a Back affordance on every step after the first.

### ISSUE-004 · No CI on this repo
- **Severity:** medium · **Status:** open (documented limitation) · **Visible:** no
- **Evidence:** `.github/workflows/` is absent; the gates (`npm run
  verify:release`, the sweeps) run locally before every push and the Vercel
  build is the only remote check.
- **Next action:** add a thin caller to a `garthpuckerin/devops` reusable
  workflow running `npm run verify` once one exists for Vite + Playwright repos.

### ISSUE-005 · Public-safety scan checks private absolute paths only on public-surface roots
- **Severity:** medium · **Status:** open (release blocker for the T-0 flip unless the owner accepts) · **Visible:** no until the repo flips public
- **Evidence:** `scripts/public-safety-scan.mjs` applies the "personal absolute path" pattern to `src`, `public`, `index.html`, `README.md`, `ARCHITECTURE.md`, `dist` only; `HANDOFF.md`, `docs/REVEAL_RUNBOOK.md` and `docs/superpowers/**` carry machine-local checkout paths and a Vercel project id, and the scan passes.
- **Next action:** at the T-2 history-level review, either scrub those files (and the history that introduced them) or widen the scan to every tracked file and accept the findings explicitly. Decide before the flip.

## Closed

- 2026-09-05 · Replay onboarding reopened on the last step; no Back button;
  persona card misformatted — `50df878`.
- 2026-09-05 · The public-safety e2e hardcoded the port-4173 origin and failed
  under any `E2E_BASE_URL` — `be7d0ea`.
- 2026-09-04 · The dense integration matrix let long provider names escape
  their card — `d01b807`.
