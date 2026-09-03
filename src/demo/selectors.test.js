import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import {
  selectConnectorHealth,
  selectFailedRunMetric,
  selectOverviewMetrics,
  selectUsageMetric,
  selectVisibleRuns,
} from './selectors';

describe('cohesive selectors', () => {
  it('cross-foots failed runs to their contributing records', () => {
    const state = createSeedState();
    const metric = selectFailedRunMetric(state, 'operator');
    const actual = selectVisibleRuns(state, 'operator').filter((run) =>
      run.targetOutcomeIds.some((id) => state.targetOutcomes[id].status === 'failed'),
    );

    expect(metric.value).toBe(actual.length);
    expect(metric.recordIds).toEqual(actual.map(({ id }) => id));
  });

  it('derives usage only from visible metering events', () => {
    const state = createSeedState();
    const metric = selectUsageMetric(state, 'operator');
    const expected = Object.values(state.meteringEvents)
      .filter(({ tenantId }) => tenantId === state.activeTenantId)
      .reduce((sum, event) => sum + event.quantity, 0);

    expect(metric.value).toBe(expected);
    expect(metric.recordIds).toHaveLength(
      Object.values(state.meteringEvents).filter(({ tenantId }) => tenantId === state.activeTenantId).length,
    );
  });

  it('scopes developer projections to assigned connectors', () => {
    const state = createSeedState();
    expect(selectVisibleRuns(state, 'developer').every((run) =>
      ['con_hubspot', 'con_salesforce'].includes(run.connectorId),
    )).toBe(true);
  });

  it('resolves connector last-run health from actual runs', () => {
    const state = createSeedState();
    const health = selectConnectorHealth(state, 'con_hubspot');
    expect(state.runs[health.lastRunId].connectorId).toBe('con_hubspot');
    expect(health.status).toBe(state.connectors.con_hubspot.status);
  });

  it('builds overview metrics entirely from drillable selector results', () => {
    const state = createSeedState();
    const metrics = selectOverviewMetrics(state, 'operator');
    for (const metric of Object.values(metrics)) {
      expect(metric).toEqual(expect.objectContaining({ value: expect.any(Number), recordIds: expect.any(Array) }));
    }
  });
});
