/* White-glove sweep — walks EVERY desktop route as every persona, every mobile
 * route at phone width, and every drawer that a first click opens, reporting:
 *
 *  1. Text defects: NaN, undefined, [object Object], Invalid Date, negative
 *     relative times, raw ISO timestamps, "Simulate"/"Advance to" verbs
 *     leaking out of Demo controls, and apologetic/provisional copy.
 *  2. Inert affordances: elements that look interactive (role=button, links,
 *     .table-link, .chip, .kpi--link, .mobile-record) whose computed cursor is
 *     not pointer and that have no href — a surface that reads as clickable
 *     but isn't wired.
 *  3. Pills cut off inside table cells.
 *
 *   BASE_URL=http://127.0.0.1:4173 node scripts/whiteglove-sweep.mjs
 */
import { chromium } from '@playwright/test';
import { BASE, DESKTOP_ROUTES, MOBILE_ROUTES, report, seedEntered, settle } from './sweep-shared.mjs';

const TEXT_DEFECTS = [
  ['NaN', /(?<![a-zA-Z])NaN\b/],
  ['undefined', /\bundefined\b/],
  ['object Object', /\[object Object\]/],
  ['Invalid Date', /Invalid Date/],
  ['negative relative time', /(?<![\w-])-\d+\s?(m|h|d) ago/],
  ['raw ISO timestamp', /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/],
  ['engine verb in product UI', /\b(Simulate|Advance to|Send next simulated)\b/],
  ['provisional copy', /\b(lorem|placeholder|coming soon|TODO|WIP)\b/i],
];

const PERSONAS = ['admin', 'operator', 'auditor', 'developer'];
const browser = await chromium.launch();
const issues = [];
const note = (screen, what) => issues.push(`${screen}: ${what}`);
let screens = 0;

async function scan(page, screen) {
  screens += 1;
  const result = await page.evaluate(() => {
    const dialogOpen = Boolean(document.querySelector('[role="dialog"]'));
    const text = document.body.innerText;
    const looksClickable = 'a, button, [role="button"], .table-link, .chip, .kpi--link, .mobile-record, .integration-card__action';
    const inert = [...document.querySelectorAll(looksClickable)]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
        if (el.tagName === 'A' && !el.getAttribute('href')) return true;
        return cs.cursor !== 'pointer' && cs.cursor !== 'text';
      })
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')} "${(el.textContent || '').trim().slice(0, 40)}"`);
    const pills = [...document.querySelectorAll('td .status-badge, .data-table .status-badge')]
      .map((pill) => {
        const cell = pill.closest('td');
        if (!cell) return null;
        const overflow = Math.round(pill.getBoundingClientRect().right) > Math.round(cell.getBoundingClientRect().right) + 1;
        return overflow ? `"${(pill.textContent || '').trim()}" overflows its cell` : null;
      })
      .filter(Boolean);
    return { text, inert, pills, dialogOpen };
  });
  for (const [label, re] of TEXT_DEFECTS) {
    const match = result.text.match(re);
    if (match) {
      const at = result.text.indexOf(match[0]);
      note(screen, `${label} → "…${result.text.slice(Math.max(0, at - 40), at + 40).replace(/\n/g, ' ⏎ ')}…"`);
    }
  }
  for (const item of [...new Set(result.inert)]) note(screen, `looks clickable but isn't: ${item}`);
  for (const item of [...new Set(result.pills)]) note(screen, `pill cut off: ${item}`);
}

for (const persona of PERSONAS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) note(`${persona}:console`, message.text().slice(0, 160)); });
  page.on('pageerror', (error) => note(`${persona}:pageerror`, error.message.slice(0, 160)));
  await seedEntered(page, { persona });
  for (const route of DESKTOP_ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await scan(page, `${persona}:${route}`);
    // Open the first record drawer/dialog on the page, if any, and scan it too.
    const opener = page.locator('.table-link, .integration-card__action, [aria-label^="View "]').first();
    if (await opener.count()) {
      await opener.click().catch(() => {});
      await page.waitForTimeout(250);
      if (await page.locator('[role="dialog"]').count()) {
        await scan(page, `${persona}:${route}:drawer`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        if (await page.locator('[role="dialog"]').count()) note(`${persona}:${route}:drawer`, 'Escape did not close the dialog');
      }
    }
  }
  // Demo controls and command palette open/close.
  await page.goto(BASE + '/app/overview', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await scan(page, `${persona}:demo-controls`);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Search and commands' }).click();
  await scan(page, `${persona}:command-palette`);
  await page.keyboard.press('Escape');
  await ctx.close();
}

// Phone companion as operator.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const phone = await mobile.newPage();
phone.on('console', (message) => { if (['error', 'warning'].includes(message.type())) note('mobile:console', message.text().slice(0, 160)); });
await seedEntered(phone, { persona: 'operator' });
for (const route of MOBILE_ROUTES) {
  await phone.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await settle(phone);
  await scan(phone, `mobile:${route}`);
  const escapes = await phone.evaluate(() => [...document.querySelectorAll('a[href*="view=desktop"]')].filter((a) => !a.classList.contains('button')).map((a) => `${a.textContent.trim().slice(0, 40)} → ${a.getAttribute('href')}`));
  for (const escape of escapes) note(`mobile:${route}`, `row escapes to desktop: ${escape}`);
}
await mobile.close();
await browser.close();
report('white-glove sweep', issues, `${screens} screens`);
