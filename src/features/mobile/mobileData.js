/* Presentation helpers shared by the companion surfaces. Pure functions over
   the demo state; every number and label still originates in a record or a
   selector. */
import { RUN_STAGES } from '../../demo/reducer';
import { selectDeliveries, selectExceptions } from '../../demo/selectors';

export const STAGE_LABELS = {
  queued: 'Queued',
  authorization: 'Authorization',
  fetch: 'Fetch',
  normalization: 'Normalization',
  match: 'Match',
  provider_write: 'Provider write',
  identity_link: 'Identity link',
  audit: 'Audit',
  webhook: 'Webhook',
  metering: 'Metering',
  complete: 'Complete',
};

export const OPERATION_LABELS = {
  provision: 'Provision',
  deactivate: 'Deactivate',
  completion: 'Completion',
  ticket_sync: 'Ticket sync',
  notify: 'Notify',
};

export const CREDENTIAL_LABELS = {
  reference_valid: 'Valid',
  reference_expiring: 'Expiring',
  reference_missing: 'Missing',
};

export const DIRECTION_LABELS = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  bidirectional: 'Bidirectional',
};

/* The ten working stages; `complete` is the terminal marker, not a step. */
export const PROGRESS_STAGES = RUN_STAGES.filter((stage) => stage !== 'complete');

export function stageLabel(stage) {
  return STAGE_LABELS[stage] ?? String(stage ?? '').replaceAll('_', ' ');
}

export function operationLabel(operation) {
  return OPERATION_LABELS[operation] ?? String(operation ?? '').replaceAll('_', ' ');
}

export function credentialLabel(credentialState) {
  return CREDENTIAL_LABELS[credentialState] ?? String(credentialState ?? '').replaceAll('_', ' ');
}

export function directionLabel(direction) {
  return DIRECTION_LABELS[direction] ?? String(direction ?? '');
}

/* Two-letter mark from the provider name: first letters of the first two
   words, or the first two letters of a single word. */
export function providerInitials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  const mark = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? '').slice(0, 2);
  return mark.toUpperCase();
}

export function providerFor(state, connectorId) {
  const connector = state.connectors[connectorId];
  return connector ? state.providerDefinitions[connector.providerDefinitionId] ?? null : null;
}

export function providerMarkFor(state, connectorId) {
  const provider = providerFor(state, connectorId);
  return providerInitials(provider?.name ?? state.connectors[connectorId]?.name);
}

export function connectorName(state, connectorId) {
  return state.connectors[connectorId]?.name ?? connectorId;
}

/* Each stage of a run resolved to a display state for the progress list. */
export function stageProgress(run) {
  const currentIndex = run.stage === 'complete' ? PROGRESS_STAGES.length : PROGRESS_STAGES.indexOf(run.stage);
  return PROGRESS_STAGES.map((stage, index) => {
    if (index < currentIndex) return { stage, state: 'complete' };
    if (index === currentIndex) return { stage, state: run.status === 'failed' ? 'failed' : 'current' };
    return { stage, state: 'pending' };
  });
}

/* Records the phone needs to recover: dead letters plus runs that failed in
   the last 24 hours. This is the Queue tab badge. */
export function recoveryCount(state) {
  const exceptions = selectExceptions(state);
  return exceptions.deadLetters.length + exceptions.failedRuns.length;
}

export function selectRetryingDeliveries(state) {
  return selectDeliveries(state).filter(({ status }) => status === 'retrying');
}

export function selectRunEvidence(state, runId) {
  const auditEvent = Object.values(state.auditEvents).find((event) => event.runId === runId && event.resourceType === 'run') ?? null;
  const deliveries = selectDeliveries(state).filter((delivery) => delivery.runId === runId);
  return { auditEvent, deliveries };
}
