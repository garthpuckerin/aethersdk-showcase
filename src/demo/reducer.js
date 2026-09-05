/* The only mutation boundary of the showcase. Every action is pure, permission
   checked where a persona could be denied, and stamps the time it was given
   (`action.at`) or the wall clock, never a calendar constant. */
import { actorIdFor, can } from '../access/policy.js';
import { nowIso } from './clock.js';
import { createSeedState } from './seed.js';

export const ACTIONS = {
  VALIDATE_CONNECTOR: 'VALIDATE_CONNECTOR',
  ROTATE_CREDENTIAL: 'ROTATE_CREDENTIAL',
  ADD_CONNECTOR: 'ADD_CONNECTOR',
  SET_CONNECTOR_ENABLED: 'SET_CONNECTOR_ENABLED',
  START_SYNC: 'START_SYNC',
  ADVANCE_RUN_STAGE: 'ADVANCE_RUN_STAGE',
  FAIL_TARGET: 'FAIL_TARGET',
  RETRY_FAILED_TARGET: 'RETRY_FAILED_TARGET',
  ADVANCE_DELIVERY_ATTEMPT: 'ADVANCE_DELIVERY_ATTEMPT',
  EXHAUST_DELIVERY: 'EXHAUST_DELIVERY',
  REPLAY_DEAD_LETTER: 'REPLAY_DEAD_LETTER',
  CREATE_SUBSCRIPTION: 'CREATE_SUBSCRIPTION',
  SET_SUBSCRIPTION_STATUS: 'SET_SUBSCRIPTION_STATUS',
  INVITE_MEMBER: 'INVITE_MEMBER',
  SCIM_RECONCILE: 'SCIM_RECONCILE',
  EXPORT_AUDIT: 'EXPORT_AUDIT',
  SET_PERSONA: 'SET_PERSONA',
  SET_SCENARIO: 'SET_SCENARIO',
  SET_THEME: 'SET_THEME',
  SET_DENSITY: 'SET_DENSITY',
  SET_AUTOPILOT: 'SET_AUTOPILOT',
  HYDRATE: 'HYDRATE',
  RESET_DEMO: 'RESET_DEMO',
};

export const RUN_STAGES = ['queued', 'authorization', 'fetch', 'normalization', 'match', 'provider_write', 'identity_link', 'audit', 'webhook', 'metering', 'complete'];

export function nextStage(stage) {
  const index = RUN_STAGES.indexOf(stage);
  return index >= 0 && index < RUN_STAGES.length - 1 ? RUN_STAGES[index + 1] : null;
}

const ERROR_CODES = { con_axonify: 'PROVIDER_RATE_LIMIT', default: 'PROVIDER_TIMEOUT' };

function copy(state) {
  return structuredClone(state);
}

function stamp(action) {
  return action.at ?? nowIso();
}

function deny(state, permission) {
  return { ...state, lastDeniedPermission: permission };
}

function allow(next) {
  next.lastDeniedPermission = null;
  next.sequence = (next.sequence ?? 0) + 1;
  return next;
}

function sequenceId(state, prefix) {
  return `${prefix}_${String((state.sequence ?? 0) + 1).padStart(3, '0')}`;
}

function audit(next, { actorId, action, resourceType, resourceId, requestId, runId = null, detail, at, id }) {
  const eventId = id ?? `evt_${resourceType}_${resourceId}_${(next.auditOrder.length + 1).toString(36)}`;
  if (next.auditEvents[eventId]) return next.auditEvents[eventId];
  const event = { id: eventId, tenantId: next.activeTenantId, actorId, action, resourceType, resourceId, requestId: requestId ?? sequenceId(next, 'req'), runId, createdAt: at, detail };
  next.auditEvents[eventId] = event;
  next.auditOrder.unshift(eventId);
  return event;
}

function ensureEntityLink(state, run, connectorId, remoteId) {
  const existing = Object.values(state.entityLinks).find((link) =>
    link.tenantId === run.tenantId && link.canonicalEntityId === run.canonicalEntityId && link.connectorId === connectorId,
  );
  if (existing) return existing;
  const id = `link_${run.id}_${connectorId}`;
  const link = { id, tenantId: run.tenantId, canonicalEntityId: run.canonicalEntityId, connectorId, remoteId, matchMethod: 'idempotent_push' };
  state.entityLinks[id] = link;
  return link;
}

