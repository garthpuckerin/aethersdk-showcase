import { test, expect } from '@playwright/test';
import { ENGINE_TIMEOUT, LIVE, enterCockpit, recoverSignatureRun, startSignatureRun, waitForFault } from './helpers';

test('connector validation and governed sync retain canonical identities through a faulted fan-out', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop operator workflow');
  await enterCockpit(page);
  await startSignatureRun(page);
  await expect(page.getByText(LIVE.requestId).first()).toBeVisible();
  await expect(page.getByText(LIVE.idempotencyKey).first()).toBeVisible();

  // The engine runs the stages itself and stops at the Axonify fault.
  await waitForFault(page);
  const outcomes = page.getByRole('table', { name: /target outcomes/i });
  await expect(outcomes).toContainText('Axonify');
  await expect(outcomes).toContainText('PROVIDER_RATE_LIMIT');
  await expect(outcomes.getByLabel('Status: Success')).toHaveCount(2);
  await expect(outcomes.getByLabel('Status: Failed')).toHaveCount(1);

  await recoverSignatureRun(page);
  await expect(outcomes.getByLabel('Status: Success')).toHaveCount(3);
  await expect(page.getByText(/governed sync complete/i)).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await expect(page.getByText(LIVE.idempotencyKey).first()).toBeVisible();
});

test('the workflow survives a page reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop operator workflow');
  await enterCockpit(page);
  await startSignatureRun(page);
  await waitForFault(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: LIVE.runId })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry failed target only' })).toBeVisible();
});
