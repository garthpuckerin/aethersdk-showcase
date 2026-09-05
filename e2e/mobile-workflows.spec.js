import { test, expect } from '@playwright/test';
import { ENGINE_TIMEOUT, enterCockpit } from './helpers';

test.describe('phone companion signature workflows', () => {
  test.skip((_, testInfo) => testInfo.project.name !== 'mobile', 'Mobile companion only');

  test('recovers a failed nightly run from the phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterCockpit(page, { persona: 'operator' }).catch(async () => {
      // Demo controls live on the desktop shell; on the phone use More.
    });
    await page.goto('/mobile/runs');
    await page.getByRole('button', { name: 'Failed' }).click();
    const firstFailed = page.locator('.mobile-record').first();
    await expect(firstFailed).toBeVisible();
    await firstFailed.click();
    await expect(page.getByRole('button', { name: 'Retry failed target only' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry failed target only' }).click();
    await expect(page.getByLabel('Status: Success').first()).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await expect(page.getByRole('button', { name: 'Retry failed target only' })).toHaveCount(0);
  });

  test('replays the seeded dead letter from the recovery queue', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterCockpit(page);
    await page.getByRole('link', { name: 'Queue' }).click();
    const card = page.getByTestId('mobile-dlq-dlq_hist_1');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Replay dead letter' }).click();
    await expect(page.getByTestId('mobile-dlq-dlq_hist_1')).toHaveCount(0);
    await expect(page.getByText(/replayed/i).first()).toBeVisible();
  });

  test('validates a connector and stays on the companion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterCockpit(page);
    await page.goto('/mobile/integrations/con_linkedin');
    await page.getByRole('button', { name: 'Validate credential reference' }).click();
    await expect(page.getByLabel('Status: Healthy').first()).toBeVisible();
    await expect(page).toHaveURL(/\/mobile\/integrations\/con_linkedin/);
  });
});
