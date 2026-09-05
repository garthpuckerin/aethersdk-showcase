import { describe, expect, it } from 'vitest';
import { can } from '../access/policy';
import { nextAutopilotAction, runToQuiescence } from './autopilot';
import { validateFixtureGraph } from './integrity';
import { ACTIONS, showcaseReducer } from './reducer';
import { createSeedState } from './seed';
import { selectDeadLetters, selectExceptions, selectOverviewMetrics } from './selectors';

/* Anchor a few seconds in the past so every wall-clock-stamped action lands
   after the seeded history and inside the anchor's metering window. */
const NOW = Date.now() - 5_000;

function reduce(state, type, payload = {}) {
  return showcaseReducer(state, { type, ...payload });
}

function seed() {
  return createSeedState({ now: NOW });
}

function startLiveRun(state) {
  const ids = state.liveIds;
  let next = reduce(state, ACTIONS.VALIDATE_CONNECTOR, { connectorId: ids.sourceConnectorId });
  next = reduce(next, ACTIONS.START_SYNC, { sourceConnectorId: ids.sourceConnectorId, targetConnectorIds: ids.targetConnectorIds });
  return next;
}

describe('fixture graph', () => {
  it('is referentially complete and anchored to the boot clock', () => {
    const state = seed();
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
    expect(state.anchorTime).toBe(new Date(NOW).toISOString());
    const runs = Object.values(state.runs).filter((run) => run.tenantId === state.activeTenantId);
    expect(runs.length).toBeGreaterThan(150);
    expect(runs.filter((run) => run.status === 'running')).toHaveLength(1);
    expect(runs.filter((run) => run.status === 'failed').length).toBeGreaterThan(3);
    expect(Object.keys(state.deadLetters)).toEqual(['dlq_hist_1']);
  });

  it('tells the credit-union story with the featured providers', () => {
    const state = seed();
    const names = Object.values(state.connectors).filter((connector) => connector.tenantId === state.activeTenantId).map((connector) => state.providerDefinitions[connector.providerDefinitionId].name);
    for (const provider of ['UKG Pro', 'Xperience', 'Docebo', 'LinkedIn Learning', 'Axonify', 'Tableau']) expect(names).toContain(provider);
    const provisioning = Object.values(state.runs).filter((run) => run.operation === 'provision');
    expect(provisioning.every((run) => run.entityType === 'corporate.employee.v1')).toBe(true);
    expect(provisioning.some((run) => run.sourceConnectorId === 'con_ukg' && run.targetConnectorIds.includes('con_docebo'))).toBe(true);
    const completions = Object.values(state.runs).filter((run) => run.operation === 'completion');
    expect(completions.every((run) => run.entityType === 'learning.course.v1' && run.targetConnectorIds.includes('con_tableau'))).toBe(true);
  });

  it('reserves the live identity chain for the workflow', () => {
    const state = seed();
    const ids = state.liveIds;
    expect(state.runs[ids.runId]).toBeUndefined();
    expect(state.auditEvents[ids.eventId]).toBeUndefined();
    expect(state.deliveries[ids.deliveryId]).toBeUndefined();
    expect(state.deadLetters[ids.deadLetterId]).toBeUndefined();
  });
});

