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
- **Severity:** medium · **Status:** current files resolved 2026-09-05 (scan now covers every tracked file, sealed names matched by hash, docs scrubbed); **history rewrite pending owner decision** · **Visible:** no until the repo flips public
- **Evidence:** `scripts/public-safety-scan.mjs` applies the "personal absolute path" pattern to `src`, `public`, `index.html`, `README.md`, `ARCHITECTURE.md`, `dist` only; `HANDOFF.md`, `docs/REVEAL_RUNBOOK.md` and `docs/superpowers/**` carry machine-local checkout paths and a Vercel project id, and the scan passes.
- **Next action (owner decision before the flip):** history still carries the scrubbed content in 42 commits — private checkout paths (6 files), the Vercel project id, deployment ids in an artifact manifest, and sealed sibling names (a sibling project's name in the scanner's old denylist since 29731f1, the graph and memory system names in docs). No secrets anywhere in history. Either accept (private paths and ids are low-value; the sealed names are spoilers of later reveals) or rewrite with `git filter-repo --replace-text <replacements>` from a fresh clone, then force-push `main` and let Vercel redeploy — the replacements file is prepared (session scratch `history-replacements.txt`, copy into `scripts/` if adopted). A rewrite invalidates the re-ingest hook's source revisions; re-ingest once afterwards. **Added 2026-09-05:** commit `3d02e9f` accidentally tracked an untracked `artifacts/presentation/` folder (walkthrough mp4/webm, ten voice-line mp3s, two scripts) via `git add -A`; removed from tracking in the next commit and ignored, but the blobs remain in history — one more reason to rewrite before the flip.

### ISSUE-006 · Audit action vocabulary diverges from the engine's
- **Severity:** low · **Status:** open (deferred hardening) · **Visible:** yes — audit screen, activity feed, chat/case-study copy that quotes action names
- **Evidence:** demo emits `sync.completed`, `sync.retried`, `webhook.replayed`, `webhook.delivery.exhausted`, `member.invited`, `role.updated`, `scim.user.deprovisioned`, `connector.credential.rotated`; the engine's audit calls use `sync.batch.completed`, `sync.target.completed`, `webhook.replay.succeeded|failed`, `webhook.delivery.succeeded|failed`, `webhook.dead_letter.created`, `connector.validated`, `connector.configured`, `connector.enabled`, `authz.deny`, `tenant.create` (grep of `action="…"` in `application/`, `security/`). Reviewed 2026-09-05, `docs/DEMO_DRIVEN_DELTAS.md` §5.
- **Next action:** rename fixture/reducer action strings to the engine vocabulary where an equivalent exists; keep demo-only actions (invite, role update) but label them illustrative in the README table. Re-run `npm run verify` and the sweeps (the white-glove sweep greps text).

### ISSUE-007 · Six demo surfaces are illustrative, not engine-backed
- **Severity:** low · **Status:** open (documented limitation) · **Visible:** yes, by design; now disclosed in the README "What's real vs. illustrative" table
- **Evidence:** stage rail, usage tier bar, latency/throughput KPIs, invite member, rotate credential reference, export audit trail have no engine endpoint (`docs/DEMO_DRIVEN_DELTAS.md` §5 G1–G8).
- **Next action:** none in the demo; the engine backlog carries the production shapes. Revisit the table whenever an engine capability lands.

## Closed

- 2026-09-05 · Replay onboarding reopened on the last step; no Back button;
  persona card misformatted — `50df878`.
- 2026-09-05 · The public-safety e2e hardcoded the port-4173 origin and failed
  under any `E2E_BASE_URL` — `be7d0ea`.
- 2026-09-04 · The dense integration matrix let long provider names escape
  their card — `d01b807`.