function validateConnector(state, action) {
  if (!can(state.activePersonaId, 'connector:validate')) return deny(state, 'connector:validate');
  const connector = state.connectors[action.connectorId];
  if (!connector) return state;
  const at = stamp(action);
  const next = copy(state);
  next.connectors[action.connectorId] = { ...connector, status: connector.status === 'running' ? 'running' : 'healthy', credentialState: 'reference_valid', validatedAt: at };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'connector.validated', resourceType: 'connector', resourceId: connector.id, detail: 'Credential reference validated against the provider', at });
  return allow(next);
}

function rotateCredential(state, action) {
  if (!can(state.activePersonaId, 'connector:validate')) return deny(state, 'connector:validate');
  const connector = state.connectors[action.connectorId];
  if (!connector) return state;
  const at = stamp(action);
  const next = copy(state);
  next.connectors[action.connectorId] = { ...connector, credentialState: 'reference_valid', credentialRotatedAt: at, validatedAt: at, status: connector.status === 'warning' ? 'healthy' : connector.status };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'connector.credential.rotated', resourceType: 'connector', resourceId: connector.id, detail: 'Reference rotated · previous reference revoked', at });
  return allow(next);
}

function addConnector(state, action) {
  if (!can(state.activePersonaId, 'connector:manage')) return deny(state, 'connector:manage');
  const provider = state.providerDefinitions[action.providerDefinitionId];
  if (!provider) return state;
  const at = stamp(action);
  const next = copy(state);
  const id = action.connectorId ?? `con_${provider.id.replace('provider_', '')}`;
  if (next.connectors[id]) return state;
  next.connectors[id] = { id, tenantId: state.activeTenantId, providerDefinitionId: provider.id, name: action.name ?? provider.name, role: action.role ?? 'target', status: 'inactive', direction: action.direction ?? 'inbound', enabled: false, credentialState: 'reference_missing', validatedAt: null, credentialRotatedAt: null, scheduleMinutes: action.scheduleMinutes ?? 60, createdAt: at };
  next.connectorOrder.push(id);
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'connector.added', resourceType: 'connector', resourceId: id, detail: `${provider.name} connected · awaiting credential reference`, at });
  return allow(next);
}

function setConnectorEnabled(state, action) {
  if (!can(state.activePersonaId, 'connector:manage')) return deny(state, 'connector:manage');
  const connector = state.connectors[action.connectorId];
  if (!connector) return state;
  const at = stamp(action);
  const next = copy(state);
  next.connectors[action.connectorId] = { ...connector, enabled: action.enabled, status: action.enabled ? (connector.credentialState === 'reference_valid' ? 'healthy' : 'inactive') : 'inactive' };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: action.enabled ? 'connector.enabled' : 'connector.disabled', resourceType: 'connector', resourceId: connector.id, detail: action.enabled ? 'Scheduled syncs resumed' : 'Scheduled syncs paused', at });
  return allow(next);
}

function startSync(state, action) {
  if (!can(state.activePersonaId, 'sync:run')) return deny(state, 'sync:run');
  const source = state.connectors[action.sourceConnectorId];
  if (!source) return state;
  const targetConnectorIds = (action.targetConnectorIds ?? []).filter((id) => state.connectors[id] && id !== source.id);
  if (!targetConnectorIds.length) return state;
  const live = state.liveIds;
  const isLive = !state.runs[live.runId] && source.id === live.sourceConnectorId && targetConnectorIds.includes(live.faultConnectorId);
  const at = stamp(action);
  const next = copy(state);
  const runId = isLive ? live.runId : sequenceId(next, 'run_op');
  const requestId = isLive ? live.requestId : sequenceId(next, 'req_op');
  const canonicalEntityId = isLive ? live.canonicalEntityId : action.canonicalEntityId ?? Object.values(state.canonicalEntities).find((entity) => entity.tenantId === state.activeTenantId && (!action.entityType || entity.type === action.entityType))?.id;
  const entity = next.canonicalEntities[canonicalEntityId];
  if (!entity) return state;
  const targetOutcomeIds = targetConnectorIds.map((connectorId) => {
    const id = `out_${runId}_${connectorId}`;
    next.targetOutcomes[id] = { id, tenantId: state.activeTenantId, runId, connectorId, status: 'queued', remoteId: null, errorCode: null, retryable: false, retryCount: 0 };
    return id;
  });
  next.runs[runId] = {
    id: runId,
    tenantId: state.activeTenantId,
    connectorId: source.id,
    sourceConnectorId: source.id,
    targetConnectorIds,
    targetOutcomeIds,
    canonicalEntityId,
    entityType: entity.type,
    operation: action.operation ?? (entity.type.startsWith('learning') ? 'completion' : 'provision'),
    direction: action.direction ?? 'outbound',
    status: 'running',
    entitiesProcessed: action.entitiesProcessed ?? 1,
    durationMs: null,
    p95Ms: null,
    startedAt: at,
    completedAt: null,
    requestId,
    idempotencyKey: isLive ? live.idempotencyKey : `idem_${runId}`,
    stage: 'queued',
    triggeredBy: 'operator',
    faultConnectorId: isLive ? live.faultConnectorId : action.faultConnectorId ?? null,
  };
  next.runOrder.unshift(runId);
  if (source.status !== 'running') next.connectors[source.id] = { ...source, status: 'running' };
  return allow(next);
}

