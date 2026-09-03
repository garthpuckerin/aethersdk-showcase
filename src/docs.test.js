import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from './app/routeRegistry';

const read = (path) => readFileSync(path, 'utf8');

describe('showcase documentation contract', () => {
  it('documents the operating boundary and local verification path', () => {
    const readme = read('README.md');
    expect(readme).toContain('Portfolio demo · mock data');
    expect(readme).toContain('private');
    expect(readme).toContain('npm run verify');
    expect(readme).toContain('npm run test:e2e');
    expect(readme).toContain('connector validation');
    expect(readme).toContain('dead-letter replay');
    expect(readme).toMatch(/\[Architecture\]\(ARCHITECTURE\.md\)/);
    expect(readme).not.toMatch(/\bproduction-ready\b/i);
  });

  it('maps every routed screen and the non-desktop surfaces to shared selectors or actions', () => {
    const architecture = read('ARCHITECTURE.md');
    for (const route of ROUTES) {
      expect(architecture, `missing route ${route.path}`).toContain(`\`${route.path}\``);
    }
    for (const surface of ['Landing', 'Onboarding', 'Mobile home', 'Mobile run detail', 'Mobile more']) {
      expect(architecture, `missing surface ${surface}`).toContain(surface);
    }
    for (const sharedUnit of ['showcaseReducer', 'selectOverviewMetrics', 'selectVisibleConnectors', 'selectVisibleRuns', 'selectAuditEvents', 'selectDeliveries', 'selectDeadLetters']) {
      expect(architecture, `missing shared unit ${sharedUnit}`).toContain(`\`${sharedUnit}\``);
    }
  });

  it('ships aligned handoff and reveal documents that follow the house showcase SOP', () => {
    for (const path of ['HANDOFF.md', 'docs/DEMO_DRIVEN_DELTAS.md', 'docs/REVEAL_COPY.md', 'docs/REVEAL_RUNBOOK.md']) {
      expect(existsSync(path), `${path} must exist`).toBe(true);
    }
    const deltas = read('docs/DEMO_DRIVEN_DELTAS.md');
    expect(deltas).toContain('1. Existing API-backed production surfaces');
    expect(deltas).toContain('2. Missing read models/endpoints exposed by the showcase');
    expect(deltas).toContain('3. Frontend patterns worth porting to the Admin UI');
    expect(deltas).toContain('4. Showcase-only engagement controls that must not enter production');

    const runbook = read('docs/REVEAL_RUNBOOK.md');
    expect(runbook).toContain('T-2');
    expect(runbook).toContain('T-1');
    expect(runbook).toContain('T-0');
    // Owner decision 2026-09-03: house SOP — private until T-0, then public; the
    // earlier "remains private" policy must not come back.
    expect(runbook).toMatch(/flips public at T-0/i);
    expect(runbook).not.toMatch(/never change repository visibility/i);
    expect(runbook).toContain('Stop if');

    const handoff = read('HANDOFF.md');
    expect(handoff).toContain('house showcase SOP');
    expect(handoff).toContain('garthpuckerin-aethersdk.vercel.app');
    expect(handoff).toContain('--visibility public');
  });
});
