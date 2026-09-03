import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { assertCaptureResult, redactSensitive } from './capture-reveal.mjs';
import { assertLiveSweepResult } from './live-sweep.mjs';

const RELEASE_PATTERN = /^[a-f0-9]{40}$/i;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Invalid argument near ${key ?? 'end of command'}`);
    args[key.slice(2)] = value;
  }
  for (const key of ['release', 'deployment', 'url', 'input', 'output']) if (!args[key]) throw new Error(`Missing --${key}`);
  return args;
}

function normalize(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
}

export function assertAllowedDirtyPaths(paths, input, output) {
  const boundary = normalize(input);
  const outputPath = normalize(output);
  const invalid = paths.map(normalize).filter((path) => path !== outputPath && path !== boundary && !path.startsWith(`${boundary}/`));
  if (invalid.length) throw new Error(`Dirty path outside reveal evidence boundary: ${invalid.join(', ')}`);
  return true;
}

export function assertRevealManifest(manifest) {
  if (!RELEASE_PATTERN.test(manifest?.releaseSha ?? '')) throw new Error('Invalid release SHA');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,}$/.test(manifest?.deploymentId ?? '')) throw new Error('Invalid deployment ID');
  let deploymentUrl;
  try {
    deploymentUrl = new URL(manifest.deploymentUrl);
  } catch {
    throw new Error('Invalid deployment HTTPS URL');
  }
  if (deploymentUrl.protocol !== 'https:') throw new Error('Deployment URL must use HTTPS');
  if (Number.isNaN(Date.parse(manifest.createdAt))) throw new Error('Invalid manifest createdAt');
  if (manifest.robotsProtected !== true) throw new Error('Robots protection must remain enabled');
  for (const field of ['commands', 'sweeps', 'captures']) if (!Array.isArray(manifest[field]) || !manifest[field].length) throw new Error(`Manifest ${field} must be non-empty`);
  return manifest;
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function dirtyPaths(cwd) {
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd, encoding: 'utf8' });
  return raw.split('\0').filter(Boolean).map((entry) => entry.slice(3));
}

function repositoryRelative(root, path) {
  const candidate = normalize(relative(root, resolve(path)));
  if (!candidate || candidate === '..' || candidate.startsWith('../')) throw new Error('Evidence path must be inside the repository');
  return candidate;
}

export async function writeRevealManifest({ release, deployment, url, input, output }) {
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const head = git(root, ['rev-parse', 'HEAD']);
  if (!RELEASE_PATTERN.test(release) || head.toLowerCase() !== release.toLowerCase()) throw new Error(`Release SHA does not match checkout HEAD (${head})`);
  const inputRelative = repositoryRelative(root, input);
  const outputRelative = repositoryRelative(root, output);
  assertAllowedDirtyPaths(dirtyPaths(root), inputRelative, outputRelative);

  const sweepPath = resolve(input, 'live-sweep.json');
  const capturePath = resolve(input, 'captures', 'capture-result.json');
  const sweep = assertLiveSweepResult(JSON.parse(await readFile(sweepPath, 'utf8')));
  const captures = assertCaptureResult(JSON.parse(await readFile(capturePath, 'utf8')));
  const normalizedUrl = new URL(url).href;
  if (new URL(sweep.sourceUrl).href !== normalizedUrl || new URL(captures.sourceUrl).href !== normalizedUrl) throw new Error('Deployment URL does not match sweep/capture evidence');

  const manifest = assertRevealManifest({
    releaseSha: release.toLowerCase(),
    deploymentId: deployment,
    deploymentUrl: normalizedUrl,
    createdAt: new Date().toISOString(),
    robotsProtected: sweep.robotsProtected,
    commands: [
      'npm run verify',
      'npm run test:e2e',
      'npm run sweep:live -- --url <redacted-deployment-url>',
      'npm run capture -- --url <redacted-deployment-url>',
    ],
    sweeps: [normalize(relative(dirname(resolve(output)), sweepPath))],
    captures: [normalize(relative(dirname(resolve(output)), capturePath)), ...captures.captures.map(({ file }) => normalize(relative(dirname(resolve(output)), resolve(input, 'captures', file))))],
  });
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  writeRevealManifest(parseArgs(process.argv.slice(2)))
    .then((manifest) => console.log(`Manifest written for ${manifest.releaseSha} and ${manifest.deploymentId}`))
    .catch((error) => {
      console.error(redactSensitive(error.stack ?? error.message));
      process.exitCode = 1;
    });
}