function applyProviderWrite(next, run, at) {
  for (const outcomeId of run.targetOutcomeIds) {
    const outcome = next.targetOutcomes[outcomeId];
    if (outcome.status === 'success') continue;
    if (run.faultConnectorId && outcome.connectorId === run.faultConnectorId && (outcome.retryCount ?? 0) === 0) {
      Object.assign(outcome, { status: 'failed', errorCode: ERROR_CODES[outcome.connectorId] ?? ERROR_CODES.default, retryable: true });
      next.connectors[outcome.connectorId].status = 'warning';
    } else {
      const remoteId = `${outcome.connectorId.replace('con_', '')}_${run.canonicalEntityId.replace('entity_', '')}`;
      Object.assign(outcome, { status: 'success', remoteId, errorCode: null, retryable: false });
      ensureEntityLink(next, run, outcome.connectorId, remoteId);
    }
  }
  const failed = run.targetOutcomeIds.some((id) => next.targetOutcomes[id].status === 'failed');
  run.status = failed ? 'failed' : 'running';
  run.stage = 'provider_write';
  run.stageAt = at;
}

function completeRun(next, run, at) {
  run.stage = 'complete';
  run.status = 'success';
  run.completedAt = at;
  run.durationMs = Math.max(1_200, Date.parse(at) - Date.parse(run.startedAt));
  run.p95Ms = 96 + (run.targetConnectorIds.length * 22);
  const source = next.connectors[run.sourceConnectorId];
  if (source?.status === 'running') source.status = 'healthy';
}

function advanceRunStage(state, action) {
  const run = state.runs[action.runId];
  if (!run || run.stage === 'complete') return state;
  if (run.status === 'failed') return state;
  const stage = action.stage ?? nextStage(run.stage);
  if (!stage) return state;
  const at = stamp(action);
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  const live = next.liveIds;
  const isLive = nextRun.id === live.runId;

  if (stage === 'provider_write') {
    applyProviderWrite(next, nextRun, at);
    return allow(next);
  }

  nextRun.stage = stage;
  nextRun.stageAt = at;

  if (stage === 'identity_link') {
    for (const outcomeId of nextRun.targetOutcomeIds) {
      const outcome = next.targetOutcomes[outcomeId];
      if (outcome.status === 'success') ensureEntityLink(next, nextRun, outcome.connectorId, outcome.remoteId);
    }
  }

  if (stage === 'audit') {
    const eventId = isLive ? live.eventId : `evt_${nextRun.id}`;
    const retried = nextRun.targetOutcomeIds.some((id) => (next.targetOutcomes[id].retryCount ?? 0) > 0);
    audit(next, { id: eventId, actorId: 'actor_service', action: 'sync.completed', resourceType: 'run', resourceId: nextRun.id, requestId: nextRun.requestId, runId: nextRun.id, detail: `${nextRun.entitiesProcessed} ${nextRun.entityType.split('.')[1]} record${nextRun.entitiesProcessed === 1 ? '' : 's'} · ${nextRun.targetConnectorIds.length} targets${retried ? ' · 1 retried' : ''}`, at });
    const meterId = `meter_${nextRun.id}`;
    next.meteringEvents[meterId] = { id: meterId, tenantId: nextRun.tenantId, sourceEventId: eventId, connectorId: nextRun.connectorId, metric: 'entities.synced', quantity: nextRun.entitiesProcessed, createdAt: at };
  }

  if (stage === 'webhook') {
    const eventId = isLive ? live.eventId : `evt_${nextRun.id}`;
    const subscriptions = Object.values(next.webhookSubscriptions).filter((sub) => sub.tenantId === nextRun.tenantId && sub.status === 'active' && (sub.eventTypes.includes('*') || sub.eventTypes.includes('sync.completed')));
    for (const subscription of subscriptions) {
      const isLiveDelivery = isLive && subscription.id === live.subscriptionId;
      const deliveryId = isLiveDelivery ? live.deliveryId : `delivery_${nextRun.id}_${subscription.id}`;
      if (next.deliveries[deliveryId]) continue;
      const delivery = { id: deliveryId, tenantId: nextRun.tenantId, eventId, runId: nextRun.id, requestId: nextRun.requestId, subscriptionId: subscription.id, payloadId: isLiveDelivery ? live.payloadId : `payload_${nextRun.id}_${subscription.id}`, status: isLiveDelivery ? 'retrying' : 'success', attemptIds: [], createdAt: at };
      if (!isLiveDelivery) {
        const attemptId = `attempt_${deliveryId}_1`;
        next.deliveryAttempts[attemptId] = { id: attemptId, tenantId: nextRun.tenantId, deliveryId, attempt: 1, status: 'success', responseCode: 202, createdAt: at };
        delivery.attemptIds.push(attemptId);
      }
      next.deliveries[deliveryId] = delivery;
      next.deliveryOrder.unshift(deliveryId);
    }
  }

  if (stage === 'complete') completeRun(next, nextRun, at);
  return allow(next);
}

