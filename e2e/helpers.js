import { expect } from '@playwright/test';

export const LIVE = {
  runId: 'run_live_harborline_001',
  requestId: 'req_live_harborline_001',
  idempotencyKey: 'idem_live_harborline_001',
  eventId: 'evt_live_harborline_001',
  deliveryId: 'delivery_live_harborline_001',
  deadLetterId: 'dlq_live_harborline_001',
  payloadId: 'payload_live_harborline_001',
  subscriptionId: 'sub_hr',
};

/* The autopilot advances a stage every ~750ms and a delivery attempt every
   ~1.4s, so workflow assertions wait generously. */
export const ENGINE_TIMEOUT = 20_000;

export async function enterCockpit(page, { persona } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Launch demo' }).first().click();
  await page.getByRole('button', { name: 'Skip onboarding' }).click();
  await expect(page.getByText('Portfolio demo · mock data').first()).toBeVisible();
  if (persona) await switchPersona(page, persona);
}

export async function switchPersona(page, persona) {
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByLabel('Persona').selectOption(persona);
  await page.getByRole('button', { name: 'Close Demo controls' }).click();
}

/* Validate UKG and start the new-hire provisioning fan-out; the engine takes
   it to the deterministic Axonify fault. */
export async function startSignatureRun(page) {
  await page.getByRole('link', { name: /^Integrations/ }).first().click();
  await page.getByRole('button', { name: 'View UKG Pro · People' }).click();
  await page.getByRole('button', { name: 'Validate credential reference' }).click();
  await page.getByRole('button', { name: 'Start governed sync' }).click();
  await expect(page.getByRole('heading', { name: LIVE.runId })).toBeVisible();
}

export async function waitForFault(page) {
  await expect(page.getByRole('button', { name: 'Retry failed target only' })).toBeVisible({ timeout: ENGINE_TIMEOUT });
}

/* Retry the failed target and let the engine finish the run, create the
   audit event and delivery, and exhaust the live delivery into its dead letter. */
export async function recoverSignatureRun(page) {
  await page.getByRole('button', { name: 'Retry failed target only' }).click();
  const chain = page.getByTestId('identity-chain');
  await expect(chain).toContainText(LIVE.eventId, { timeout: ENGINE_TIMEOUT });
  await expect(chain).toContainText(LIVE.deliveryId, { timeout: ENGINE_TIMEOUT });
  await expect(chain).toContainText(LIVE.deadLetterId, { timeout: ENGINE_TIMEOUT });
}
