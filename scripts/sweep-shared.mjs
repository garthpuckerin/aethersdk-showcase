/* Shared helpers for the house sweeps (white-glove, mobile, viewport).
 * They run against a built preview or a deployed URL:
 *   BASE_URL=http://127.0.0.1:4173 node scripts/<sweep>.mjs
 */
export const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');

export const DESKTOP_ROUTES = ['/app/overview', '/app/integrations', '/app/runs', '/app/webhooks', '/app/audit', '/app/access', '/app/health', '/app/settings'];
export const MOBILE_ROUTES = ['/mobile/home', '/mobile/runs', '/mobile/queue', '/mobile/more'];

/* Enter the cockpit without the landing/onboarding gates, as a given persona. */
export function seedEntered(page, { persona = 'admin', density = 'roomy', theme = 'light' } = {}) {
  return page.addInitScript(([personaId, dens, th]) => {
    try {
      sessionStorage.setItem('aether-demo-entered', 'true');
      localStorage.setItem('aether-onboarding-complete', 'true');
      localStorage.setItem('aether-persona', personaId);
      localStorage.setItem('aether-density', dens);
      localStorage.setItem('aether-theme', th);
      localStorage.removeItem('aether-workflow-state');
    } catch { /* storage unavailable */ }
  }, [persona, density, theme]);
}

export function seedFresh(page) {
  return page.addInitScript(() => {
    try {
      sessionStorage.removeItem('aether-demo-entered');
      localStorage.removeItem('aether-workflow-state');
    } catch { /* storage unavailable */ }
  });
}

export async function settle(page, selector = 'main, .page, .mobile-main', timeout = 10_000) {
  await page.waitForSelector(selector, { timeout }).catch(() => {});
  await page.waitForTimeout(250);
}

export function report(name, issues, count) {
  console.log('');
  if (!issues.length) {
    console.log(`✓ ${name} clean${count ? ` across ${count}` : ''}`);
    return;
  }
  console.log(`${issues.length} issue(s):`);
  issues.forEach((issue) => console.log('  ✗ ' + issue));
  process.exitCode = 1;
}
