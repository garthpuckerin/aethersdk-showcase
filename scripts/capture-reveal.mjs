import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

export const CAPTURE_SPECS = [
  { id: 'desktop-overview', route: '/app/overview', width: 1440, height: 1100, mode: 'overview' },
  { id: 'mobile-companion', route: '/m', width: 390, height: 844, mode: 'overview' },
  { id: 'workflow-run', route: '/app/integrations', width: 1440, height: 1100, mode: 'run' },
  { id: 'workflow-recovery', route: '/app/integrations', width: 1440, height: 1100, mode: 'recovery' },
  { id: 'og', route: '/app/overview', width: 1200, height: 630, mode: 'overview' },
  { id: 'preview', route: '/app/overview', width: 960, height: 600, mode: 'overview' },
  { id: 'teaser', route: '/app/overview', width: 1080, height: 1350, mode: 'overview' },
];

export function redactSensitive(value, secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '') {
  let text = String(value);
  if (secret) text = text.split(secret).join('[REDACTED]');
  return text
    .replace(/[A-Z]:\\Users\\[^\\\s]+(?:\\[^\s]*)?/gi, '[REDACTED_PATH]')
    .replace(/\/(?:Users|home)\/[^/\s]+(?:\/[^\s]*)?/gi, '[REDACTED_PATH]');
}

function isLocalUrl(url) {
  return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
}

function automationHeaders(url) {
  if (isLocalUrl(url)) return {};
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is required for a protected remote deployment');
  return {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'true',
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Invalid argument near ${key ?? 'end of command'}`);
    args[key.slice(2)] = value;
  }
  if (!args.url || !args.out) throw new Error('Usage: capture-reveal.mjs --url <url> --out <directory>');
  return args;
}

async function seedSession(context) {
  await context.addInitScript(() => {
    sessionStorage.setItem('aether-demo-entered', 'true');
    localStorage.setItem('aether-onboarding-complete', 'true');
    localStorage.setItem('aether-persona', 'admin');
  });
}

async function driveSignatureRun(page, baseUrl) {
  await page.goto(new URL('/app/integrations', baseUrl).href, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'View Salesforce CRM' }).click();
  await page.getByRole('button', { name: 'Validate credential reference' }).click();
  await page.getByRole('button', { name: 'Start governed sync' }).click();
  for (const stage of ['authorization', 'fetch', 'normalization', 'match', 'provider write']) {
    await page.getByRole('button', { name: `Advance to ${stage}` }).click();
  }
  await page.getByRole('button', { name: 'Simulate one target failure' }).click();
  await page.getByRole('button', { name: 'Retry failed target only' }).click();
  await page.getByRole('button', { name: 'Advance to audit' }).click();
  await page.getByRole('button', { name: 'Advance to webhook' }).click();
}

async function prepareCapture(page, spec, baseUrl) {
  if (spec.mode === 'overview') {
    await page.goto(new URL(spec.route, baseUrl).href, { waitUntil: 'networkidle' });
    return;
  }
  await driveSignatureRun(page, baseUrl);
  if (spec.mode === 'recovery') {
    await page.getByRole('link', { name: /open related audit event/i }).click();
    await page.getByRole('link', { name: 'View delivery' }).click();
    const drawer = page.getByRole('dialog', { name: 'delivery_live_northstar_001' });
    await drawer.getByRole('button', { name: 'Send next simulated attempt' }).click();
    await drawer.getByRole('button', { name: 'Send next simulated attempt' }).click();
    await drawer.getByRole('button', { name: 'Move exhausted delivery to DLQ' }).click();
  }
}

async function digestFile(path) {
  const bytes = await readFile(path);
  return { bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function assertCaptureResult(result) {
  if (result?.schemaVersion !== 1) throw new Error('Invalid capture schemaVersion');
  if (Number.isNaN(Date.parse(result.capturedAt))) throw new Error('Invalid capturedAt');
  const byId = new Map((result.captures ?? []).map((capture) => [capture.id, capture]));
  for (const spec of CAPTURE_SPECS) {
    const capture = byId.get(spec.id);
    if (!capture) throw new Error(`Missing required capture: ${spec.id}`);
    if (capture.bytes <= 0) throw new Error(`Empty capture: ${spec.id}`);
    if (!HASH_PATTERN.test(capture.sha256)) throw new Error(`Invalid capture hash: ${spec.id}`);
    if (capture.width !== spec.width || capture.height !== spec.height) throw new Error(`Invalid capture dimensions: ${spec.id}`);
  }
  return result;
}

export async function captureReveal({ url, out }) {
  const baseUrl = new URL(url).href;
  const outputDirectory = resolve(out);
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  const captures = [];
  try {
    for (const spec of CAPTURE_SPECS) {
      const context = await browser.newContext({
        viewport: { width: spec.width, height: spec.height },
        extraHTTPHeaders: automationHeaders(baseUrl),
      });
      await seedSession(context);
      const page = await context.newPage();
      await prepareCapture(page, spec, baseUrl);
      const raw = await page.screenshot({ fullPage: spec.id === 'desktop-overview' || spec.id === 'mobile-companion' });
      const file = join(outputDirectory, `${spec.id}.webp`);
      await sharp(raw).resize(spec.width, spec.height, { fit: 'cover', position: 'top' }).webp({ quality: 88 }).toFile(file);
      const digest = await digestFile(file);
      captures.push({ id: spec.id, route: spec.route, file: basename(file), width: spec.width, height: spec.height, ...digest });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const result = assertCaptureResult({ schemaVersion: 1, capturedAt: new Date().toISOString(), sourceUrl: baseUrl, captures });
  await writeFile(join(outputDirectory, 'capture-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  return { ...result, outputDirectory: relative(process.cwd(), outputDirectory) };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  captureReveal(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(`Captured ${result.captures.length} reveal assets in ${redactSensitive(result.outputDirectory)}`))
    .catch((error) => {
      console.error(redactSensitive(error.stack ?? error.message));
      process.exitCode = 1;
    });
}
