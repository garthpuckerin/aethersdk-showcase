import { expect } from '@playwright/test';

export async function enterCockpit(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Launch demo' }).first().click();
  await page.getByRole('button', { name: 'Skip onboarding' }).click();
  await expect(page.getByText('Portfolio demo · mock data').first()).toBeVisible();
}

export async function startSignatureRun(page) {
  await page.getByRole('link', { name: 'Integrations', exact: true }).click();
  await page.getByRole('button', { name: 'View Salesforce CRM' }).click();
  await page.getByRole('button', { name: 'Validate credential reference' }).click();
  await page.getByRole('button', { name: 'Start governed sync' }).click();
  await expect(page.getByRole('heading', { name: 'run_live_northstar_001' })).toBeVisible();
}

export async function completeSignatureRun(page) {
  for (const stage of ['authorization', 'fetch', 'normalization', 'match', 'provider write']) await page.getByRole('button', { name: `Advance to ${stage}` }).click();
  await page.getByRole('button', { name: 'Simulate one target failure' }).click();
  await page.getByRole('button', { name: 'Retry failed target only' }).click();
  await page.getByRole('button', { name: 'Advance to audit' }).click();
  await page.getByRole('button', { name: 'Advance to webhook' }).click();
}
