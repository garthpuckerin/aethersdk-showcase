import { describe, expect, it } from 'vitest';
import { PERSONAS } from '../access/policy';
import { buildFaultedLiveState, buildState } from '../test/fixture-builders';
import { hoursBefore } from './clock';
import {
  RANGES,
  selectAuditEvents,
  selectCatalog,
  selectCategories,
  selectConnectorHealth,
  selectConnectorRuns,
  selectConnectorVolume,
  selectExceptions,
  selectFailedRunMetric,
  selectLatencyStats,
  selectOverviewMetrics,
  selectRunsInRange,
  selectRuntimeHealth,
  selectThroughputSeries,
  selectUsageMetric,
  selectVisibleConnectors,
  selectVisibleRuns,
} from './selectors';

const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);
const DEVELOPER_SCOPE = PERSONAS.developer.connectorIds;

describe('cross-footing: the same number everywhere', () => {
  it.each(Object.keys(RANGES))('throughput series (%s) sums to the overview entities and run counts', (range) => {
    const state = buildState();
    const metrics = selectOverviewMetrics(state, 'admin', range);
    const series = selectThroughputSeries(state, range, 'admin');

    expect(series).toHaveLength(RANGES[range].buckets);
    expect(sum(series, (bucket) => bucket.value)).toBe(metrics.entities.value);
    expect(sum(series, (bucket) => bucket.runs)).toBe(metrics.runs.value);
    expect(sum(series, (bucket) => bucket.failed)).toBe(selectRunsInRange(state, range, 'admin').filter((run) => run.status === 'failed').length);
    expect(series.flatMap((bucket) => bucket.recordIds).sort()).toEqual([...metrics.runs.recordIds].sort());
    for (let index = 1; index < series.length; index += 1) {
      expect(Date.parse(series[index].startIso)).toBeGreaterThan(Date.parse(series[index - 1].startIso));
    }
    expect(series.at(-1).endIso).toBe(state.anchorTime);
  });

  it('keeps every bucket internally consistent', () => {
    const state = buildState();
    for (const bucket of selectThroughputSeries(state, '24h')) {
      expect(bucket.recordIds).toHaveLength(bucket.runs);
      expect(bucket.failed).toBeLessThanOrEqual(bucket.runs);
      if (bucket.runs) expect(bucket.successRate).toBe(Math.round(((bucket.runs - bucket.failed) / bucket.runs) * 100));
      else expect(bucket.successRate).toBeNull();
      const p95s = bucket.recordIds.map((id) => state.runs[id].p95Ms).filter((value) => value != null);
      expect(bucket.p95).toBe(p95s.length ? Math.max(...p95s) : null);
    }
  });

  it('cross-foots the failed-run metric to its contributing records', () => {
    const state = buildState();
    const metric = selectFailedRunMetric(state, 'operator');
    const actual = selectRunsInRange(state, '24h', 'operator').filter((run) => run.status === 'failed' || run.targetOutcomeIds.some((id) => state.targetOutcomes[id].status === 'failed'));
    expect(metric.value).toBe(actual.length);
    expect(metric.recordIds).toEqual(actual.map(({ id }) => id));
  });

  it('builds overview metrics from drillable selector results', () => {
    const state = buildState();
    const metrics = selectOverviewMetrics(state, 'operator');
    for (const key of ['integrations', 'runs', 'success', 'entities', 'failed', 'running', 'usage']) {
      expect(metrics[key], key).toEqual(expect.objectContaining({ value: expect.any(Number), recordIds: expect.any(Array) }));
    }
    expect(metrics.successRate).toBe(Math.round((metrics.success.value / metrics.runs.value) * 1000) / 10);
    expect(metrics.running.value).toBe(1);
    expect(metrics.latency).toEqual(selectLatencyStats(state, '24h', 'operator'));
    expect(metrics.range).toBe('24h');
  });

  it('derives usage only from the active tenant metering events in the last 30 days', () => {
    const state = buildState();
    const metric = selectUsageMetric(state, 'operator');
    const visible = Object.values(state.meteringEvents).filter(({ tenantId }) => tenantId === state.activeTenantId);
    expect(metric.value).toBe(sum(visible, (event) => event.quantity));
    expect(metric.recordIds).toHaveLength(visible.length);
  });

  /* Non-negotiable #2 (same number everywhere). Known red as of 2026-09-04:
     selectThroughputSeries drops any run whose startedAt is at/after the
     anchor (`at >= end`), but selectRunsInRange has no upper bound, so every
     operator-started run (wall-clock stamped after the anchor) is counted by
     the KPI and missing from the chart. Fix belongs in src/demo/selectors.js. */
  it('counts a run started by the operator in both the overview and the chart', () => {
    const state = buildFaultedLiveState();
    const metrics = selectOverviewMetrics(state, 'admin', '24h');
    expect(metrics.runs.recordIds).toContain(state.liveIds.runId);
    const series = selectThroughputSeries(state, '24h', 'admin');
    expect(sum(series, (bucket) => bucket.runs)).toBe(metrics.runs.value);
    expect(series.flatMap((bucket) => bucket.recordIds)).toContain(state.liveIds.runId);
  });
});

