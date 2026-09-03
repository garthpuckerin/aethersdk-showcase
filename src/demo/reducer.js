import { can } from '../access/policy';
import { createSeedState } from './seed';

export const ACTIONS = {
  VALIDATE_CONNECTOR: 'VALIDATE_CONNECTOR',
  START_SYNC: 'START_SYNC',
  ADVANCE_RUN_STAGE: 'ADVANCE_RUN_STAGE',
  FAIL_TARGET: 'FAIL_TARGET',
  RETRY_FAILED_TARGET: 'RETRY_FAILED_TARGET',
  ADVANCE_DELIVERY_ATTEMPT: 'ADVANCE_DELIVERY_ATTEMPT',
  EXHAUST_DELIVERY: 'EXHAUST_DELIVERY',
  REPLAY_DEAD_LETTER: 'REPLAY_DEAD_LETTER',
  SET_PERSONA: 'SET_PERSONA',
  SET_SCENARIO: 'SET_SCENARIO',
  RESET_DEMO: 'RESET_DEMO',
  SET_THEME: 'SET_THEME',
  SET_DENSITY: 'SET_DENSITY',
};

function copy(state) {
  return structuredClone(state);
}

function deny(state, permission) {
  const next = copy(state);
  next.lastDeniedPermission = permission;
  return next;
}

function ensureEntityLink(state, run, connectorId, remoteId) {
  const existing = Object.values(state.entityLinks).find((link) =>
    link.tenantId === run.tenantId
      && link.canonicalEntityId === run.canonicalEntityId
      && link.connectorId === connectorId,
  );
  if (existing) return existing;
  const id = `link_${run.id}_${connectorId}`;
  const link = {
    id,
    tenantId: run.tenantId,
    canonicalEntityId: run.canonicalEntityId,
    connectorId,
    remoteId,
    matchMethod: 'idempotent_push',
  };
  state.entityLinks[id] = link;
  return link;
}

function validateConnector(state, action) {
  const connector = state.connectors[action.connectorId];
  if (!connector) return state;
  const next = copy(state);
  next.connectors[action.connectorId] = {
    ...connector,
    status: 'healthy',
    credentialState: 'reference_valid',
    validatedAt: state.anchorTime,
  };
  next.lastDeniedPermission = null;
  return next;
}

function startSync(state, action) {
  const ids = state.liveIds;
  if (state.runs[ids.runId]) return state;
  const next = copy(state);
  const targetOutcomeIds = action.targetConnectorIds.map((connectorId) => {
    const id = `out_${ids.runId}_${connectorId}`;
    next.targetOutcomes[id] = {
      id,
      tenantId: state.activeTenantId,
      runId: ids.runId,
      connectorId,
      status: 'queued',
      remoteId: null,
      errorCode: null,
      retryable: false,
      retryCount: 0,
    };
    return id;
  });
  next.runs[ids.runId] = {
    id: ids.runId,
    tenantId: state.activeTenantId,
    connectorId: action.sourceConnectorId,
    sourceConnectorId: action.sourceConnectorId,
    targetConnectorIds: [...action.targetConnectorIds],
    targetOutcomeIds,
    canonicalEntityId: ids.canonicalEntityId,
    entityType: next.canonicalEntities[ids.canonicalEntityId].type,
    direction: 'outbound',
    status: 'running',
    entitiesProcessed: 1,
    durationMs: null,
    p95Ms: null,
    startedAt: state.anchorTime,
    requestId: ids.requestId,
    idempotencyKey: ids.idempotencyKey,
    stage: 'queued',
  };
  next.runOrder.unshift(ids.runId);
  next.lastDeniedPermission = null;
  return next;
}

function failTarget(state, action) {
  const run = state.runs[action.runId];
  if (!run) return state;
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  for (const outcomeId of nextRun.targetOutcomeIds) {
    const outcome = next.targetOutcomes[outcomeId];
    if (outcome.connectorId === action.connectorId) {
      Object.assign(outcome, {
        status: 'failed',
        errorCode: 'PROVIDER_RATE_LIMIT',
        retryable: true,
      });
      next.connectors[outcome.connectorId].status = 'warning';
    } else {
      const remoteId = `remote_${nextRun.id}_${outcome.connectorId}`;
      Object.assign(outcome, { status: 'success', remoteId, retryable: false });
      ensureEntityLink(next, nextRun, outcome.connectorId, remoteId);
    }
  }
  nextRun.status = 'failed';
  nextRun.stage = 'provider_write';
  return next;
}