function failTarget(state, action) {
  const run = state.runs[action.runId];
  if (!run) return state;
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  nextRun.faultConnectorId = action.connectorId;
  applyProviderWrite(next, nextRun, stamp(action));
  return allow(next);
}

function retryFailedTarget(state, action) {
  const personaId = action.personaId ?? state.activePersonaId;
  if (!can(personaId, 'sync:retry')) return deny(state, 'sync:retry');
  const run = state.runs[action.runId];
  if (!run) return state;
  const failedIds = run.targetOutcomeIds.filter((id) => state.targetOutcomes[id]?.status === 'failed');
  if (!failedIds.length) return state;
  const at = stamp(action);
  const next = copy(state);
  const nextRun = next.runs[action.runId];
  for (const id of failedIds) {
    const outcome = next.targetOutcomes[id];
    const remoteId = outcome.remoteId ?? `${outcome.connectorId.replace('con_', '')}_${nextRun.canonicalEntityId.replace('entity_', '')}`;
    Object.assign(outcome, { status: 'success', remoteId, errorCode: null, retryable: false, retryCount: (outcome.retryCount ?? 0) + 1 });
    ensureEntityLink(next, nextRun, outcome.connectorId, remoteId);
    if (next.connectors[outcome.connectorId].status === 'warning') next.connectors[outcome.connectorId].status = 'healthy';
  }
  nextRun.status = 'running';
  nextRun.stage = 'identity_link';
  nextRun.stageAt = at;
  audit(next, { actorId: actorIdFor(personaId), action: 'sync.retried', resourceType: 'run', resourceId: nextRun.id, requestId: nextRun.requestId, runId: nextRun.id, detail: `Retried ${failedIds.length} failed target · idempotency key reused`, at });
  return allow(next);
}

function advanceDeliveryAttempt(state, action) {
  const delivery = state.deliveries[action.deliveryId];
  if (!delivery || delivery.status !== 'retrying') return state;
  const at = stamp(action);
  const next = copy(state);
  const nextDelivery = next.deliveries[action.deliveryId];
  const attempt = nextDelivery.attemptIds.length + 1;
  const id = `attempt_${nextDelivery.id}_${attempt}`;
  if (next.deliveryAttempts[id]) return state;
  next.deliveryAttempts[id] = { id, tenantId: nextDelivery.tenantId, deliveryId: nextDelivery.id, attempt, status: 'failed', responseCode: attempt === 1 ? 429 : 503, createdAt: at };
  nextDelivery.attemptIds.push(id);
  return allow(next);
}