describe('selectRunsInRange', () => {
  it('respects each range boundary and nests the ranges', () => {
    const state = buildState((seed) => {
      const template = seed.runs[seed.runOrder[0]];
      seed.runs.run_edge = { ...template, id: 'run_edge', startedAt: hoursBefore(seed.anchorTime, 25), completedAt: hoursBefore(seed.anchorTime, 24.9) };
      seed.runOrder.push('run_edge');
      return seed;
    });
    const day = selectRunsInRange(state, '24h');
    const week = selectRunsInRange(state, '7d');
    const month = selectRunsInRange(state, '30d');

    expect(day.map(({ id }) => id)).not.toContain('run_edge');
    expect(week.map(({ id }) => id)).toContain('run_edge');
    expect(day.length).toBeLessThan(week.length);
    expect(week.length).toBeLessThan(month.length);
    expect(month).toHaveLength(selectVisibleRuns(state).length);
    for (const [range, runs] of [['24h', day], ['7d', week], ['30d', month]]) {
      const since = Date.parse(hoursBefore(state.anchorTime, RANGES[range].hours));
      expect(runs.every((run) => Date.parse(run.startedAt) >= since)).toBe(true);
    }
    for (let index = 1; index < month.length; index += 1) {
      expect(Date.parse(month[index].startedAt)).toBeLessThanOrEqual(Date.parse(month[index - 1].startedAt));
    }
  });
});

describe('persona scope', () => {
  it('limits the developer to the Docebo and LinkedIn Learning connectors', () => {
    const state = buildState();
    expect(selectVisibleConnectors(state, 'developer').map(({ id }) => id).sort()).toEqual([...DEVELOPER_SCOPE].sort());
    expect(selectVisibleConnectors(state, 'admin').length).toBeGreaterThan(DEVELOPER_SCOPE.length);
    expect(selectVisibleConnectors(state, 'admin').every(({ tenantId }) => tenantId === state.activeTenantId)).toBe(true);
    expect(selectCategories(state)).toEqual(expect.arrayContaining(['HRIS', 'Learning', 'Analytics']));
    expect(selectVisibleConnectors(state, 'developer').map(({ id }) => id)).not.toContain('con_other');
  });

  it('limits developer runs, audit events, and overview numbers to the scoped connectors', () => {
    const state = buildState();
    const runs = selectVisibleRuns(state, 'developer');
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((run) => DEVELOPER_SCOPE.includes(run.connectorId))).toBe(true);
    expect(runs.length).toBeLessThan(selectVisibleRuns(state, 'admin').length);

    const events = selectAuditEvents(state, 'developer');
    const visibleRunIds = new Set(runs.map(({ id }) => id));
    expect(events.every((event) => event.tenantId === state.activeTenantId && (!event.runId || visibleRunIds.has(event.runId)))).toBe(true);
    expect(events.length).toBeLessThan(selectAuditEvents(state, 'admin').length);
    expect(events.map(({ id }) => id)).not.toContain('evt_other_tenant');

    const developer = selectOverviewMetrics(state, 'developer');
    const admin = selectOverviewMetrics(state, 'admin');
    expect(developer.integrations.value).toBe(DEVELOPER_SCOPE.length);
    expect(developer.runs.value).toBeLessThan(admin.runs.value);
    expect(developer.runs.recordIds.every((id) => DEVELOPER_SCOPE.includes(state.runs[id].connectorId))).toBe(true);
  });
});

