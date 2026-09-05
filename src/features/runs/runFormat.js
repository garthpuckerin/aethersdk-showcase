/* Presentation helpers for run records. Every label derives from a record or
   a definition; nothing here invents a metric or a date. */
import { actorIdFor } from '../../access/policy';

const OPERATION_LABELS = {
  provision: 'Provision',
  deactivate: 'Deactivate',
  completion: 'Completion',
  ticket_sync: 'Ticket sync',
  notify: 'Notify',
};

const ERROR_COPY = {
  PROVIDER_RATE_LIMIT: '429 Too Many Requests from the provider. Backed off 3× before failing the target.',
  PROVIDER_TIMEOUT: 'The provider did not answer within the write deadline. Backed off 3× before failing the target.',
  SCHEMA_REJECTED: 'The provider rejected the normalized record. Nothing was partially written.',
};

export function operationLabel(operation) {
  return OPERATION_LABELS[operation] ?? String(operation ?? '').replaceAll('_', ' ');
}

export function directionLabel(direction) {
  return direction ? direction.charAt(0).toUpperCase() + direction.slice(1) : '—';
}

export function providerInitials(name) {
  const words = String(name ?? '').split(/[\s·]+/).filter(Boolean);
  const initials = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : String(name ?? '??').slice(0, 2);
  return initials.toUpperCase();
}

export function providerFor(state, connectorId) {
  const connector = state.connectors[connectorId];
  return connector ? state.providerDefinitions[connector.providerDefinitionId] ?? null : null;
}

export function connectorName(state, connectorId) {
  return state.connectors[connectorId]?.name ?? connectorId;
}

export function errorCopy(code) {
  return ERROR_COPY[code] ?? 'The provider write failed. Only the sanitized error code is retained.';
}

export function latencyLabel(p95Ms) {
  return p95Ms == null ? '—' : `${p95Ms} ms`;
}

export function plural(count, noun) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/* Who asked for the run: the scheduler, an inbound webhook, an agent, or a member. */
export function actorLabel(state, run) {
  if (run.triggeredBy === 'schedule') return 'Scheduler';
  if (run.triggeredBy === 'webhook') return 'Webhook trigger';
  if (run.triggeredBy === 'agent') {
    const agentEvent = Object.values(state.auditEvents).find((event) => event.runId === run.id && state.members[event.actorId]?.kind === 'agent');
    return state.members[agentEvent?.actorId ?? 'actor_agent']?.name ?? 'Agent';
  }
  const humanEvent = Object.values(state.auditEvents).find((event) => event.runId === run.id && state.members[event.actorId]?.kind === 'member');
  const actorId = humanEvent?.actorId ?? actorIdFor(state.activePersonaId);
  return state.members[actorId]?.name ?? 'Operator';
}
