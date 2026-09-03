import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

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
];

for (const file of listed) {
  const text = readText(join(root, file));
  if (text == null) continue;
  for (const [label, pattern] of secretPatterns) if (pattern.test(text)) violations.push(`${file}: ${label}`);
}

function filesBelow(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? filesBelow(join(path, entry.name)) : [join(path, entry.name)]);
}

const publicRoots = ['src', 'public', 'index.html', 'README.md', 'ARCHITECTURE.md', 'dist'];
const publicFiles = publicRoots.flatMap((entry) => {
  const path = join(root, entry);
  return existsSync(path) && statSync(path).isDirectory() ? filesBelow(path) : [path];
});
const surfacePatterns = [
  ['personal absolute path', /(?:[A-Z]:\\Users\\|[A-Z]:\\|\/(?:Users|home)\/)[^\s"']+/i],
  ['unrevealed sibling project name', /\b(?:a-sibling-project|a-sibling-project|a-sibling-project|accordingto-capital)\b/i],
  ['misleading production claim', /\b(?:production-ready|connected to production|live customer data)\b/i],
];

for (const path of publicFiles) {
  const text = readText(path);
  if (text == null) continue;
  for (const [label, pattern] of surfacePatterns) if (pattern.test(text)) violations.push(`${relative(root, path)}: ${label}`);
}

if (violations.length) {
  console.error(`Public-safety scan failed:\n${[...new Set(violations)].join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Public-safety scan passed across ${listed.length} repository files and ${publicFiles.length} public-surface files.`);
}
