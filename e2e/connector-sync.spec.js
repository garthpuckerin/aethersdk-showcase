import { test, expect } from '@playwright/test';
import { completeSignatureRun, enterCockpit, startSignatureRun } from './helpers';

test('connector validation and governed sync retain canonical identities', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop operator workflow');
  await enterCockpit(page);
  await startSignatureRun(page);
  await expect(page.getByText('req_live_northstar_001')).toBeVisible();
  await expect(page.getByText('idem_live_northstar_001')).toBeVisible();
  await completeSignatureRun(page);
  await expect(page.getByTestId('identity-chain')).toContainText('evt_live_northstar_001');
  await expect(page.getByTestId('identity-chain')).toContainText('delivery_live_northstar_001');
});
