# Private Reveal Runbook

The GitHub repository remains private throughout this runbook. Before T-0, the
candidate site must also remain deployment-protected and `noindex, nofollow`.
Removing robots protections, exposing the deployment, or modifying the
portfolio requires explicit owner authorization at execution time.

Use the standalone showcase checkout only. Stop if any command names a different
repository, project, production branch, release SHA, or deployment ID.

## T-2 — immutable private candidate

1. Prove a clean release candidate:

   ```powershell
   npm ci
   npx playwright install chromium
   npm run verify
   npm run test:e2e
   npm audit --audit-level=high
   git diff --check
   git status --short
   git rev-parse HEAD
   gh repo view garthpuckerin/aethersdk-showcase --json visibility
   ```

2. Confirm repository visibility is `PRIVATE`. Stop if the tree is dirty, a
   gate fails, or visibility differs.
3. Confirm Vercel authentication and Deployment Protection before linking:

   ```powershell
   vercel whoami
   vercel link --yes
   vercel git connect --yes
   ```

4. Confirm the linked source is the standalone private repository and the
   production branch is `main`. Stop if Vercel names another source or branch.
5. Push the verified feature SHA, then fast-forward remote `main` to that exact
   SHA. Wait for the Git-triggered deployment; do not substitute a CLI deploy.
6. Inspect the deployment and verify its provider deployment ID, repository,
   Git commit metadata, READY state, authentication protection, and crawler
   headers. Stop on any identity mismatch or unauthenticated public response.

## T-1 — fresh-session evidence

Set `VERCEL_AUTOMATION_BYPASS_SECRET` only in the current process environment.
Never place it in a URL, command transcript, screenshot, trace, manifest, or
committed environment file.

```powershell
npm run sweep:live -- --url <exact-deployment-url> --out artifacts/reveal/<date>
npm run capture -- --url <exact-deployment-url> --out artifacts/reveal/<date>/captures
npm run manifest -- --release <40-character-sha> --deployment <deployment-id> --url <exact-deployment-url> --input artifacts/reveal/<date> --output artifacts/reveal/<date>/manifest.json
```

Review the dated sweep and manifest in fresh browser contexts. Required proof:

- every route at the required desktop, breakpoint, phone, tablet, and landscape
  viewports;
- no CLS regression, body overflow, console/page errors, external runtime
  requests, failed responses, or zero-byte assets;
- functional Escape/focus return and no dead interactive affordances;
- matching metadata, canonical copy, disclosure, robots header/meta, crawler
  HTML, and sitemap exclusion;
- hashes and non-zero byte sizes for desktop, mobile, both workflow moments,
  Open Graph, preview, and teaser captures;
- manifest release SHA and deployment ID matching the exact candidate.

Stop if the automation secret is absent for a protected deployment, any secret
appears in evidence, the checkout becomes dirty outside the evidence directory,
or any assertion fails. Preserve evidence on a non-production evidence branch;
do not change the release SHA on `main`.

## T-0 — separately authorized site reveal

Do not execute this section without fresh, explicit owner authorization. At
T-0, only the site becomes public; the GitHub repository remains private.

1. Reconfirm the exact release SHA and deployment ID from the approved manifest.
2. Prepare portfolio metadata, navigation, project card, case-study route, Open
   Graph image/alt text, sitemap entry, and assistant/chat knowledge using
   `REVEAL_COPY.md`. Show the owner the diff before modifying the portfolio.
3. With explicit authorization, change only the site’s deployment/robots
   protections required for public access. Never change repository visibility.
4. Run the complete live sweep and asset-byte/hash checks again against the
   final public URL in fresh sessions. Confirm intended sitemap inclusion and
   crawler-visible HTML only after authorization.
5. Merge the separately reviewed portfolio change and publish aligned links.

Stop if the public URL resolves to a different deployment, the manifest no
longer matches, metadata/copy diverges, a crawler control is inconsistent, or
any safety/runtime check fails.

## Rollback

If the public check fails, immediately restore deployment protection or promote
the last verified protected deployment, remove/disable new portfolio links, and
re-run crawler and availability checks. Do not rewrite Git history or expose the
repository. Record the failed deployment ID and cause outside the production
branch, fix on a new feature commit, and repeat T-2 and T-1 with a new immutable
SHA.
