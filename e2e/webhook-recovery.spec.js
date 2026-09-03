import { test, expect } from '@playwright/test';
import { completeSignatureRun, enterCockpit, startSignatureRun } from './helpers';

test('one uninterrupted chain reaches DLQ replay and updates overview and health', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop signature workflow');
  await enterCockpit(page);
  await startSignatureRun(page);
  await completeSignatureRun(page);
  await page.getByRole('link', { name: /open related audit event/i }).click();
  await expect(page.getByText('evt_live_northstar_001')).toBeVisible();
  await page.getByRole('link', { name: 'View delivery' }).click();
  const drawer = page.getByRole('dialog', { name: 'delivery_live_northstar_001' });
  for (const id of ['req_live_northstar_001', 'run_live_northstar_001', 'evt_live_northstar_001', 'payload_live_northstar_001', 'sub_ops']) await expect(drawer.getByText(id).first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Send next simulated attempt' }).click();
  await drawer.getByRole('button', { name: 'Send next simulated attempt' }).click();
  await drawer.getByRole('button', { name: 'Move exhausted delivery to DLQ' }).click();
  await expect(drawer.getByText('dlq_live_northstar_001')).toBeVisible();
  await drawer.getByRole('button', { name: 'Replay dead letter' }).click();
  await expect(drawer.getByText('evt_live_replay')).toBeVisible();
  await expect(drawer.getByText('meter_live_replay')).toBeVisible();
  await drawer.getByRole('link', { name: 'Review recovered overview' }).click();
  await expect(page.getByText('21 of 25 runs')).toBeVisible();
  await page.getByRole('link', { name: 'Health' }).click();
  await expect(page.getByText('Overall service')).toBeVisible();
  await expect(page.getByLabel('Runtime dependencies').getByLabel('Status: Warning')).toHaveCount(0);
});
