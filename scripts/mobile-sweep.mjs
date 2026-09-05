/* Mobile/tablet sweep — the phone companion and the tablet desktop shell must
 * never ship these defect classes:
 *
 *  1. Sideways scroll — the page must never pan horizontally.
 *  2. Nested scroll regions on phone tiers (the document is the only scroll
 *     surface; dialogs and the primary nav rail are exempt).
 *  3. Grids that stay multi-column beyond the tier's budget.
 *  4. Bottom tab bar colliding with content (last content element must end
 *     above the fixed nav) and tap targets below 40px.
 *
 *   BASE_URL=http://127.0.0.1:4173 node scripts/mobile-sweep.mjs
 */
import { chromium } from '@playwright/test';
import { BASE, DESKTOP_ROUTES, MOBILE_ROUTES, report, seedEntered, settle } from './sweep-shared.mjs';

const VIEWPORTS = [
  ['phone-P', 375, 812, 'phone'],
  ['phone-P small', 360, 800, 'phone'],
  ['phone-P max', 430, 932, 'phone'],
  ['phone-L', 844, 390, 'phone-land'],
  ['tablet-P', 768, 1024, 'tablet'],
  ['tablet-L', 1024, 768, 'tablet'],
];
const MAX_COLS = { phone: 2, 'phone-land': 3, tablet: 4 };
const GRID_ALLOW = ['kpi-strip', 'kpi-strip--bar', 'mobile-nav', 'segmented', 'chip-row', 'grid-2', 'grid-3', 'detail-grid', 'detail-grid--three', 'mobile-health-card', 'primary-nav', 'run-stage-rail', 'stage-rail', 'role-grid', 'dependency-grid', 'chart-bars', 'identity-chain', 'check-list', 'form-grid'];

const browser = await chromium.launch();
const issues = [];
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`);
let screens = 0;

for (const [vpName, width, height, tier] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: tier !== 'tablet', hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await seedEntered(page, { persona: 'operator' });
  const routes = tier === 'tablet' ? DESKTOP_ROUTES : MOBILE_ROUTES;

  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await settle(page);
    screens += 1;
    if (tier !== 'tablet' && !page.url().includes('/mobile/')) note(vpName, route, `phone tier did not route to the companion (${page.url()})`);
    const findings = await page.evaluate(({ maxCols, allow, phoneTier }) => {
      const out = [];
      const visible = (el) => { const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const label = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page pans sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);
      for (const el of document.querySelectorAll('*')) {
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const scrollsX = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2;
        const scrollsY = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2;
        const exempt = el === document.documentElement || el === document.body || el.closest('[role="dialog"], .primary-nav, .sidebar') || (!phoneTier && el.classList.contains('data-table-wrap'));
        if (exempt) continue;
        if (scrollsX) out.push(`x-scroll region: ${label(el)} (${el.scrollWidth}>${el.clientWidth})`);
        if (scrollsY) out.push(`nested y-scroll region: ${label(el)} (${el.scrollHeight}>${el.clientHeight})`);
      }
      for (const el of document.querySelectorAll('*')) {
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display !== 'grid') continue;
        if (allow.some((cls) => el.classList.contains(cls))) continue;
        const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter((w) => w > 24);
        const cols = tracks.length;
        const per = el.getBoundingClientRect().width / (cols || 1);
        if (cols > maxCols && Math.max(0, ...tracks) < 120) out.push(`${cols}-column grid at ${Math.round(per)}px/col: ${label(el)}`);
      }
      if (phoneTier) {
        const nav = document.querySelector('.mobile-nav');
        if (!nav) out.push('bottom tab bar missing');
        else {
          const navTop = nav.getBoundingClientRect().top + window.scrollY;
          const main = document.querySelector('.mobile-main');
          if (main) {
            const last = [...main.querySelectorAll('*')].filter(visible).map((el) => el.getBoundingClientRect().bottom + window.scrollY).reduce((max, bottom) => Math.max(max, bottom), 0);
            const docHeight = document.documentElement.scrollHeight;
            if (last > docHeight - nav.getBoundingClientRect().height + 2 && last > navTop + 2 && docHeight <= innerHeight + 2) out.push(`content ends under the tab bar (${Math.round(last)} > ${Math.round(navTop)})`);
          }
          for (const tab of nav.querySelectorAll('a')) if (tab.getBoundingClientRect().height < 40) out.push(`tab target under 40px: ${tab.textContent.trim()}`);
        }
        for (const el of document.querySelectorAll('button, a.button, .mobile-record')) {
          if (!visible(el)) continue;
          if (el.getBoundingClientRect().height < 36) out.push(`tap target under 36px: ${label(el)} "${(el.textContent || '').trim().slice(0, 30)}"`);
        }
      }
      return out;
    }, { maxCols: MAX_COLS[tier], allow: GRID_ALLOW, phoneTier: tier !== 'tablet' });
    for (const finding of [...new Set(findings)]) note(vpName, route, finding);
  }
  await ctx.close();
}

await browser.close();
report('mobile sweep', issues, `${VIEWPORTS.length} viewports / ${screens} screens`);
