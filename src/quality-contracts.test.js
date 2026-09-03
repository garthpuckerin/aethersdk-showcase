import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import React, { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { assertSweepResult } from '../scripts/sweep-schema.mjs';
import Dialog from './components/Dialog';

async function filesBelow(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesBelow(join(directory, entry.name), extension) : [join(directory, entry.name)]));
  return nested.flat().filter((file) => file.endsWith(extension));
}

describe('executable showcase quality contracts', () => {
  it('keeps literal colors in the token layer', async () => {
    const cssFiles = (await filesBelow('src', '.css')).filter((file) => !file.endsWith('tokens.css'));
    const violations = cssFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/#[\da-f]{3,8}|\b(?:rgb|hsl)a?\(/gi)].map((match) => `${file}:${match[0]}`));
    expect(violations).toEqual([]);
  });

  it('keeps calendar facts in fixtures and presentation claims out of feature code', async () => {
    const sourceFiles = (await filesBelow('src/features', '.jsx')).filter((file) => !file.endsWith('.test.jsx'));
    const violations = sourceFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/20\d{2}-\d{2}-\d{2}|\b\d{1,3}(?:,\d{3})+\b|\b99\.\d+%|\bproduction-ready\b/gi)].map((match) => `${file}:${match[0]}`));
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
