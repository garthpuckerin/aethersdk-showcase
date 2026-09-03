import { describe, expect, it } from 'vitest';
import { can } from '../access/policy';
import { validateFixtureGraph } from './integrity';
import { ACTIONS, showcaseReducer } from './reducer';
import { createSeedState } from './seed';
import { selectDeadLetters, selectOverviewMetrics } from './selectors';

function reduce(state, type, payload = {}) {
  return showcaseReducer(state, { type, ...payload });
}

function createLiveRun(state) {
  let next = reduce(state, ACTIONS.VALIDATE_CONNECTOR, { connectorId: 'con_salesforce' });
  next = reduce(next, ACTIONS.START_SYNC, {
    sourceConnectorId: 'con_salesforce',
    targetConnectorIds: ['con_hubspot', 'con_pipedrive'],
  });
  return next;
}

describe('showcase workflow reducer', () => {
  it('keeps one identity chain from sync through dead-letter replay', () => {
    let state = createLiveRun(createSeedState());
    const ids = state.liveIds;

    expect(state.runs[ids.runId]).toEqual(expect.objectContaining({
      requestId: ids.requestId,
      idempotencyKey: ids.idempotencyKey,
      canonicalEntityId: ids.canonicalEntityId,
    }));

    state = reduce(state, ACTIONS.FAIL_TARGET, { runId: ids.runId, connectorId: 'con_pipedrive' });
    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });
    const pipedriveOutcome = state.targetOutcomes[`out_${ids.runId}_con_pipedrive`];
    expect(pipedriveOutcome.status).toBe('success');
    expect(pipedriveOutcome.retryCount).toBe(1);
    expect(state.runs[ids.runId].idempotencyKey).toBe(ids.idempotencyKey);
    expect(Object.values(state.entityLinks).filter(({ canonicalEntityId, connectorId }) =>
      canonicalEntityId === ids.canonicalEntityId && connectorId === 'con_pipedrive',
    )).toHaveLength(1);

    state = reduce(state, ACTIONS.ADVANCE_RUN_STAGE, { runId: ids.runId, stage: 'audit' });
    state = reduce(state, ACTIONS.ADVANCE_RUN_STAGE, { runId: ids.runId, stage: 'webhook' });
    expect(state.auditEvents[ids.eventId]).toEqual(expect.objectContaining({
      runId: ids.runId,
      requestId: ids.requestId,
    }));
    expect(state.deliveries[ids.deliveryId]).toEqual(expect.objectContaining({
      eventId: ids.eventId,
      subscriptionId: ids.subscriptionId,
      payloadId: ids.payloadId,
    }));

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      state = reduce(state, ACTIONS.ADVANCE_DELIVERY_ATTEMPT, { deliveryId: ids.deliveryId });
    }
    state = reduce(state, ACTIONS.EXHAUST_DELIVERY, { deliveryId: ids.deliveryId });
    expect(state.deadLetters[ids.deadLetterId].deliveryId).toBe(ids.deliveryId);

    const usageBefore = selectOverviewMetrics(state, 'operator').usage.value;
    state = reduce(state, ACTIONS.REPLAY_DEAD_LETTER, { deadLetterId: ids.deadLetterId, personaId: 'operator' });
    expect(state.deadLetters[ids.deadLetterId]).toBeUndefined();
    expect(state.deliveries[ids.deliveryId]).toEqual(expect.objectContaining({
      status: 'success', eventId: ids.eventId, payloadId: ids.payloadId,
    }));
    expect(state.auditEvents.evt_live_replay.resourceId).toBe(ids.deliveryId);
    expect(selectOverviewMetrics(state, 'operator').usage.value).toBeGreaterThan(usageBefore);
    expect(state.dependencies.dep_event_delivery.status).toBe('healthy');
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('does not duplicate a provider link when retry is dispatched twice', () => {
    let state = createLiveRun(createSeedState());
    const ids = state.liveIds;
    state = reduce(state, ACTIONS.FAIL_TARGET, { runId: ids.runId, connectorId: 'con_pipedrive' });
    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });
    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });

    expect(Object.values(state.entityLinks).filter(({ canonicalEntityId, connectorId }) =>
      canonicalEntityId === ids.canonicalEntityId && connectorId === 'con_pipedrive',
    )).toHaveLength(1);
  });

  it('rejects mutation actions the persona cannot perform', () => {
    let state = createLiveRun(createSeedState());
    const ids = state.liveIds;
    state = reduce(state, ACTIONS.FAIL_TARGET, { runId: ids.runId, connectorId: 'con_pipedrive' });
    const denied = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'auditor' });

    expect(can('auditor', 'sync:retry')).toBe(false);
    expect(denied.targetOutcomes[`out_${ids.runId}_con_pipedrive`].status).toBe('failed');
    expect(denied.lastDeniedPermission).toBe('sync:retry');
  });

  it('ignores replay after the dead letter is already resolved', () => {
    let state = createSeedState();
    state = reduce(state, ACTIONS.REPLAY_DEAD_LETTER, { deadLetterId: 'missing', personaId: 'operator' });
    expect(selectDeadLetters(state)).toHaveLength(1);
  });

  it('resets every simulated mutation to a fresh fixture graph', () => {
    const state = createLiveRun(createSeedState());
    const reset = reduce(state, ACTIONS.RESET_DEMO);
    expect(reset.runs[reset.liveIds.runId]).toBeUndefined();
    expect(reset.deadLetterOrder).toEqual(['dlq_hist_1']);
  });
});
