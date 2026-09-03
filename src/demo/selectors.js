import { scopeRecords } from '../access/policy';

function values(map) {
  return Object.values(map);
}

function metric(records, value = records.length) {
  return { value, recordIds: records.map(({ id }) => id) };
}

export function selectVisibleConnectors(state, personaId = state.activePersonaId) {
  return scopeRecords(values(state.connectors), personaId, state.activeTenantId);
}

export function selectVisibleRuns(state, personaId = state.activePersonaId) {
  return scopeRecords(values(state.runs), personaId, state.activeTenantId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function selectRuntimeHealth(state) {
  const dependencies = values(state.dependencies).filter(({ tenantId }) => tenantId === state.activeTenantId);
  if (dependencies.some(({ status }) => status === 'failed')) return 'failed';
  if (dependencies.some(({ status }) => status === 'warning')) return 'warning';
  return 'healthy';
}

export function selectFailedRunMetric(state, personaId = state.activePersonaId) {
  const records = selectVisibleRuns(state, personaId).filter((run) =>
    run.targetOutcomeIds.some((id) => state.targetOutcomes[id]?.status === 'failed'),
  );
  return metric(records);
}

export function selectUsageMetric(state, personaId = state.activePersonaId) {
  const records = scopeRecords(values(state.meteringEvents), personaId, state.activeTenantId);
  return metric(records, records.reduce((sum, event) => sum + event.quantity, 0));
}

export function selectConnectorHealth(state, connectorId) {
  const connector = state.connectors[connectorId];
  if (!connector) return null;
  const lastRun = values(state.runs)
    .filter((run) => run.connectorId === connectorId && run.tenantId === connector.tenantId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null;
  return { connectorId, status: connector.status, lastRunId: lastRun?.id ?? null };
}

export function selectOverviewMetrics(state, personaId = state.activePersonaId) {
  const connectors = selectVisibleConnectors(state, personaId);
  const runs = selectVisibleRuns(state, personaId);
  const successfulRuns = runs.filter((run) => run.status === 'success');
  const entities = runs.reduce((sum, run) => sum + run.entitiesProcessed, 0);
  return {
    integrations: metric(connectors.filter(({ status }) => status !== 'inactive')),
    runs: metric(runs),
    success: metric(successfulRuns),
    entities: metric(runs, entities),
    failed: selectFailedRunMetric(state, personaId),
    usage: selectUsageMetric(state, personaId),
  };
}

export function selectAuditEvents(state, personaId = state.activePersonaId) {
  const visibleRunIds = new Set(selectVisibleRuns(state, personaId).map(({ id }) => id));
  return values(state.auditEvents).filter((event) =>
    event.tenantId === state.activeTenantId && (!event.runId || visibleRunIds.has(event.runId)),
  );
}

export function selectDeliveries(state) {
  return values(state.deliveries).filter(({ tenantId }) => tenantId === state.activeTenantId);
}

export function selectDeadLetters(state) {
  return values(state.deadLetters).filter(({ tenantId }) => tenantId === state.activeTenantId);
}
