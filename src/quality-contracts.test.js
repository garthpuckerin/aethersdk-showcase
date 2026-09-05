import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import React, { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { assertSweepResult } from '../scripts/sweep-schema.mjs';
import Dialog from './components/Dialog';

const THIS_FILE = 'quality-contracts.test.js';
const DEMO_CONTROL = 'DemoControl.jsx';
const FORMATTERS = ['rel(', 'formatRelativeTime(', 'formatRelativeFuture(', 'formatDuration(', 'formatUptime(', 'hourLabel('];
const COLOUR_PROPERTY = /^(?:color|background|background-color|border|border-color|border-top|border-right|border-bottom|border-left|outline|outline-color|fill|stroke|box-shadow|accent-color|caret-color|text-decoration-color)$/;
const COLOUR_KEYWORDS = /^(?:none|transparent|inherit|currentcolor|initial|unset|0)$/i;

async function filesBelow(directory, extension) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesBelow(join(directory, entry.name), extension) : [join(directory, entry.name)]));
  return nested.flat().filter((file) => file.endsWith(extension));
}

const isTest = (file) => /\.test\.jsx?$/.test(file);

async function productJsx() {
  const files = await Promise.all([filesBelow('src/features', '.jsx'), filesBelow('src/app', '.jsx'), filesBelow('src/components', '.jsx')]);
  return files.flat().filter((file) => !isTest(file));
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

/* A shorthand like `1px solid var(--line)` is fine; a bare `1px solid` with no
   colour inherits currentColor, which is also token-driven. */
function paintsWithoutToken(value) {
  const trimmed = value.trim();
  if (trimmed.includes('var(--')) return false;
  if (COLOUR_KEYWORDS.test(trimmed)) return false;
  return !/^[\d.]+(?:px|rem|em)?\s+(?:solid|dashed|dotted)$/.test(trimmed);
}

describe('executable showcase quality contracts', () => {
  it('keeps literal colors in the token layer', async () => {
    const cssFiles = (await filesBelow('src', '.css')).filter((file) => !file.endsWith('tokens.css'));
    const violations = cssFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/#[\da-f]{3,8}|\b(?:rgb|hsl)a?\(/gi)].map((match) => `${file}:${match[0]}`));
    expect(violations).toEqual([]);
  });

  it('paints feature stylesheets only through design tokens', async () => {
    const files = await filesBelow('src/styles/features', '.css');
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)]
        .filter(([, property, value]) => COLOUR_PROPERTY.test(property) && paintsWithoutToken(value))
        .map(([match, property, value]) => `${file}:${lineOf(source, match.index)} ${property}: ${value.trim()}`);
    });
    expect(violations).toEqual([]);
  });

  it('keeps calendar facts in fixtures and presentation claims out of feature code', async () => {
    const sourceFiles = (await filesBelow('src/features', '.jsx')).filter((file) => !isTest(file));
    const violations = sourceFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/20\d{2}-\d{2}-\d{2}|\b\d{1,3}(?:,\d{3})+\b|\b99\.\d+%|\bproduction-ready\b/gi)].map((match) => `${file}:${match[0]}`));
    expect(violations).toEqual([]);
  });

  it('keeps engine verbs out of product screens', async () => {
    const files = (await productJsx()).filter((file) => basename(file) !== DEMO_CONTROL);
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/\bsimulate\b|\badvance to\b|\bsend next attempt\b/gi)].map((match) => `${file}:${lineOf(source, match.index)} "${match[0]}"`);
    });
    expect(violations).toEqual([]);
  });

  it('never renders a raw timestamp without a formatter', async () => {
    const files = await productJsx();
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/\{[a-zA-Z.?]*(?:At|Time)\}/g)]
        // `dateTime={iso}` and friends are attributes, not rendered text.
        .filter((match) => source[match.index - 1] !== '=')
        .filter((match) => !FORMATTERS.some((formatter) => source.slice(Math.max(0, match.index - 40), match.index).includes(formatter)))
        .map((match) => `${file}:${lineOf(source, match.index)} ${match[0]}`);
    });
    expect(violations).toEqual([]);
  });

  it('keeps console logging out of the source tree', async () => {
    const files = [...(await filesBelow('src', '.js')), ...(await filesBelow('src', '.jsx'))].filter((file) => basename(file) !== THIS_FILE);
    const pattern = new RegExp(['console', 'log\\('].join('\\.'), 'g');
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(pattern)].map((match) => `${file}:${lineOf(source, match.index)}`);
    });
    expect(violations).toEqual([]);
  });

  it('ships licenses for every self-hosted font', () => {
    expect(readFileSync('public/fonts/OFL-Hanken-Grotesk.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE');
    expect(readFileSync('public/fonts/OFL-JetBrains-Mono.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE');
  });

  it('keeps mock boundaries on landing, desktop, and mobile routes', () => {
    expect(readFileSync('src/features/landing/LandingPage.jsx', 'utf8')).toContain('Portfolio demo · mock data');
    expect(readFileSync('src/app/AppShell.jsx', 'utf8')).toContain('Portfolio demo · mock data');
    expect(readFileSync('src/app/MobileShell.jsx', 'utf8')).toContain('Portfolio demo · mock data');
  });

  it('closes dialogs with Escape and returns focus to their trigger', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef(null);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', { ref: triggerRef, onClick: () => setOpen(true) }, 'Open quality dialog'),
        React.createElement(Dialog, { open, onClose: () => setOpen(false), title: 'Quality dialog', returnFocusRef: triggerRef }, 'Contract content'),
      );
    }

    render(React.createElement(Harness));
    const trigger = screen.getByRole('button', { name: 'Open quality dialog' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Quality dialog' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('rejects invalid dated live-sweep evidence', () => {
    expect(() => assertSweepResult({ schemaVersion: 1, checkedAt: 'not-a-date', pages: [] })).toThrow(/checkedAt/);
    expect(() => assertSweepResult({ schemaVersion: 1, checkedAt: new Date().toISOString(), sourceUrl: 'https://example.test', pages: [{ path: '/', status: 200, consoleErrors: [], externalRequests: [], missingAssets: [] }] })).not.toThrow();
  });
});