function retryFailedTarget(state, action) {
  const personaId = action.personaId ?? state.activePersonaId;
  if (!can(personaId, 'sync:retry')) return deny(state, 'sync:retry');
  const run = state.runs[action.runId];
  if (!run) return state;
  const failedIds = run.targetOutcomeIds.filter((id) => state.targetOutcomes[id]?.status === 'failed');
  if (!failedIds.length) return state;
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  for (const id of failedIds) {
    const outcome = next.targetOutcomes[id];
    const remoteId = outcome.remoteId ?? `remote_${nextRun.id}_${outcome.connectorId}`;
    Object.assign(outcome, {
      status: 'success',
      remoteId,
      errorCode: null,
      retryable: false,
      retryCount: (outcome.retryCount ?? 0) + 1,
    });
    ensureEntityLink(next, nextRun, outcome.connectorId, remoteId);
    next.connectors[outcome.connectorId].status = 'healthy';
  }
  nextRun.status = 'running';
  nextRun.stage = 'identity_link';
  next.lastDeniedPermission = null;
  return next;
}

function advanceRunStage(state, action) {
  const run = state.runs[action.runId];
  if (!run) return state;
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  nextRun.stage = action.stage;
  if (action.stage === 'audit' && !next.auditEvents[next.liveIds.eventId]) {
    nextRun.status = 'success';
    nextRun.durationMs = 1_842;
    nextRun.p95Ms = 118;
    const event = {
      id: next.liveIds.eventId,
      tenantId: nextRun.tenantId,
      actorId: 'actor_operator',
      action: 'sync.completed',
      resourceType: 'run',
      resourceId: nextRun.id,
      requestId: nextRun.requestId,
      runId: nextRun.id,
      createdAt: next.anchorTime,
    };
    next.auditEvents[event.id] = event;
    next.auditOrder.unshift(event.id);
    const meterId = 'meter_live_sync';
    next.meteringEvents[meterId] = {
      id: meterId,
      tenantId: nextRun.tenantId,
      sourceEventId: event.id,
      connectorId: nextRun.connectorId,
      metric: 'entities.synced',
      quantity: nextRun.entitiesProcessed,
      createdAt: next.anchorTime,
    };
  }
  if (action.stage === 'webhook' && !next.deliveries[next.liveIds.deliveryId]) {
    const delivery = {
      id: next.liveIds.deliveryId,
      tenantId: nextRun.tenantId,
      eventId: next.liveIds.eventId,
      runId: nextRun.id,
      requestId: nextRun.requestId,
      subscriptionId: next.liveIds.subscriptionId,
      payloadId: next.liveIds.payloadId,
      status: 'retrying',
      attemptIds: [],
      createdAt: next.anchorTime,
    };
    next.deliveries[delivery.id] = delivery;
    next.deliveryOrder.unshift(delivery.id);
  }
  return next;
}

function advanceDeliveryAttempt(state, action) {
  const delivery = state.deliveries[action.deliveryId];
  if (!delivery || delivery.status === 'success') return state;
  const next = copy(state);
  const nextDelivery = next.deliveries[action.deliveryId];
  const attempt = nextDelivery.attemptIds.length + 1;
  const id = `attempt_${nextDelivery.id}_${attempt}`;
  if (next.deliveryAttempts[id]) return state;
  next.deliveryAttempts[id] = {
    id,
    tenantId: nextDelivery.tenantId,
    deliveryId: nextDelivery.id,
    attempt,
    status: 'failed',
    responseCode: attempt === 1 ? 429 : 503,
    createdAt: next.anchorTime,
  };
  nextDelivery.attemptIds.push(id);
  nextDelivery.status = 'retrying';
  return next;
}