function exhaustDelivery(state, action) {
  const delivery = state.deliveries[action.deliveryId];
  if (!delivery || delivery.status !== 'retrying') return state;
  const at = stamp(action);
  const next = copy(state);
  const nextDelivery = next.deliveries[action.deliveryId];
  nextDelivery.status = 'failed';
  const deadLetterId = nextDelivery.id === next.liveIds.deliveryId ? next.liveIds.deadLetterId : `dlq_${nextDelivery.id}`;
  next.deadLetters[deadLetterId] = { id: deadLetterId, tenantId: nextDelivery.tenantId, deliveryId: nextDelivery.id, eventId: nextDelivery.eventId, reason: 'Attempts exhausted after upstream 503 from the subscriber endpoint', createdAt: at };
  next.deadLetterOrder.unshift(deadLetterId);
  next.dependencies.dep_event_delivery.status = 'warning';
  audit(next, { actorId: 'actor_service', action: 'webhook.delivery.exhausted', resourceType: 'delivery', resourceId: nextDelivery.id, requestId: nextDelivery.requestId, runId: nextDelivery.runId, detail: `${nextDelivery.attemptIds.length} attempts · moved to dead-letter queue`, at });
  return allow(next);
}

function replayDeadLetter(state, action) {
  const personaId = action.personaId ?? state.activePersonaId;
  if (!can(personaId, 'delivery:replay')) return deny(state, 'delivery:replay');
  const deadLetter = state.deadLetters[action.deadLetterId];
  if (!deadLetter) return state;
  const at = stamp(action);
  const next = copy(state);
  const delivery = next.deliveries[deadLetter.deliveryId];
  const attemptNumber = delivery.attemptIds.length + 1;
  const attemptId = `attempt_${delivery.id}_${attemptNumber}`;
  next.deliveryAttempts[attemptId] = { id: attemptId, tenantId: delivery.tenantId, deliveryId: delivery.id, attempt: attemptNumber, status: 'success', responseCode: 202, createdAt: at };
  delivery.attemptIds.push(attemptId);
  delivery.status = 'success';
  delete next.deadLetters[deadLetter.id];
  next.deadLetterOrder = next.deadLetterOrder.filter((id) => id !== deadLetter.id);
  const isLive = deadLetter.id === next.liveIds.deadLetterId;
  const replayEvent = audit(next, { id: isLive ? 'evt_live_replay' : `evt_replay_${deadLetter.id}`, actorId: actorIdFor(personaId), action: 'webhook.replayed', resourceType: 'delivery', resourceId: delivery.id, requestId: delivery.requestId, runId: delivery.runId, detail: 'Same event, subscription, and payload identity · delivered on replay', at });
  const meterId = isLive ? 'meter_live_replay' : `meter_replay_${deadLetter.id}`;
  next.meteringEvents[meterId] = { id: meterId, tenantId: delivery.tenantId, sourceEventId: replayEvent.id, connectorId: next.runs[delivery.runId]?.connectorId ?? null, metric: 'webhook.replayed', quantity: 1, createdAt: at };
  if (!Object.values(next.deadLetters).some(({ tenantId }) => tenantId === delivery.tenantId)) next.dependencies.dep_event_delivery.status = 'healthy';
  return allow(next);
}

function createSubscription(state, action) {
  if (!can(state.activePersonaId, 'webhook:manage')) return deny(state, 'webhook:manage');
  const name = action.name?.trim();
  const destination = action.destination?.trim();
  const eventTypes = (action.eventTypes ?? []).filter(Boolean);
  if (!name || !destination || !eventTypes.length) return state;
  const at = stamp(action);
  const next = copy(state);
  const id = sequenceId(next, 'sub');
  next.webhookSubscriptions[id] = { id, tenantId: state.activeTenantId, name, eventTypes, status: 'active', secretState: 'write_only', destination, createdAt: at };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'webhook.subscription.created', resourceType: 'subscription', resourceId: id, detail: `${name} · ${eventTypes.join(', ')}`, at });
  return allow(next);
}

function setSubscriptionStatus(state, action) {
  if (!can(state.activePersonaId, 'webhook:manage')) return deny(state, 'webhook:manage');
  const subscription = state.webhookSubscriptions[action.subscriptionId];
  if (!subscription || subscription.status === action.status) return state;
  const at = stamp(action);
  const next = copy(state);
  next.webhookSubscriptions[action.subscriptionId] = { ...subscription, status: action.status };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: action.status === 'active' ? 'webhook.subscription.resumed' : 'webhook.subscription.paused', resourceType: 'subscription', resourceId: subscription.id, detail: subscription.name, at });
  return allow(next);
}

