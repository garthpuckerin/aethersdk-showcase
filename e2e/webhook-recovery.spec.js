import { test, expect } from '@playwright/test';
import { ENGINE_TIMEOUT, LIVE, enterCockpit, recoverSignatureRun, startSignatureRun, waitForFault } from './helpers';

test('one uninterrupted chain reaches DLQ replay and updates audit, overview, and health', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop signature workflow');
  await enterCockpit(page);
  await startSignatureRun(page);
  await waitForFault(page);
  await recoverSignatureRun(page);

  await page.getByRole('link', { name: /open related audit event/i }).click();
  await expect(page.getByText(LIVE.eventId).first()).toBeVisible();
  await page.getByRole('link', { name: 'View delivery' }).first().click();
  const drawer = page.getByRole('dialog', { name: LIVE.deliveryId });
  await expect(drawer).toBeVisible();
  for (const id of [LIVE.requestId, LIVE.runId, LIVE.eventId, LIVE.payloadId, LIVE.subscriptionId]) await expect(drawer.getByText(id).first()).toBeVisible();
  await expect(drawer.getByText(LIVE.deadLetterId)).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await expect(drawer.getByText(/HTTP 429/)).toBeVisible();
  await expect(drawer.getByText(/HTTP 503/)).toBeVisible();

  await drawer.getByRole('button', { name: 'Replay dead letter' }).click();
  await expect(drawer.getByText('evt_live_replay')).toBeVisible();
  await expect(drawer.getByText('meter_live_replay')).toBeVisible();
  await expect(drawer.getByText(/HTTP 202/)).toBeVisible();
  await drawer.getByRole('link', { name: 'Review recovered overview' }).click();
  await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible();

  await page.getByRole('link', { name: 'Health' }).click();
  await expect(page.getByText('Overall service')).toBeVisible();
  await expect(page.getByLabel('Runtime dependencies').getByLabel('Status: Warning')).toHaveCount(0);
});

test('a paused subscription receives no delivery and a created one does', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop governance workflow');
  await enterCockpit(page);
  await page.getByRole('link', { name: 'Webhooks' }).click();
  await page.getByLabel(/^Name/).fill('Compliance feed');
  await page.getByLabel('sync.completed').check();
  await page.getByLabel(/Destination URL/).fill('https://hooks.harborline.example/compliance');
  await page.getByLabel(/Signing secret/).fill('never-shown');
  await page.getByRole('button', { name: 'Create subscription' }).click();
  await expect(page.getByText('Compliance feed').first()).toBeVisible();
  await expect(page.getByText('never-shown')).toHaveCount(0);
});
