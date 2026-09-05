import { describe, expect, it } from 'vitest';
import { buildFaultedLiveState, buildState } from '../test/fixture-builders';
import { ATTEMPT_DELAY_MS, MAX_DELIVERY_ATTEMPTS, STAGE_DELAY_MS, nextAutopilotAction, runToQuiescence } from './autopilot';
import { validateFixtureGraph } from './integrity';
import { ACTIONS, RUN_STAGES, showcaseReducer } from './reducer';

const ENGINE_VERBS = [ACTIONS.ADVANCE_RUN_STAGE, ACTIONS.ADVANCE_DELIVERY_ATTEMPT, ACTIONS.EXHAUST_DELIVERY];

/* Drive the engine ourselves so every yielded action can be inspected. */
function trace(state, limit = 200) {
  const actions = [];
  let current = state;
  for (let index = 0; index < limit; index += 1) {
    const step = nextAutopilotAction(current);
    if (!step) break;
    actions.push(step);
    current = showcaseReducer(current, step.action);
  }
  return { state: current, actions };
}

function startLive(state) {
  const ids = state.liveIds;
  return showcaseReducer(state, { type: ACTIONS.START_SYNC, sourceConnectorId: ids.sourceConnectorId, targetConnectorIds: ids.targetConnectorIds });
}

describe('autopilot engine', () => {
  it('is idle on the fresh seed and leaves the in-flight ambience run untouched', () => {
    const seed = buildState();
    const ambience = Object.values(seed.runs).find((run) => run.status === 'running');
    expect(ambience).toEqual(expect.objectContaining({ stage: 'provider_write', connectorId: 'con_jira' }));
    expect(ambience.faultConnectorId).toBeUndefined();
    expect(ambience.stageAt).toBeUndefined();
    expect(nextAutopilotAction(seed)).toBeNull();

    const settled = runToQuiescence(showcaseReducer, seed);
    expect(settled.runs[ambience.id]).toEqual(expect.objectContaining({ status: 'running', stage: 'provider_write' }));
    expect(settled.runOrder).toEqual(seed.runOrder);
  });

  it('advances the live run stage by stage and stops at the deterministic fault', () => {
    const started = startLive(buildState());
    const ids = started.liveIds;
    const { state, actions } = trace(started);

    expect(actions.map(({ action }) => action.stage)).toEqual(RUN_STAGES.slice(1, RUN_STAGES.indexOf('provider_write') + 1));
    expect(actions.every(({ action, delayMs }) => action.type === ACTIONS.ADVANCE_RUN_STAGE && action.runId === ids.runId && delayMs === STAGE_DELAY_MS)).toBe(true);
    expect(actions.every(({ reason }) => reason.includes(ids.runId))).toBe(true);

    const run = state.runs[ids.runId];
    expect(run).toEqual(expect.objectContaining({ stage: 'provider_write', status: 'failed' }));
    expect(state.targetOutcomes[`out_${ids.runId}_${ids.faultConnectorId}`]).toEqual(expect.objectContaining({ status: 'failed', errorCode: 'PROVIDER_RATE_LIMIT', retryable: true }));
    expect(state.connectors[ids.faultConnectorId].status).toBe('warning');
    expect(nextAutopilotAction(state)).toBeNull();
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('never yields a human verb across the whole signature workflow', () => {
    const faulted = buildFaultedLiveState();
    const ids = faulted.liveIds;
    const retried = showcaseReducer(faulted, { type: ACTIONS.RETRY_FAILED_TARGET, runId: ids.runId, personaId: 'operator' });
    const first = trace(startLive(buildState())).actions;
    const second = trace(retried).actions;
    const all = [...first, ...second];

    expect(all.length).toBeGreaterThan(0);
    for (const { action } of all) expect(ENGINE_VERBS).toContain(action.type);
    expect(all.some(({ action }) => [ACTIONS.RETRY_FAILED_TARGET, ACTIONS.REPLAY_DEAD_LETTER, ACTIONS.VALIDATE_CONNECTOR].includes(action.type))).toBe(false);
  });

  it('retries the live delivery exactly twice on its own, then exhausts it', () => {
    const faulted = buildFaultedLiveState();
    const ids = faulted.liveIds;
    const retried = showcaseReducer(faulted, { type: ACTIONS.RETRY_FAILED_TARGET, runId: ids.runId, personaId: 'operator' });
    const { state, actions } = trace(retried);

    const deliveryActions = actions.filter(({ action }) => action.deliveryId === ids.deliveryId);
    expect(deliveryActions.map(({ action }) => action.type)).toEqual([
      ...Array.from({ length: MAX_DELIVERY_ATTEMPTS }, () => ACTIONS.ADVANCE_DELIVERY_ATTEMPT),
      ACTIONS.EXHAUST_DELIVERY,
    ]);
    expect(deliveryActions.every(({ delayMs }) => delayMs === ATTEMPT_DELAY_MS)).toBe(true);

    const delivery = state.deliveries[ids.deliveryId];
    expect(delivery.status).toBe('failed');
    expect(delivery.attemptIds).toHaveLength(MAX_DELIVERY_ATTEMPTS);
    expect(delivery.attemptIds.map((id) => state.deliveryAttempts[id])).toEqual([
      expect.objectContaining({ attempt: 1, status: 'failed', responseCode: 429 }),
      expect.objectContaining({ attempt: 2, status: 'failed', responseCode: 503 }),
    ]);
    expect(state.deadLetters[ids.deadLetterId]).toEqual(expect.objectContaining({ deliveryId: ids.deliveryId, eventId: ids.eventId }));
    expect(state.runs[ids.runId]).toEqual(expect.objectContaining({ stage: 'complete', status: 'success' }));
    expect(nextAutopilotAction(state)).toBeNull();
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('only ever touches the active tenant', () => {
    const state = buildState((seed) => {
      seed.runs.run_foreign = { ...seed.runs[seed.runOrder[0]], id: 'run_foreign', tenantId: 'tenant_other', status: 'running', stage: 'queued', stageAt: seed.anchorTime };
      seed.runOrder.unshift('run_foreign');
      return seed;
    });
    expect(nextAutopilotAction(state)).toBeNull();
  });
});

describe('runToQuiescence', () => {
  it('terminates within the step limit and honours a small limit', () => {
    const started = startLive(buildState());
    const { actions } = trace(started, 500);
    expect(actions.length).toBeLessThan(200);

    const partial = runToQuiescence(showcaseReducer, started, { limit: 2 });
    expect(partial.runs[started.liveIds.runId].stage).toBe(RUN_STAGES[2]);
    expect(nextAutopilotAction(partial)).not.toBeNull();
  });

  it('stamps every engine action with the supplied time', () => {
    const started = startLive(buildState());
    const at = new Date(Date.parse(started.anchorTime) + 1_000).toISOString();
    const settled = runToQuiescence(showcaseReducer, started, { at });
    expect(settled.runs[started.liveIds.runId].stageAt).toBe(at);
  });
});