function inviteMember(state, action) {
  if (!can(state.activePersonaId, 'access:manage')) return deny(state, 'access:manage');
  const email = action.email?.trim().toLowerCase();
  const name = action.name?.trim();
  if (!email || !name || !action.roleId) return state;
  if (Object.values(state.members).some((member) => member.email === email)) return state;
  const at = stamp(action);
  const next = copy(state);
  const id = sequenceId(next, 'actor_invite');
  next.members[id] = { id, tenantId: state.activeTenantId, name, email, roleId: action.roleId, kind: 'member', status: 'invited', lastActiveAt: null, invitedAt: at };
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'member.invited', resourceType: 'member', resourceId: id, detail: `Invitation sent · role ${action.roleId}`, at });
  return allow(next);
}

function scimReconcile(state, action) {
  if (!can(state.activePersonaId, 'access:manage')) return deny(state, 'access:manage');
  const at = stamp(action);
  const next = copy(state);
  next.scim = { ...next.scim, lastProvisionedAt: at };
  const active = Object.values(next.members).filter((member) => member.tenantId === state.activeTenantId && member.status === 'active').length;
  audit(next, { actorId: 'actor_scim', action: 'scim.reconciled', resourceType: 'scim', resourceId: 'scim_okta', detail: `${active} identities reconciled · no external provider contacted`, at });
  return allow(next);
}

function exportAudit(state, action) {
  if (!can(state.activePersonaId, 'audit:export') && !can(state.activePersonaId, 'audit:view')) return deny(state, 'audit:export');
  const at = stamp(action);
  const next = copy(state);
  const id = sequenceId(next, 'export');
  audit(next, { actorId: actorIdFor(state.activePersonaId), action: 'audit.export.requested', resourceType: 'audit', resourceId: id, detail: `${action.scope ?? '30-day'} export · ${action.format ?? 'JSONL'}`, at });
  return allow(next);
}

export function showcaseReducer(state, action) {
  switch (action.type) {
    case ACTIONS.VALIDATE_CONNECTOR: return validateConnector(state, action);
    case ACTIONS.ROTATE_CREDENTIAL: return rotateCredential(state, action);
    case ACTIONS.ADD_CONNECTOR: return addConnector(state, action);
    case ACTIONS.SET_CONNECTOR_ENABLED: return setConnectorEnabled(state, action);
    case ACTIONS.START_SYNC: return startSync(state, action);
    case ACTIONS.ADVANCE_RUN_STAGE: return advanceRunStage(state, action);
    case ACTIONS.FAIL_TARGET: return failTarget(state, action);
    case ACTIONS.RETRY_FAILED_TARGET: return retryFailedTarget(state, action);
    case ACTIONS.ADVANCE_DELIVERY_ATTEMPT: return advanceDeliveryAttempt(state, action);
    case ACTIONS.EXHAUST_DELIVERY: return exhaustDelivery(state, action);
    case ACTIONS.REPLAY_DEAD_LETTER: return replayDeadLetter(state, action);
    case ACTIONS.CREATE_SUBSCRIPTION: return createSubscription(state, action);
    case ACTIONS.SET_SUBSCRIPTION_STATUS: return setSubscriptionStatus(state, action);
    case ACTIONS.INVITE_MEMBER: return inviteMember(state, action);
    case ACTIONS.SCIM_RECONCILE: return scimReconcile(state, action);
    case ACTIONS.EXPORT_AUDIT: return exportAudit(state, action);
    case ACTIONS.SET_PERSONA: return { ...state, activePersonaId: action.personaId, lastDeniedPermission: null };
    case ACTIONS.SET_SCENARIO: return { ...state, scenario: action.scenario };
    case ACTIONS.SET_THEME: return { ...state, theme: action.theme };
    case ACTIONS.SET_DENSITY: return { ...state, density: action.density };
    case ACTIONS.SET_AUTOPILOT: return { ...state, autopilot: Boolean(action.autopilot) };
    case ACTIONS.HYDRATE: return { ...action.state, lastDeniedPermission: null };
    case ACTIONS.RESET_DEMO: return { ...createSeedState({ now: action.at ? Date.parse(action.at) : undefined }), activePersonaId: state.activePersonaId, theme: state.theme, density: state.density };
    default: return state;
  }
}
