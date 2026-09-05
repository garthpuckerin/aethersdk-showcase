import { test, expect } from '@playwright/test';

test('runtime stays same-origin, asset-complete, and console-clean', async ({ page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  const external = [];
  const consoleProblems = [];
  const failed = [];
  page.on('request', (request) => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  page.on('console', (message) => { if (['warning', 'error'].includes(message.type())) consoleProblems.push(message.text()); });
  page.on('pageerror', (error) => consoleProblems.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the seams between systems/i })).toBeVisible();
  await page.getByRole('button', { name: 'Launch demo' }).first().click();
  await page.getByRole('button', { name: 'Skip onboarding' }).click();
  await page.reload();
  await expect(page.getByText('Portfolio demo · mock data').first()).toBeVisible();
  expect(external).toEqual([]);
  expect(consoleProblems).toEqual([]);
  expect(failed).toEqual([]);
});