function exhaustDelivery(state, action) {
  const delivery = state.deliveries[action.deliveryId];
  if (!delivery || state.deadLetters[state.liveIds.deadLetterId]) return state;
  const next = copy(state);
  const nextDelivery = next.deliveries[action.deliveryId];
  nextDelivery.status = 'failed';
  const deadLetter = {
    id: next.liveIds.deadLetterId,
    tenantId: nextDelivery.tenantId,
    deliveryId: nextDelivery.id,
    eventId: nextDelivery.eventId,
    reason: 'Attempts exhausted after upstream 503',
    createdAt: next.anchorTime,
  };
  next.deadLetters[deadLetter.id] = deadLetter;
  next.deadLetterOrder.unshift(deadLetter.id);
  next.dependencies.dep_event_delivery.status = 'warning';
  return next;
}

function replayDeadLetter(state, action) {
  const personaId = action.personaId ?? state.activePersonaId;
  if (!can(personaId, 'delivery:replay')) return deny(state, 'delivery:replay');
  const deadLetter = state.deadLetters[action.deadLetterId];
  if (!deadLetter) return state;
  const next = copy(state);
  const delivery = next.deliveries[deadLetter.deliveryId];
  const attemptNumber = delivery.attemptIds.length + 1;
  const attemptId = `attempt_${delivery.id}_${attemptNumber}`;
  next.deliveryAttempts[attemptId] = {
    id: attemptId,
    tenantId: delivery.tenantId,
    deliveryId: delivery.id,
    attempt: attemptNumber,
    status: 'success',
    responseCode: 202,
    createdAt: next.anchorTime,
  };
  delivery.attemptIds.push(attemptId);
  delivery.status = 'success';
  delete next.deadLetters[deadLetter.id];
  next.deadLetterOrder = next.deadLetterOrder.filter((id) => id !== deadLetter.id);
  const replayEvent = {
    id: 'evt_live_replay',
    tenantId: delivery.tenantId,
    actorId: 'actor_operator',
    action: 'webhook.replayed',
    resourceType: 'delivery',
    resourceId: delivery.id,
    requestId: delivery.requestId,
    runId: delivery.runId,
    createdAt: next.anchorTime,
  };
  next.auditEvents[replayEvent.id] = replayEvent;
  if (!next.auditOrder.includes(replayEvent.id)) next.auditOrder.unshift(replayEvent.id);
  next.meteringEvents.meter_live_replay = {
    id: 'meter_live_replay',
    tenantId: delivery.tenantId,
    sourceEventId: replayEvent.id,
    connectorId: next.runs[delivery.runId]?.connectorId,
    metric: 'webhook.replayed',
    quantity: 1,
    createdAt: next.anchorTime,
  };
  next.dependencies.dep_event_delivery.status = 'healthy';
  next.lastDeniedPermission = null;
  return next;
}

export function showcaseReducer(state, action) {
  switch (action.type) {
    case ACTIONS.VALIDATE_CONNECTOR: return validateConnector(state, action);
    case ACTIONS.START_SYNC: return startSync(state, action);
    case ACTIONS.ADVANCE_RUN_STAGE: return advanceRunStage(state, action);
    case ACTIONS.FAIL_TARGET: return failTarget(state, action);
    case ACTIONS.RETRY_FAILED_TARGET: return retryFailedTarget(state, action);
    case ACTIONS.ADVANCE_DELIVERY_ATTEMPT: return advanceDeliveryAttempt(state, action);
    case ACTIONS.EXHAUST_DELIVERY: return exhaustDelivery(state, action);
    case ACTIONS.REPLAY_DEAD_LETTER: return replayDeadLetter(state, action);
    case ACTIONS.SET_PERSONA: return { ...state, activePersonaId: action.personaId, lastDeniedPermission: null };
    case ACTIONS.SET_SCENARIO: return { ...state, scenario: action.scenario };
    case ACTIONS.SET_THEME: return { ...state, theme: action.theme };
    case ACTIONS.SET_DENSITY: return { ...state, density: action.density };
    case ACTIONS.RESET_DEMO: return createSeedState();
    default: return state;
  }
}
