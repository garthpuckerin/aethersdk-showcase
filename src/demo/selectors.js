/* Every number on every screen comes from here. Components never keep their
   own copies of records or hand-type a metric. */
import { scopeRecords } from '../access/policy.js';
import { hoursBefore, daysBefore } from './clock.js';

function values(map) {
  return Object.values(map);
}

function metric(records, value = records.length) {
  return { value, recordIds: records.map(({ id }) => id) };
}

export const RANGES = {
  '24h': { hours: 24, buckets: 24, bucketHours: 1, label: 'Last 24 hours' },
  '7d': { hours: 24 * 7, buckets: 7, bucketHours: 24, label: 'Last 7 days' },
  '30d': { hours: 24 * 30, buckets: 30, bucketHours: 24, label: 'Last 30 days' },
};

export function selectTenant(state) {
  return state.tenants[state.activeTenantId];
}

export function selectVisibleConnectors(state, personaId = state.activePersonaId) {
  return scopeRecords(values(state.connectors), personaId, state.activeTenantId);
}

export function selectVisibleRuns(state, personaId = state.activePersonaId) {
  return scopeRecords(values(state.runs), personaId, state.activeTenantId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function selectRunsInRange(state, range = '24h', personaId = state.activePersonaId) {
  const since = Date.parse(hoursBefore(state.anchorTime, RANGES[range].hours));
  return selectVisibleRuns(state, personaId).filter((run) => Date.parse(run.startedAt) >= since);
}

export function selectRuntimeHealth(state) {
  const dependencies = values(state.dependencies).filter(({ tenantId }) => tenantId === state.activeTenantId);
  if (dependencies.some(({ status }) => status === 'failed')) return 'failed';
  if (dependencies.some(({ status }) => status === 'warning')) return 'warning';
  return 'healthy';
}

export function selectFailedRunMetric(state, personaId = state.activePersonaId, range = '24h') {
  const records = selectRunsInRange(state, range, personaId).filter((run) => run.status === 'failed'
    || run.targetOutcomeIds.some((id) => state.targetOutcomes[id]?.status === 'failed'));
  return metric(records);
}

export function selectUsageMetric(state, personaId = state.activePersonaId) {
  const since = Date.parse(daysBefore(state.anchorTime, 30));
  const records = scopeRecords(values(state.meteringEvents), personaId, state.activeTenantId).filter((event) => Date.parse(event.createdAt) >= since);
  return metric(records, records.reduce((sum, event) => sum + event.quantity, 0));
}

export function selectConnectorHealth(state, connectorId) {
  const connector = state.connectors[connectorId];
  if (!connector) return null;
  const lastRun = values(state.runs)
    .filter((run) => run.tenantId === connector.tenantId && (run.connectorId === connectorId || run.targetConnectorIds.includes(connectorId)))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null;
  return { connectorId, status: connector.status, lastRunId: lastRun?.id ?? null, lastRunAt: lastRun?.startedAt ?? null, lastRunStatus: lastRun?.status ?? null };
}

/* Entities that crossed this connector (as source or target) in the last 24h. */
export function selectConnectorVolume(state, connectorId) {
  const since = Date.parse(hoursBefore(state.anchorTime, 24));
  const runs = values(state.runs).filter((run) => run.tenantId === state.activeTenantId && Date.parse(run.startedAt) >= since && run.status === 'success' && (run.connectorId === connectorId || run.targetConnectorIds.includes(connectorId)));
  return metric(runs, runs.reduce((sum, run) => sum + run.entitiesProcessed, 0));
}

export function selectConnectorRuns(state, connectorId, limit = 5) {
  return selectVisibleRuns(state).filter((run) => run.connectorId === connectorId || run.targetConnectorIds.includes(connectorId)).slice(0, limit);
}

export function selectCatalog(state) {
  const connected = new Set(values(state.connectors).filter(({ tenantId }) => tenantId === state.activeTenantId).map(({ providerDefinitionId }) => providerDefinitionId));
  return values(state.providerDefinitions).filter((provider) => !connected.has(provider.id));
}

export function selectCategories(state) {
  return [...new Set(selectVisibleConnectors(state).map((connector) => state.providerDefinitions[connector.providerDefinitionId].category))];
}

export function selectLatencyStats(state, range = '24h', personaId = state.activePersonaId) {
  const samples = selectRunsInRange(state, range, personaId).map((run) => run.p95Ms).filter((value) => value != null).sort((a, b) => a - b);
  if (!samples.length) return { p50: 0, p95: 0, p99: 0, samples: 0 };
  const at = (fraction) => samples[Math.min(samples.length - 1, Math.floor(fraction * samples.length))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), samples: samples.length };
}

export function selectOverviewMetrics(state, personaId = state.activePersonaId, range = '24h') {
  const connectors = selectVisibleConnectors(state, personaId);
  const runs = selectRunsInRange(state, range, personaId);
  const successfulRuns = runs.filter((run) => run.status === 'success');
  const entities = successfulRuns.reduce((sum, run) => sum + run.entitiesProcessed, 0);
  const previousSince = Date.parse(hoursBefore(state.anchorTime, RANGES[range].hours * 2));
  const rangeSince = Date.parse(hoursBefore(state.anchorTime, RANGES[range].hours));
  const previousEntities = selectVisibleRuns(state, personaId).filter((run) => run.status === 'success' && Date.parse(run.startedAt) >= previousSince && Date.parse(run.startedAt) < rangeSince).reduce((sum, run) => sum + run.entitiesProcessed, 0);
  return {
    integrations: metric(connectors.filter(({ status }) => status !== 'inactive')),
    runs: metric(runs),
    success: metric(successfulRuns),
    successRate: runs.length ? Math.round((successfulRuns.length / runs.length) * 1000) / 10 : 0,
    entities: metric(successfulRuns, entities),
    entitiesDelta: previousEntities ? Math.round(((entities - previousEntities) / previousEntities) * 1000) / 10 : null,
    failed: selectFailedRunMetric(state, personaId, range),
    running: metric(runs.filter((run) => run.status === 'running')),
    usage: selectUsageMetric(state, personaId),
    latency: selectLatencyStats(state, range, personaId),
    range,
  };
}

/* Throughput buckets for the chart: one per hour (24h) or per day (7d/30d),
   oldest first, each carrying the run ids that contributed to it. */
export function selectThroughputSeries(state, range = '24h', personaId = state.activePersonaId) {
  const config = RANGES[range];
  const bucketMs = config.bucketHours * 3_600_000;
  const end = Date.parse(state.anchorTime);
  const start = end - config.buckets * bucketMs;
  const buckets = Array.from({ length: config.buckets }, (_, index) => ({ index, startIso: new Date(start + index * bucketMs).toISOString(), endIso: new Date(start + (index + 1) * bucketMs).toISOString(), value: 0, runs: 0, failed: 0, recordIds: [], p95: [] }));
  for (const run of selectVisibleRuns(state, personaId)) {
    const at = Date.parse(run.startedAt);
    if (at < start) continue;
    // Runs stamped at or after the anchor (operator-started) belong to the
    // current bucket so the chart and the KPIs always count the same runs.
    const bucket = buckets[Math.min(config.buckets - 1, Math.floor((at - start) / bucketMs))];
    bucket.runs += 1;
    bucket.recordIds.push(run.id);
    if (run.status === 'failed') bucket.failed += 1;
    if (run.status === 'success') bucket.value += run.entitiesProcessed;
    if (run.p95Ms != null) bucket.p95.push(run.p95Ms);
  }
  return buckets.map((bucket) => ({ ...bucket, p95: bucket.p95.length ? Math.max(...bucket.p95) : null, successRate: bucket.runs ? Math.round(((bucket.runs - bucket.failed) / bucket.runs) * 100) : null }));
}

export function selectAuditEvents(state, personaId = state.activePersonaId) {
  const visibleRunIds = new Set(selectVisibleRuns(state, personaId).map(({ id }) => id));
  return values(state.auditEvents)
    .filter((event) => event.tenantId === state.activeTenantId && (!event.runId || visibleRunIds.has(event.runId)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function selectDeliveries(state) {
  return values(state.deliveries).filter(({ tenantId }) => tenantId === state.activeTenantId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function selectSubscriptions(state) {
  return values(state.webhookSubscriptions).filter(({ tenantId }) => tenantId === state.activeTenantId);
}

export function selectDeadLetters(state) {
  return values(state.deadLetters).filter(({ tenantId }) => tenantId === state.activeTenantId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function selectMembers(state) {
  return values(state.members).filter(({ tenantId }) => tenantId === state.activeTenantId);
}

export function selectDependencies(state) {
  return values(state.dependencies).filter(({ tenantId }) => tenantId === state.activeTenantId);
}

/* The exception queue every persona sees on the overview and the phone. */
export function selectExceptions(state, personaId = state.activePersonaId) {
  const connectors = selectVisibleConnectors(state, personaId).filter(({ status, credentialState }) => ['warning', 'failed'].includes(status) || credentialState === 'reference_expiring');
  const failedRuns = selectRunsInRange(state, '24h', personaId).filter((run) => run.status === 'failed');
  const deadLetters = selectDeadLetters(state);
  return { connectors, failedRuns, deadLetters, total: connectors.length + failedRuns.length + deadLetters.length };
}