describe('showcase workflow reducer', () => {
  it('keeps one identity chain from sync through dead-letter replay, driven by the autopilot', () => {
    let state = startLiveRun(seed());
    const ids = state.liveIds;

    expect(state.runs[ids.runId]).toEqual(expect.objectContaining({ requestId: ids.requestId, idempotencyKey: ids.idempotencyKey, canonicalEntityId: ids.canonicalEntityId, entityType: 'corporate.employee.v1', faultConnectorId: 'con_axonify' }));
    expect(state.runs[ids.runId].targetConnectorIds).toEqual(['con_docebo', 'con_linkedin', 'con_axonify']);

    // The engine advances until the deterministic fault at provider write, then waits for a human.
    state = runToQuiescence(showcaseReducer, state);
    expect(state.runs[ids.runId].stage).toBe('provider_write');
    expect(state.runs[ids.runId].status).toBe('failed');
    expect(state.targetOutcomes[`out_${ids.runId}_con_axonify`].status).toBe('failed');
    expect(state.targetOutcomes[`out_${ids.runId}_con_docebo`].status).toBe('success');
    expect(state.targetOutcomes[`out_${ids.runId}_con_linkedin`].status).toBe('success');
    expect(nextAutopilotAction(state)).toBeNull();

    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });
    const axonify = state.targetOutcomes[`out_${ids.runId}_con_axonify`];
    expect(axonify.status).toBe('success');
    expect(axonify.retryCount).toBe(1);
    expect(state.runs[ids.runId].idempotencyKey).toBe(ids.idempotencyKey);
    expect(Object.values(state.entityLinks).filter(({ canonicalEntityId, connectorId }) => canonicalEntityId === ids.canonicalEntityId && connectorId === 'con_axonify')).toHaveLength(1);
    expect(Object.values(state.auditEvents).some((event) => event.action === 'sync.retried' && event.runId === ids.runId)).toBe(true);

    // The engine finishes the run, creates audit + delivery, retries the live delivery, and exhausts it.
    state = runToQuiescence(showcaseReducer, state);
    expect(state.runs[ids.runId]).toEqual(expect.objectContaining({ stage: 'complete', status: 'success' }));
    expect(state.auditEvents[ids.eventId]).toEqual(expect.objectContaining({ runId: ids.runId, requestId: ids.requestId, action: 'sync.completed' }));
    expect(state.deliveries[ids.deliveryId]).toEqual(expect.objectContaining({ eventId: ids.eventId, subscriptionId: ids.subscriptionId, payloadId: ids.payloadId, status: 'failed' }));
    expect(state.deliveries[ids.deliveryId].attemptIds).toHaveLength(2);
    expect(state.deadLetters[ids.deadLetterId].deliveryId).toBe(ids.deliveryId);
    expect(state.dependencies.dep_event_delivery.status).toBe('warning');
    // Other active subscriptions to the same event delivered on the first attempt.
    expect(state.deliveries[`delivery_${ids.runId}_sub_ops`].status).toBe('success');
    expect(nextAutopilotAction(state)).toBeNull();

    const usageBefore = selectOverviewMetrics(state, 'operator').usage.value;
    state = reduce(state, ACTIONS.REPLAY_DEAD_LETTER, { deadLetterId: ids.deadLetterId, personaId: 'operator' });
    expect(state.deadLetters[ids.deadLetterId]).toBeUndefined();
    expect(state.deliveries[ids.deliveryId]).toEqual(expect.objectContaining({ status: 'success', eventId: ids.eventId, payloadId: ids.payloadId }));
    expect(state.auditEvents.evt_live_replay.resourceId).toBe(ids.deliveryId);
    expect(selectOverviewMetrics(state, 'operator').usage.value).toBeGreaterThan(usageBefore);
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('runs an ordinary operator sync to completion without a fault', () => {
    let state = seed();
    state = reduce(state, ACTIONS.START_SYNC, { sourceConnectorId: 'con_docebo', targetConnectorIds: ['con_tableau'], entityType: 'learning.course.v1', entitiesProcessed: 42 });
    const runId = state.runOrder[0];
    expect(runId).not.toBe(state.liveIds.runId);
    expect(state.runs[runId].operation).toBe('completion');
    state = runToQuiescence(showcaseReducer, state);
    expect(state.runs[runId]).toEqual(expect.objectContaining({ status: 'success', stage: 'complete', entitiesProcessed: 42 }));
    expect(state.deliveries[`delivery_${runId}_sub_ops`].status).toBe('success');
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('does not duplicate a provider link when retry is dispatched twice', () => {
    let state = runToQuiescence(showcaseReducer, startLiveRun(seed()));
    const ids = state.liveIds;
    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });
    state = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'operator' });
    expect(Object.values(state.entityLinks).filter(({ canonicalEntityId, connectorId }) => canonicalEntityId === ids.canonicalEntityId && connectorId === 'con_axonify')).toHaveLength(1);
  });

  it('rejects mutation actions the persona cannot perform', () => {
    let state = runToQuiescence(showcaseReducer, startLiveRun(seed()));
    const ids = state.liveIds;
    const denied = reduce(state, ACTIONS.RETRY_FAILED_TARGET, { runId: ids.runId, personaId: 'auditor' });
    expect(can('auditor', 'sync:retry')).toBe(false);
    expect(denied.targetOutcomes[`out_${ids.runId}_con_axonify`].status).toBe('failed');
    expect(denied.lastDeniedPermission).toBe('sync:retry');

    const auditorState = { ...seed(), activePersonaId: 'auditor' };
    expect(reduce(auditorState, ACTIONS.INVITE_MEMBER, { name: 'X', email: 'x@harborline.example', roleId: 'operator' }).lastDeniedPermission).toBe('access:manage');
    expect(reduce(auditorState, ACTIONS.CREATE_SUBSCRIPTION, { name: 'X', destination: 'https://hooks.harborline.example/x', eventTypes: ['sync.completed'] }).lastDeniedPermission).toBe('webhook:manage');
    expect(reduce(auditorState, ACTIONS.ADD_CONNECTOR, { providerDefinitionId: 'provider_workday' }).lastDeniedPermission).toBe('connector:manage');
  });

  it('records governance actions as audit events with stable resources', () => {
    let state = seed();
    state = reduce(state, ACTIONS.INVITE_MEMBER, { name: 'Nia Brooks', email: 'nia.brooks@harborline.example', roleId: 'auditor' });
    const invited = Object.values(state.members).find((member) => member.email === 'nia.brooks@harborline.example');
    expect(invited).toEqual(expect.objectContaining({ status: 'invited', roleId: 'auditor' }));
    state = reduce(state, ACTIONS.CREATE_SUBSCRIPTION, { name: 'Compliance feed', destination: 'https://hooks.harborline.example/compliance', eventTypes: ['sync.completed'] });
    state = reduce(state, ACTIONS.ADD_CONNECTOR, { providerDefinitionId: 'provider_workday' });
    state = reduce(state, ACTIONS.ROTATE_CREDENTIAL, { connectorId: 'con_linkedin' });
    state = reduce(state, ACTIONS.EXPORT_AUDIT, { scope: '30-day' });
    const actions = state.auditOrder.slice(0, 5).map((id) => state.auditEvents[id].action);
    expect(actions).toEqual(['audit.export.requested', 'connector.credential.rotated', 'connector.added', 'webhook.subscription.created', 'member.invited']);
    expect(state.connectors.con_linkedin.status).toBe('healthy');
    expect(state.connectors.con_workday).toEqual(expect.objectContaining({ status: 'inactive', credentialState: 'reference_missing' }));
    expect(validateFixtureGraph(state)).toEqual({ valid: true, errors: [] });
  });

  it('ignores replay after the dead letter is already resolved', () => {
    let state = seed();
    state = reduce(state, ACTIONS.REPLAY_DEAD_LETTER, { deadLetterId: 'missing', personaId: 'operator' });
    expect(selectDeadLetters(state)).toHaveLength(1);
  });

  it('resets every simulated mutation to a fresh fixture graph but keeps appearance', () => {
    let state = { ...startLiveRun(seed()), theme: 'dark', density: 'dense', activePersonaId: 'operator' };
    state = reduce(state, ACTIONS.RESET_DEMO);
    expect(state.runs[state.liveIds.runId]).toBeUndefined();
    expect(state.deadLetterOrder).toEqual(['dlq_hist_1']);
    expect(state).toEqual(expect.objectContaining({ theme: 'dark', density: 'dense', activePersonaId: 'operator' }));
  });

  it('surfaces the exception queue from the same records the screens use', () => {
    const state = seed();
    const exceptions = selectExceptions(state);
    expect(exceptions.connectors.map(({ id }) => id)).toEqual(expect.arrayContaining(['con_linkedin', 'con_axonify']));
    expect(exceptions.deadLetters).toHaveLength(1);
    expect(exceptions.total).toBe(exceptions.connectors.length + exceptions.failedRuns.length + 1);
  });
});
