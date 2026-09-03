import { describe, expect, it } from 'vitest';
import { validateFixtureGraph } from './integrity';
import { createSeedState } from './seed';

describe('fixture graph integrity', () => {
  it('has no orphaned or cross-tenant relationships', () => {
    expect(validateFixtureGraph(createSeedState())).toEqual({ valid: true, errors: [] });
  });

  it('detects a run that points to a missing source connector', () => {
    const state = createSeedState();
    const run = state.runs[state.runOrder[0]];
    run.sourceConnectorId = 'con_missing';

    expect(validateFixtureGraph(state)).toEqual({
      valid: false,
      errors: [`run:${run.id} references missing source connector con_missing`],
    });
  });

  it('detects a delivery whose audit event belongs to another tenant', () => {
    const state = createSeedState();
    const delivery = state.deliveries[state.deliveryOrder[0]];
    delivery.eventId = 'evt_other_tenant';

    expect(validateFixtureGraph(state).errors).toContain(
      `delivery:${delivery.id} crosses tenant boundary through event evt_other_tenant`,
    );
  });

  it('reserves but does not pre-seed the live signature chain', () => {
    const state = createSeedState();
    expect(state.runs[state.liveIds.runId]).toBeUndefined();
    expect(state.auditEvents[state.liveIds.eventId]).toBeUndefined();
    expect(state.deliveries[state.liveIds.deliveryId]).toBeUndefined();
    expect(state.deadLetters[state.liveIds.deadLetterId]).toBeUndefined();
  });
});
