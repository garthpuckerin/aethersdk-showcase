import { test, expect } from '@playwright/test';

test('fresh launch explains the boundary and completes onboarding', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the seams between systems/i })).toBeVisible();
  await page.getByRole('button', { name: 'Launch demo' }).first().click();
  await expect(page.getByRole('dialog', { name: 'What this demo is' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /integration operator/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Enter cockpit' }).click();
  await expect(page.getByText('Portfolio demo · mock data').first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aether-persona'))).toBe('operator');
  if (testInfo.project.name === 'mobile') await expect(page.getByRole('heading', { name: 'Operations pulse' })).toBeVisible();
  else await expect(page.getByRole('button', { name: 'Demo controls' })).toContainText('Integration Operator');
});
