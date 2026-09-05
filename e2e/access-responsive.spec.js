import { test, expect } from '@playwright/test';
import { enterCockpit, switchPersona } from './helpers';

test('role changes govern navigation, deep links, records, commands, and saved appearance', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop authorization workflow');
  await enterCockpit(page);
  await switchPersona(page, 'auditor');
  await expect(page.getByRole('link', { name: 'Access' })).toHaveCount(0);
  await page.goto('/app/access');
  await expect(page.getByRole('heading', { name: 'Permission required' })).toBeVisible();
  await expect(page.getByText(/access:view/)).toBeVisible();

  // The developer persona is scoped to the two learning connectors it is granted.
  await switchPersona(page, 'developer');
  await page.getByRole('link', { name: /^Integrations/ }).first().click();
  await expect(page.getByRole('button', { name: 'View Docebo LMS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View UKG Pro · People' })).toHaveCount(0);

  await switchPersona(page, 'admin');
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.getByRole('button', { name: 'Dense display' }).click();
  await page.getByRole('button', { name: 'Close Demo controls' }).click();
  await page.getByRole('button', { name: 'Search and commands' }).click();
  const palette = page.getByRole('dialog', { name: 'Search and commands' });
  await palette.getByRole('searchbox').fill('webhooks');
  await palette.getByRole('option', { name: /^webhooks/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Webhooks & recovery' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'dense');
});

test('mobile auto-routing, bottom tabs, and the explicit desktop escape respect the 767px boundary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile routing workflow');
  await page.setViewportSize({ width: 390, height: 844 });
  await enterCockpit(page);
  await expect(page.getByRole('heading', { name: 'Operations pulse' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Companion' });
  await expect(nav.getByRole('link')).toHaveCount(4);
  const navigationBox = await nav.boundingBox();
  const activeRunBox = await page.getByRole('link', { name: /open active run/i }).boundingBox();
  expect(navigationBox.y).toBeGreaterThanOrEqual(activeRunBox.y + activeRunBox.height);
  // No row on the phone home escapes to the desktop console.
  await expect(page.locator('.mobile-main a[href*="view=desktop"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Open full desktop console' }).click();
  await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
});
