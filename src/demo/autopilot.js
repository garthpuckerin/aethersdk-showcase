/* The workflow engine of the demo. It is deliberately pure: given the state it
   returns the single next action a real runtime would perform on its own — a
   run advancing through its stages, a webhook delivery retrying and finally
   exhausting — and how long a believable runtime would take to do it.
   Human verbs (retry, replay, validate) are never produced here. */
import { ACTIONS, nextStage } from './reducer.js';

export const STAGE_DELAY_MS = 750;
export const ATTEMPT_DELAY_MS = 1_400;
export const MAX_DELIVERY_ATTEMPTS = 2;

export function nextAutopilotAction(state) {
  for (const runId of state.runOrder) {
    const run = state.runs[runId];
    if (!run || run.tenantId !== state.activeTenantId) continue;
    if (run.status !== 'running' || run.stage === 'complete') continue;
    if (!run.faultConnectorId && !run.stageAt && run.stage === 'provider_write') continue; // seeded in-flight run stays as ambience
    const stage = nextStage(run.stage);
    if (!stage) continue;
    return { action: { type: ACTIONS.ADVANCE_RUN_STAGE, runId: run.id, stage }, delayMs: STAGE_DELAY_MS, reason: `run ${run.id} → ${stage}` };
  }

  for (const deliveryId of state.deliveryOrder) {
    const delivery = state.deliveries[deliveryId];
    if (!delivery || delivery.tenantId !== state.activeTenantId || delivery.status !== 'retrying') continue;
    if (delivery.attemptIds.length < MAX_DELIVERY_ATTEMPTS) {
      return { action: { type: ACTIONS.ADVANCE_DELIVERY_ATTEMPT, deliveryId: delivery.id }, delayMs: ATTEMPT_DELAY_MS, reason: `delivery ${delivery.id} attempt ${delivery.attemptIds.length + 1}` };
    }
    return { action: { type: ACTIONS.EXHAUST_DELIVERY, deliveryId: delivery.id }, delayMs: ATTEMPT_DELAY_MS, reason: `delivery ${delivery.id} exhausted` };
  }

  return null;
}

/* Drive the engine to quiescence synchronously (tests, "Step to end"). */
export function runToQuiescence(reducer, state, { limit = 200, at } = {}) {
  let current = state;
  for (let index = 0; index < limit; index += 1) {
    const step = nextAutopilotAction(current);
    if (!step) return current;
    current = reducer(current, at ? { ...step.action, at } : step.action);
  }
  return current;
}
