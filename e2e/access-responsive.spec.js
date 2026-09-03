import { test, expect } from '@playwright/test';
import { enterCockpit } from './helpers';

test('role changes govern navigation, deep links, commands, and saved appearance', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop authorization workflow');
  await enterCockpit(page);
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByLabel('Persona').selectOption('auditor');
  await expect(page.getByRole('link', { name: 'Access' })).toHaveCount(0);
  await page.goto('/app/access');
  await expect(page.getByRole('heading', { name: 'Permission required' })).toBeVisible();
  await expect(page.getByText(/access:view/)).toBeVisible();
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByLabel('Persona').selectOption('admin');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.getByRole('button', { name: 'Dense display' }).click();
  await page.getByRole('button', { name: 'Close Demo controls' }).click();
  await page.getByRole('button', { name: 'Search and commands' }).click();
  await page.getByRole('searchbox').fill('webhooks');
  await page.getByRole('option', { name: /webhooks/i }).click();
  await expect(page.getByRole('heading', { name: 'Webhooks & recovery' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'dense');
});

test('mobile auto-routing and desktop escape respect the 767px boundary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile routing workflow');
  await enterCockpit(page);
  await expect(page.getByRole('heading', { name: 'Operations pulse' })).toBeVisible();
  await page.getByRole('link', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Open full desktop console' }).click();
  await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
});
