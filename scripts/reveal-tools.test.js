import { describe, expect, it } from 'vitest';
import { CAPTURE_SPECS, assertCaptureResult, redactSensitive } from './capture-reveal.mjs';
import { REQUIRED_ROUTES, REQUIRED_VIEWPORTS, assertLiveSweepResult } from './live-sweep.mjs';
import { assertAllowedDirtyPaths, assertRevealManifest } from './write-reveal-manifest.mjs';

const releaseSha = 'a'.repeat(40);
const contentHash = 'b'.repeat(64);

function passingPage(route, viewport) {
  return {
    route,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    status: 200,
    cls: 0,
    bodyOverflow: false,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    externalRequests: [],
    failedResponses: [],
    missingAssets: [],
    focusEscapePassed: true,
  };
}

describe('reveal tooling contracts', () => {
  it('defines the complete route, breakpoint, landscape, and capture matrices', () => {
    expect(REQUIRED_ROUTES).toEqual(expect.arrayContaining(['/','/app/overview', '/app/integrations', '/app/runs', '/app/runs/run_hist_01', '/app/webhooks', '/app/audit', '/app/access', '/app/health', '/app/settings', '/m', '/m/runs/run_hist_01', '/m/more']));
    expect(REQUIRED_VIEWPORTS.map(({ width }) => width)).toEqual(expect.arrayContaining([1440, 1280, 1024, 768, 767, 430, 390, 320]));
    expect(REQUIRED_VIEWPORTS.filter(({ orientation }) => orientation === 'landscape')).toHaveLength(2);
    expect(CAPTURE_SPECS.map(({ id }) => id)).toEqual(expect.arrayContaining(['desktop-overview', 'mobile-companion', 'workflow-run', 'workflow-recovery', 'og', 'preview', 'teaser']));
  });

  it('rejects incomplete, unsafe, or stale live sweep evidence', () => {
    const valid = {
      schemaVersion: 1,
      checkedAt: new Date().toISOString(),
      sourceUrl: 'https://candidate.example.test',
      robotsProtected: true,
      crawler: { noindexMeta: true, robotsHeader: true, sitemapExcluded: true, htmlHasSpoilers: false },
      pages: REQUIRED_ROUTES.flatMap((route) => REQUIRED_VIEWPORTS.map((viewport) => passingPage(route, viewport))),
      assets: [{ url: '/assets/app.js', bytes: 128, sha256: contentHash }],
    };
    expect(() => assertLiveSweepResult(valid)).not.toThrow();
    expect(() => assertLiveSweepResult({ ...valid, checkedAt: 'yesterday' })).toThrow(/checkedAt/);
    expect(() => assertLiveSweepResult({ ...valid, robotsProtected: false })).toThrow(/robots/i);
    expect(() => assertLiveSweepResult({ ...valid, pages: valid.pages.slice(1) })).toThrow(/matrix/i);
    expect(() => assertLiveSweepResult({ ...valid, assets: [{ ...valid.assets[0], bytes: 0 }] })).toThrow(/asset/i);
    expect(() => assertLiveSweepResult({ ...valid, pages: [{ ...valid.pages[0], externalRequests: ['https://tracker.invalid'] }, ...valid.pages.slice(1)] })).toThrow(/external/i);
  });

  it('validates content-hashed capture derivatives', () => {
    const result = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      sourceUrl: 'https://candidate.example.test',
      captures: CAPTURE_SPECS.map((spec) => ({ id: spec.id, route: spec.route, file: `${spec.id}.webp`, width: spec.width, height: spec.height, bytes: 256, sha256: contentHash })),
    };
    expect(() => assertCaptureResult(result)).not.toThrow();
    expect(() => assertCaptureResult({ ...result, captures: result.captures.slice(1) })).toThrow(/capture/i);
    expect(() => assertCaptureResult({ ...result, captures: [{ ...result.captures[0], sha256: 'bad' }, ...result.captures.slice(1)] })).toThrow(/hash/i);
  });

  it('redacts automation secrets and personal paths', () => {
    const input = 'header super-secret-value from C:\\Users\\person\\project and /home/person/project';
    const redacted = redactSensitive(input, 'super-secret-value');
    expect(redacted).not.toContain('super-secret-value');
    expect(redacted).not.toContain('C:\\Users');
    expect(redacted).not.toContain('/home/person');
    expect(redacted).toContain('[REDACTED]');
  });

  it('requires immutable release/deployment identity and protected evidence', () => {
    const manifest = {
      releaseSha,
      deploymentId: 'dpl_candidate_123',
      deploymentUrl: 'https://candidate.example.test',
      createdAt: new Date().toISOString(),
      robotsProtected: true,
      commands: ['npm run verify'],
      sweeps: ['live-sweep.json'],
      captures: ['captures/capture-result.json'],
    };
    expect(() => assertRevealManifest(manifest)).not.toThrow();
    expect(() => assertRevealManifest({ ...manifest, releaseSha: 'short' })).toThrow(/release/i);
    expect(() => assertRevealManifest({ ...manifest, deploymentId: '' })).toThrow(/deployment/i);
    expect(() => assertRevealManifest({ ...manifest, deploymentUrl: 'http://candidate.test' })).toThrow(/https/i);
    expect(() => assertRevealManifest({ ...manifest, robotsProtected: false })).toThrow(/robots/i);
  });

  it('allows dirty evidence only inside the exact evidence boundary', () => {
    expect(() => assertAllowedDirtyPaths(['artifacts/reveal/date/live-sweep.json'], 'artifacts/reveal/date', 'artifacts/reveal/date/manifest.json')).not.toThrow();
    expect(() => assertAllowedDirtyPaths(['src/App.jsx'], 'artifacts/reveal/date', 'artifacts/reveal/date/manifest.json')).toThrow(/dirty/i);
    expect(() => assertAllowedDirtyPaths(['artifacts/reveal/other/file.png'], 'artifacts/reveal/date', 'artifacts/reveal/date/manifest.json')).toThrow(/dirty/i);
  });
});
