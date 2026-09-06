# Changelog — aethersdk-showcase

All notable changes to the showcase. Conventional Commits on `main`; tags are
not adopted, the Vercel production deploy of `main` is the release.

## Unreleased

### Added
- Agent as a governed actor: a seeded provisioning run initiated by the
  provisioning agent, previewed before commit (`sync.previewed`) and completed
  under the agent's run id; agent kind on Access and Audit; run detail shows the
  agent run. Engine-backed (ADR 013 + 014 shipped 2026-09-05); README table
  updated. Seed version 4.

### Changed
- Onboarding step 3 now points the visitor at the provisioning agent in the
  audit trail (preview before commit, run id on every event).

### Security
- Public-safety scan now covers every tracked file (was six public-surface
  roots), adds platform resource ids, and matches sealed sibling-project names
  by SHA-256 so the denylist itself cannot spoil a reveal. Docs scrubbed of
  private checkout paths, the Vercel project id and sealed names (ISSUE-005).

### Added
- README "What's real vs. illustrative" table and `docs/DEMO_DRIVEN_DELTAS.md`
  §5: the 2026-09-05 review of this demo against the engine graph and OpenAPI
  contract (ten engine-side gaps G1–G10, two demo-side issues).
- Standards compliance files: `BCSTANDARDS.md`, `capabilities.yaml`,
  `docs/ISSUES.md`, `docs/FEATURES-BACKLOG.md`, `docs/ROADMAP.md`,
  `docs/DECISIONS.md`, this changelog; the Repo Hygiene `.gitignore` block.
- Fleet-manifest onboarding with the incremental re-ingest hook (2026-09-05).

### Changed
- `vercel.json` header profile extended to `production-public`: Content
  Security Policy scoped to self-hosted assets and frame denial, alongside the
  existing `noindex`, `nosniff` and referrer policy.

## 0.1.0 — 2026-09-05 (T-5 release candidate)

### Fixed
- Onboarding: replay restarts at step 1, Back on steps 2 to 4, persona step is
  a card grid with an initials mark and a clear selected state (`50df878`).
- e2e: the public-safety spec derives its same-origin check from `baseURL`
  (`be7d0ea`).

### Verified
- `verify:release` green from a fresh clone; white-glove, mobile and viewport
  sweeps clean; production smoke green on `garthpuckerin-aethersdk.vercel.app`.

## 2026-09-04 — T-5 depth pass

### Added
- Harborline FCU fixture graph (UKG and Xperience feeding Docebo, LinkedIn
  Learning, Axonify; Tableau, Slack, Jira) with 30 days of boot-anchored history.
- Autopilot engine advancing run stages and delivery attempts; persisted
  workflow state; command palette; Demo controls with an autopilot toggle.
- Full breadth on every desktop screen; phone companion with bottom tabs;
  canvas design language in light and dark; roomy and dense density.
- Self-hosted provider marks for the eight connected providers.
- House sweeps ported (`sweep:whiteglove`, `sweep:mobile`, `sweep:viewport`).

### Fixed
- Connector scoping in `scopeRecords`; the throughput series dropped
  operator-started runs; replay restores delivery health; the dense matrix let
  long provider names escape their card.

## 2026-09-03 — initial showcase
- Standalone cockpit scaffold (Vite and React); reveal docs aligned to the
  house showcase SOP.
