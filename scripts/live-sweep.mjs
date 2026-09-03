import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { redactSensitive } from './capture-reveal.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

export const REQUIRED_ROUTES = [
  '/',
  '/app/overview',
  '/app/integrations',
  '/app/runs',
  '/app/runs/run_hist_01',
  '/app/webhooks',
  '/app/audit',
  '/app/access',
  '/app/health',
  '/app/settings',
  '/m',
  '/m/runs/run_hist_01',
  '/m/more',
];

export const REQUIRED_VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1024', width: 1024, height: 900 },
  { name: 'boundary-768', width: 768, height: 1024 },
  { name: 'boundary-767', width: 767, height: 1024 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-320', width: 320, height: 700 },
  { name: 'tablet-landscape', width: 1024, height: 768, orientation: 'landscape' },
  { name: 'phone-landscape', width: 844, height: 390, orientation: 'landscape' },
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Invalid argument near ${key ?? 'end of command'}`);
    args[key.slice(2)] = value;
  }
  if (!args.url || !args.out) throw new Error('Usage: live-sweep.mjs --url <url> --out <directory>');
  return args;
}

function isLocalUrl(url) {
  return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
}

function automationHeaders(url) {
  if (isLocalUrl(url)) return {};
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is required for a protected remote deployment');
  return { 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' };
}

function requireEmpty(page, field, label) {
  if (page[field]?.length) throw new Error(`${label} detected for ${page.route} at ${page.viewport}`);
}

export function assertLiveSweepResult(result) {
  if (result?.schemaVersion !== 1) throw new Error('Invalid live-sweep schemaVersion');
  if (Number.isNaN(Date.parse(result.checkedAt))) throw new Error('Invalid checkedAt');
  if (!result.robotsProtected || !result.crawler?.noindexMeta || !result.crawler?.robotsHeader) throw new Error('Robots protection is incomplete');
  if (!result.crawler?.sitemapExcluded || result.crawler?.htmlHasSpoilers) throw new Error('Crawler surface is unsafe');
  const keys = new Set((result.pages ?? []).map((page) => `${page.route}|${page.viewport}`));
  for (const route of REQUIRED_ROUTES) {
    for (const viewport of REQUIRED_VIEWPORTS) {
      if (!keys.has(`${route}|${viewport.name}`)) throw new Error(`Incomplete route/viewport matrix: ${route} at ${viewport.name}`);
    }
  }
  for (const page of result.pages) {
    if (page.status < 200 || page.status >= 400) throw new Error(`Failed page response for ${page.route}`);
    if (page.cls > 0.1) throw new Error(`CLS threshold exceeded for ${page.route}`);
    if (page.bodyOverflow) throw new Error(`Body overflow detected for ${page.route}`);
    if (!page.focusEscapePassed) throw new Error(`Focus/Escape behavior failed for ${page.route}`);
    requireEmpty(page, 'consoleErrors', 'Console error');
    requireEmpty(page, 'consoleWarnings', 'Console warning');
    requireEmpty(page, 'pageErrors', 'Page error');
    requireEmpty(page, 'externalRequests', 'External request');
    requireEmpty(page, 'failedResponses', 'Failed response');
    requireEmpty(page, 'missingAssets', 'Missing asset');
  }
  if (!result.assets?.length || result.assets.some((asset) => asset.bytes <= 0 || !HASH_PATTERN.test(asset.sha256))) throw new Error('Invalid or empty asset evidence');
  return result;
}

async function shaResponse(response) {
  try {
    const body = await response.body();
    return { url: new URL(response.url()).pathname, bytes: body.byteLength, sha256: createHash('sha256').update(body).digest('hex') };
  } catch {
    return null;
  }
}

async function inspectFocusEscape(page) {
  const trigger = page.getByRole('button', { name: 'Demo controls' });
  if (!(await trigger.count()) || !(await trigger.isVisible())) return true;
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Demo controls' });
  if (!(await dialog.isVisible())) return false;
  await page.keyboard.press('Escape');
  return !(await dialog.isVisible()) && (await trigger.evaluate((element) => element === document.activeElement));
}

async function inspectPage(browser, baseUrl, route, viewport, headers, assetMap) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, extraHTTPHeaders: headers });
  await context.addInitScript(() => {
    sessionStorage.setItem('aether-demo-entered', 'true');
    localStorage.setItem('aether-onboarding-complete', 'true');
    localStorage.setItem('aether-persona', 'admin');
    window.__aetherCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__aetherCls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const externalRequests = [];
  const failedResponses = [];
  const missingAssets = [];
  const assetTasks = [];
  const baseOrigin = new URL(baseUrl).origin;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(redactSensitive(message.text()));
    if (message.type() === 'warning') consoleWarnings.push(redactSensitive(message.text()));
  });
  page.on('pageerror', (error) => pageErrors.push(redactSensitive(error.message)));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== baseOrigin) externalRequests.push(redactSensitive(request.url()));
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
    if (response.request().resourceType() !== 'document' && response.status() >= 200 && response.status() < 400) {
      assetTasks.push(shaResponse(response).then((asset) => {
        if (asset) assetMap.set(`${asset.url}:${asset.sha256}`, asset);
        if (!asset || asset.bytes <= 0) missingAssets.push(new URL(response.url()).pathname);
      }));
    }
  });

  let response;
  try {
    response = await page.goto(new URL(route, baseUrl).href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(100);
    await Promise.all(assetTasks);
    const [cls, bodyOverflow, focusEscapePassed] = await Promise.all([
      page.evaluate(() => window.__aetherCls ?? 0),
      page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
      inspectFocusEscape(page),
    ]);
    return {
      route,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      status: response?.status() ?? 0,
      cls,
      bodyOverflow,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      externalRequests,
      failedResponses,
      missingAssets,
      focusEscapePassed,
      title: await page.title(),
      description: await page.locator('meta[name="description"]').getAttribute('content'),
    };
  } finally {
    await context.close();
  }
}

async function inspectCrawler(baseUrl, headers) {
  const root = await fetch(baseUrl, { headers, redirect: 'follow' });
  const html = await root.text();
  const sitemap = await fetch(new URL('/sitemap.xml', baseUrl), { headers, redirect: 'follow' });
  const sitemapText = await sitemap.text();
  const header = root.headers.get('x-robots-tag') ?? '';
  return {
    noindexMeta: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
    robotsHeader: /noindex/i.test(header),
    sitemapExcluded: sitemap.status === 404 || !/<loc>/i.test(sitemapText),
    htmlHasSpoilers: /(?:docs\/superpowers|SOURCE_RECONCILIATION|localhost|127\.0\.0\.1)/i.test(html),
  };
}

export async function liveSweep({ url, out }) {
  const baseUrl = new URL(url).href;
  const headers = automationHeaders(baseUrl);
  const outputDirectory = resolve(out);
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  const pages = [];
  const assetMap = new Map();
  try {
    const jobs = REQUIRED_VIEWPORTS.flatMap((viewport) => REQUIRED_ROUTES.map((route) => ({ route, viewport })));
    for (let index = 0; index < jobs.length; index += 4) {
      const batch = jobs.slice(index, index + 4);
      pages.push(...await Promise.all(batch.map(({ route, viewport }) => inspectPage(browser, baseUrl, route, viewport, headers, assetMap))));
    }
  } finally {
    await browser.close();
  }
  const crawler = await inspectCrawler(baseUrl, headers);
  const result = assertLiveSweepResult({
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    sourceUrl: baseUrl,
    robotsProtected: crawler.noindexMeta && crawler.robotsHeader,
    crawler,
    pages,
    assets: [...assetMap.values()],
  });
  await writeFile(join(outputDirectory, 'live-sweep.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  liveSweep(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(`Live sweep passed: ${result.pages.length} route/viewport checks and ${result.assets.length} assets`))
    .catch((error) => {
      console.error(redactSensitive(error.stack ?? error.message));
      process.exitCode = 1;
    });
}
