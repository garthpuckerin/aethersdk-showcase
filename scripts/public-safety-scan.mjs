import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/* Public-safety scan — runs on every tracked/untracked-but-not-ignored file,
 * because this repository becomes public at the reveal and every committed
 * file is public then (BCSTANDARDS "Publish / spoiler discipline").
 *
 * Sealed sibling-project names are matched by SHA-256 of the lowercased word,
 * so this file can name none of them: a denylist in a public repo would itself
 * be the spoiler. Add a name with: node -e "console.log(require('node:crypto')
 * .createHash('sha256').update('name').digest('hex'))" — the list is the hub's
 * reveal schedule; remove a hash once that project has revealed. */
const root = process.cwd();
const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const textExtensions = new Set(['', '.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.toml', '.txt', '.yml', '.yaml']);
const violations = [];

function readText(path) {
  if (!existsSync(path) || !statSync(path).isFile() || !textExtensions.has(extname(path).toLowerCase())) return null;
  const buffer = readFileSync(path);
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

const secretPatterns = [
  ['private key material', new RegExp(['BEGIN', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY'].join(' '), 'i')],
  ['credential token', new RegExp(['(?:ghp|github_pat|sk-proj|xox[baprs])', '[A-Za-z0-9_-]{16,}'].join('_?'), 'i')],
  ['assigned secret', /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"']{8,}["']/i],
  ['authorization bearer', /authorization\s*[:=]\s*["']bearer\s+[A-Za-z0-9._-]{12,}/i],
  ['production endpoint', /https?:\/\/(?:api|prod|production|staging)\.[A-Za-z0-9.-]+/i],
  ['platform resource id', /\b(?:prj|dpl|team)_[A-Za-z0-9]{20,}\b/],
];

const surfacePatterns = [
  ['personal absolute path', /(?:[A-Z]:\\Users\\|[A-Z]:\\|\/(?:Users|home)\/)[^\s"'`)]+/i],
  ['misleading production claim', /\b(?:production-ready|connected to production|live customer data)\b/i],
];

// SHA-256 of each sealed name, lowercased. Never list the names here.
const sealedHashes = new Set([
  '850ca8e0ec3f2106b6a230cd36a86cf163b3b005dd2b6c94eafaf604cbdf03a8',
  'e7d20694029efd12783fe2029dce63be9901e9607af5cbfe66232f1937e66365',
  'cd6016b35a498b0ec541d8004d56202b33873a5803878f1a28fc196e711f3d94',
  '46b05499459ee36074658bc0d3736dfa6d65cc1bccfb82f58a45397cce1ccbdc',
  'ca82185edcf2519a8bd8762cc2d821512317576a19f3390340894c27473731d7',
  '70b53a654e4f901a02652c189b9f6540ae273def5d0f574706745f8440eb75c0',
  '46ed9d33d90fdaebdb21147c1058c15f0dd62c3ea70477e30653e58cdc919528',
  '7b2bc7397d9f5dde4d65d6a4c447b7f363ec0b4f35eb1bf2188ecdfe56ed0aa9',
]);
const sealedFile = join(root, '.public-safety.sealed.json');
if (existsSync(sealedFile)) {
  for (const hash of JSON.parse(readFileSync(sealedFile, 'utf8')).hashes ?? []) sealedHashes.add(hash);
}
const hash = (word) => createHash('sha256').update(word).digest('hex');

function sealedHits(text) {
  const hits = new Set();
  for (const match of text.matchAll(/[A-Za-z][A-Za-z0-9²-]{2,}/g)) {
    const word = match[0].toLowerCase().replace(/²/g, '2');
    if (sealedHashes.has(hash(word))) hits.add(word);
    const stripped = word.replace(/[-\d]+$/, '');
    if (stripped !== word && sealedHashes.has(hash(stripped))) hits.add(stripped);
  }
  return [...hits];
}

const SELF = 'scripts/public-safety-scan.mjs'; // its own pattern sources would match themselves

for (const file of listed) {
  if (file === '.public-safety.sealed.json') continue;
  const text = readText(join(root, file));
  if (text == null) continue;
  for (const [label, pattern] of secretPatterns) if (pattern.test(text)) violations.push(`${file}: ${label}`);
  if (file !== SELF) for (const [label, pattern] of surfacePatterns) if (pattern.test(text)) violations.push(`${file}: ${label}`);
  for (const word of sealedHits(text)) violations.push(`${file}: sealed sibling project name (${'*'.repeat(word.length)})`);
}

if (violations.length) {
  console.error(`Public-safety scan failed:\n${[...new Set(violations)].join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Public-safety scan passed across ${listed.length} repository files.`);
}
