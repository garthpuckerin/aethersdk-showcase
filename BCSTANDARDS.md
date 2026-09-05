# BCSTANDARDS — aethersdk-showcase

> AI agents: read this before writing code. This is the AI Context Contract for
> this repo. It is written to be safe if this repo is public (it becomes public
> at the reveal) — keep it that way: no other project's embargoed names, no
> secrets, no engine internals, no private absolute paths, no real customer.

## What this repo is

- A **curated public showcase** of the Aether SDK **cockpit** — the operator
  console over a fictional credit-union tenant (Harborline FCU), not the
  engine. Mock fixtures only; no backend, no network, no secrets. `README.md`
  ("What's real vs. illustrative") states the cockpit-vs-engine boundary; the
  integration engine (canonical schemas, OpenAPI-generated adapters, governed
  multi-target sync, idempotent retry, audit, webhook delivery, dead-letter
  replay, metering) is a separate **private** codebase and must never be
  described or referenced here beyond that honest boundary table. Do not name
  the private engine repository, and never claim shipped vendor adapters.
- This repo is the **canonical dev home** for the Aether SDK cockpit. Any
  other checkout of it is retired after the reveal; make edits **here**.
- **Product class (Product Class Standard):** `P` — personal portfolio demo,
  static frontend, no persistence beyond browser storage.

## Governance

- Authority: **Blurred Concepts Engineering Constitution v2.0** —
  `github.com/garthpuckerin/blurred-concepts-engineering`.
- Precedence (Constitution §1): direct owner instruction → this `BCSTANDARDS.md`
  → Constitution → topic standards → supporting docs.
- Work items route by kind (Work Item Routing Standard): defects and deferred
  debt → `docs/ISSUES.md`; ideas → `docs/FEATURES-BACKLOG.md`; sequenced
  commitments → `docs/ROADMAP.md`; decisions with rationale →
  `docs/DECISIONS.md`. Each file states its rule at the top.
- Claims ledger: `capabilities.yaml` — every `live` capability names its proof.

## Code Comprehension (Comprehension Ladder Standard)
<!-- bcstd:managed comprehension v1 -->
- Graph repo_id: `github.com/garthpuckerin/aethersdk-showcase`
- Ladder-first: query the code-graph MCP ladder (`map` / `find` / `explain` /
  `neighbors` / `read`) with the repo_id above BEFORE raw file reads or grep
  for structure/behavior/relationship questions. Raw reads remain correct for
  editing, ungraphed repos, non-code content, and exact-line verification.
  Canonical text: `standards/Comprehension_Ladder_Standard.md` in
  blurred-concepts-engineering — it governs on any conflict.
<!-- /bcstd:managed -->
- Onboarded into the fleet manifest 2026-09-05 with the incremental re-ingest
  hook; every commit re-ingests in the background. Note: this is a React app —
  the graph does not model JSX render edges, so grep for "what renders X".

## Git & Release

- **Branch model (alternate, documented per the Git & Release Standard):** this
  repo does not use GitFlow. It is solo-maintained (owner + AI pair); commits
  land directly on **`main`**, which is the Vercel production branch — **push
  to `main` auto-deploys** the live demo. No environment branches; tags not
  adopted (do not tag unilaterally). Conventional Commits; `CHANGELOG.md`
  updated in the same change as anything user- or standards-visible.
- **Verify before pushing:** `npm run verify` (lint · vitest · fixture
  coherence gate · build · public-safety scan). Before a release:
  `npm run verify:release` (adds the full Playwright suite, `npm audit
  --audit-level=high`, `git diff --check`) plus the three layout sweeps
  (`npm run sweeps` against the dev server). The e2e error assertions are
  strict by design — a failed request or console error is a real defect, never
  weaken them. Coverage from a fake that scripts a sequence the real
  dependency cannot produce is not coverage (Testing & Proof Standard).
- **Data contract:** every timestamp is anchored to the boot clock; no raw ISO
  or absolute dates in prose or JSX; the reducer is the only mutation boundary;
  engine verbs ("simulate", "advance") never appear in product UI — only in
  Demo controls.

## Security headers / transport

- Production is HTTPS on Vercel; `vercel.json` carries the header profile
  (`production-public`): CSP scoped to self-hosted assets, `X-Robots-Tag:
  noindex, nofollow`, `nosniff`, referrer policy, frame denial. Header changes
  are proven against the live URL (browser console clean, headers curled) and
  noted in the changelog.

## Publish / spoiler discipline (reveal-season)

- **Private until the reveal.** This repo is created private and flips to
  **public at the Aether SDK reveal (Thu Sep 10 2026, 16:00 UTC)** —
  owner-only action: `gh repo edit garthpuckerin/aethersdk-showcase
  --visibility public --accept-visibility-change-consequences`.
- **noindex is kept** at reveal (owner decision): the deployed demo carries
  `noindex`; SEO/GEO lives on the hub (`garthpuckerin.com`), which links to
  this demo. Do not remove it.
- **Sanitized-only.** Never add engine internals, secrets, real PII, the real
  client behind the credit-union story (the tenant is fictional), the private
  engine repo name, or any other reveal-season project's embargoed name or
  content (systems revealing after Sep 10 stay sealed until their own
  Thursdays — through Oct 1). Vendor names (UKG, Xperience — owner's spelling,
  Docebo, LinkedIn Learning, Axonify, Tableau, Slack, Jira) describe the use
  case; they are not claims of shipped adapters. Vercel serves only `dist/`,
  but this repo is public after the reveal — treat every committed file as
  public, and `npm run safety` must stay green.

## Institutional Memory
<!-- bcstd:managed memory v1 -->
- The comprehension and memory habits are active client bindings, not passive
  repository guidance. Each client must use the highest enforcement tier it
  supports under the Comprehension Ladder Standard.
- Recall the memory tier (`hybrid_search`) when starting work on a system that may
  have prior context. Before ending, store decisions with rationale, gotchas,
  and cross-session operational context with source, controlled tags, and a
  deliberate TTL. Never store secrets or code-structure facts.
- Canonical memory policy: `standards/Memory_Standard.md` in
  blurred-concepts-engineering — it governs on any conflict.
<!-- /bcstd:managed -->