describe('exceptions, catalog, latency, connector views', () => {
  it('totals the exception queue from the records the screens list', () => {
    const state = buildState();
    const exceptions = selectExceptions(state);
    expect(exceptions.connectors.map(({ id }) => id)).toEqual(expect.arrayContaining(['con_linkedin', 'con_axonify']));
    expect(exceptions.connectors.every(({ status, credentialState }) => ['warning', 'failed'].includes(status) || credentialState === 'reference_expiring')).toBe(true);
    expect(exceptions.failedRuns.every((run) => run.status === 'failed')).toBe(true);
    expect(exceptions.deadLetters.map(({ id }) => id)).toEqual(['dlq_hist_1']);
    expect(exceptions.total).toBe(exceptions.connectors.length + exceptions.failedRuns.length + exceptions.deadLetters.length);

    const developer = selectExceptions(state, 'developer');
    expect(developer.connectors.every(({ id }) => DEVELOPER_SCOPE.includes(id))).toBe(true);
    expect(developer.total).toBe(developer.connectors.length + developer.failedRuns.length + developer.deadLetters.length);
  });

  it('offers only providers that are not yet connected in the catalog', () => {
    const state = buildState();
    const connected = new Set(Object.values(state.connectors).filter(({ tenantId }) => tenantId === state.activeTenantId).map(({ providerDefinitionId }) => providerDefinitionId));
    const catalog = selectCatalog(state);
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.some(({ id }) => connected.has(id))).toBe(false);
    expect(catalog.map(({ id }) => id)).toEqual(expect.arrayContaining(['provider_workday', 'provider_okta']));
    expect(catalog.map(({ id }) => id)).not.toContain('provider_docebo');
    expect(catalog.length + connected.size).toBe(Object.keys(state.providerDefinitions).length);
  });

  it('orders latency percentiles and counts only runs with a p95 sample', () => {
    const state = buildState();
    const stats = selectLatencyStats(state, '24h');
    expect(stats.samples).toBe(selectRunsInRange(state, '24h').filter((run) => run.p95Ms != null).length);
    expect(stats.samples).toBeGreaterThan(0);
    expect(stats.p50).toBeLessThanOrEqual(stats.p95);
    expect(stats.p95).toBeLessThanOrEqual(stats.p99);
    expect(selectLatencyStats({ ...state, runs: {} })).toEqual({ p50: 0, p95: 0, p99: 0, samples: 0 });
  });

  it('counts connector volume from successful runs in the last 24 hours only', () => {
    const state = buildState();
    const since = Date.parse(hoursBefore(state.anchorTime, 24));
    for (const connectorId of ['con_ukg', 'con_docebo', 'con_tableau']) {
      const expected = Object.values(state.runs).filter((run) => run.tenantId === state.activeTenantId && run.status === 'success' && Date.parse(run.startedAt) >= since && (run.connectorId === connectorId || run.targetConnectorIds.includes(connectorId)));
      const volume = selectConnectorVolume(state, connectorId);
      expect(volume.value).toBe(sum(expected, (run) => run.entitiesProcessed));
      expect(volume.recordIds.sort()).toEqual(expected.map(({ id }) => id).sort());
    }
    const failedOnly = buildState((seed) => {
      for (const run of Object.values(seed.runs)) if (run.connectorId === 'con_jira') run.status = 'failed';
      return seed;
    });
    expect(selectConnectorVolume(failedOnly, 'con_jira').value).toBe(0);
  });

  it('resolves connector health and recent runs from actual runs', () => {
    const state = buildState();
    const health = selectConnectorHealth(state, 'con_docebo');
    const run = state.runs[health.lastRunId];
    expect(run.connectorId === 'con_docebo' || run.targetConnectorIds.includes('con_docebo')).toBe(true);
    expect(health).toEqual(expect.objectContaining({ status: state.connectors.con_docebo.status, lastRunAt: run.startedAt, lastRunStatus: run.status }));
    expect(selectConnectorHealth(state, 'con_missing')).toBeNull();

    const recent = selectConnectorRuns(state, 'con_docebo', 3);
    expect(recent).toHaveLength(3);
    expect(recent[0].id).toBe(health.lastRunId);
    expect(recent.every((item) => item.connectorId === 'con_docebo' || item.targetConnectorIds.includes('con_docebo'))).toBe(true);
  });

  it('derives runtime health from the active tenant dependency graph', () => {
    const state = buildState();
    expect(selectRuntimeHealth(state)).toBe('warning');
    state.dependencies.dep_event_delivery.status = 'healthy';
    expect(selectRuntimeHealth(state)).toBe('healthy');
    state.dependencies.dep_postgres.status = 'failed';
    expect(selectRuntimeHealth(state)).toBe('failed');
  });
});
