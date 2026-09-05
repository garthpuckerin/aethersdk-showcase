/* Viewport sweep — measures every desktop route across the real device matrix
 * and reports layout defects for the sidebar-rail shell:
 *   - sideways scroll (the page must never pan)
 *   - wrong shell tier: at <=767 the /app routes must hand off to the phone
 *     companion; above 767 the sidebar rail must be present with real width
 *   - top bar wrapped to more than one row
 *   - landing fit (fresh visitor): no sideways scroll, headline + CTA present
 *
 *   BASE_URL=http://127.0.0.1:4173 node scripts/viewport-sweep.mjs
 */
import { chromium } from '@playwright/test';
import { BASE, DESKTOP_ROUTES, report, seedEntered, seedFresh, settle } from './sweep-shared.mjs';

const COMPANION_BP = 767;
const VIEWPORTS = [
  ['phone-P small', 360, 800], ['phone-P', 390, 844], ['phone-P max', 430, 932],
  ['phone-L SE', 667, 375], ['phone-L', 844, 390], ['phone-L max', 932, 430],
  ['tablet-P', 768, 1024], ['tablet-P big', 834, 1194], ['tablet-L', 1024, 768], ['tablet-L big', 1194, 834],
  ['narrow-1050', 1050, 800], ['narrow-1100', 1100, 800], ['narrow-1250', 1250, 800], ['narrow-1520', 1520, 864],
  ['laptop short', 1280, 720], ['laptop', 1366, 768], ['laptop 125%', 1536, 864],
  ['desktop FHD', 1920, 1080], ['capture 1968', 1968, 1100], ['desktop QHD', 2560, 1440],
];

const browser = await chromium.launch();
const issues = [];
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`);

for (const [vpName, width, height] of VIEWPORTS) {
  const mobileTier = width <= 1024;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobileTier ? 2 : 1, isMobile: mobileTier, hasTouch: mobileTier });
  const page = await ctx.newPage();
  await seedEntered(page, { persona: 'admin' });

  for (const route of DESKTOP_ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const m = await page.evaluate(() => {
      const rect = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: b.width, h: b.height, display: cs.display }; };
      return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, sidebar: rect('.sidebar'), topbar: rect('.topbar'), mobileNav: rect('.mobile-nav'), url: location.pathname };
    });
    if (m.scrollW > m.vw + 1) note(vpName, route, `sideways scroll (${m.scrollW} > ${m.vw})`);
    if (width <= COMPANION_BP) {
      if (!m.url.startsWith('/mobile')) note(vpName, route, `phone tier stayed on ${m.url} instead of the companion`);
      if (!m.mobileNav) note(vpName, route, 'companion tier without a bottom tab bar');
    } else {
      if (!m.sidebar || m.sidebar.display === 'none' || m.sidebar.w < 120) note(vpName, route, 'rail tier but the sidebar has no width');
      if (m.topbar && m.topbar.h > 72) note(vpName, route, `top bar wrapped to ${Math.round(m.topbar.h)}px (should be one row)`);
    }
  }

  const fresh = await ctx.newPage();
  await seedFresh(fresh);
  await fresh.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await fresh.waitForTimeout(250);
  const landing = await fresh.evaluate(() => ({
    sideways: document.documentElement.scrollWidth > innerWidth + 1,
    headline: Boolean(document.querySelector('.landing h1')),
    cta: [...document.querySelectorAll('button')].some((b) => /launch demo/i.test(b.textContent)),
  }));
  if (landing.sideways) note(vpName, 'landing', 'sideways scroll');
  if (!landing.headline) note(vpName, 'landing', 'headline missing');
  if (!landing.cta) note(vpName, 'landing', 'launch CTA missing');
  await ctx.close();
}

await browser.close();
report('viewport sweep', issues, `${VIEWPORTS.length} viewports`);
