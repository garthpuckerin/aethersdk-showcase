import { describe, expect, it } from 'vitest';
import { buildFaultedLiveState, buildRecoveredLiveState, buildState } from '../test/fixture-builders';
import { hoursBefore } from './clock';
import { validateFixtureGraph } from './integrity';

function firstSuccessful(state, collection) {
  return Object.values(state[collection]).find((record) => record.tenantId === state.activeTenantId && record.status === 'success');
}

describe('fixture graph integrity', () => {
  it('accepts the seed and every state the signature workflow produces', () => {
    expect(validateFixtureGraph(buildState())).toEqual({ valid: true, errors: [] });
    expect(validateFixtureGraph(buildFaultedLiveState())).toEqual({ valid: true, errors: [] });
    expect(validateFixtureGraph(buildRecoveredLiveState())).toEqual({ valid: true, errors: [] });
  });

  it('reserves but does not pre-seed the live signature chain', () => {
    const state = buildState();
    expect(state.runs[state.liveIds.runId]).toBeUndefined();
    expect(state.auditEvents[state.liveIds.eventId]).toBeUndefined();
    expect(state.deliveries[state.liveIds.deliveryId]).toBeUndefined();
    expect(state.deadLetters[state.liveIds.deadLetterId]).toBeUndefined();
  });

  it('catches a record missing from its order list and an order entry with no record', () => {
    const orphaned = buildState((state) => {
      state.runOrder = state.runOrder.slice(1);
      return state;
    });
    expect(validateFixtureGraph(orphaned).errors).toEqual([`runs record ${buildState().runOrder[0]} is missing from runOrder`]);

    const dangling = buildState((state) => {
      state.auditOrder.push('evt_missing');
      return state;
    });
    expect(validateFixtureGraph(dangling).errors).toEqual(['auditOrder references missing auditEvents record evt_missing']);
  });

  it('catches a run pointing at a missing source connector', () => {
    const state = buildState((seed) => {
      seed.runs[seed.runOrder[0]].sourceConnectorId = 'con_missing';
      return seed;
    });
    expect(validateFixtureGraph(state)).toEqual({ valid: false, errors: [`run:${state.runOrder[0]} references missing source connector con_missing`] });
  });

  it('catches an entity link that crosses the tenant boundary', () => {
    const state = buildState((seed) => {
      seed.entityLinks.link_cross = { id: 'link_cross', tenantId: seed.activeTenantId, canonicalEntityId: 'entity_emp_ada', connectorId: 'con_other', remoteId: 'x', matchMethod: 'deterministic_email' };
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual(['entity-link:link_cross crosses tenant boundary']);
  });

  it('catches a duplicate link for the same entity and connector', () => {
    const state = buildState((seed) => {
      const [original] = Object.values(seed.entityLinks);
      seed.entityLinks.link_dupe = { ...original, id: 'link_dupe' };
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual(['duplicate entity link for the same canonical entity and connector']);
  });

  it('catches a successful run that carries a failed target outcome', () => {
    let runId;
    const state = buildState((seed) => {
      const run = firstSuccessful(seed, 'runs');
      runId = run.id;
      seed.targetOutcomes[run.targetOutcomeIds[0]].status = 'failed';
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual([`run:${runId} is successful but has a failed target outcome`]);
  });

  it('catches a successful run whose stage never reached complete', () => {
    let runId;
    const state = buildState((seed) => {
      const run = firstSuccessful(seed, 'runs');
      runId = run.id;
      run.stage = 'webhook';
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual([`run:${runId} is successful but its stage is webhook`]);
  });

  it('catches timestamps ahead of the anchor and malformed timestamps', () => {
    const future = buildState((seed) => {
      seed.connectors.con_ukg.validatedAt = hoursBefore(seed.anchorTime, -2);
      return seed;
    });
    expect(validateFixtureGraph(future).errors).toEqual(['connector:con_ukg.validatedAt is in the future relative to the anchor']);

    const malformed = buildState((seed) => {
      seed.members.actor_admin.lastActiveAt = 'yesterday';
      return seed;
    });
    expect(validateFixtureGraph(malformed).errors).toEqual(['member:actor_admin.lastActiveAt is not an ISO timestamp']);
  });

  it('catches a delivery whose audit event belongs to another tenant', () => {
    const state = buildState((seed) => {
      seed.deliveries[seed.deliveryOrder[0]].eventId = 'evt_other_tenant';
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toContain(`delivery:${state.deliveryOrder[0]} crosses tenant boundary through event evt_other_tenant`);
  });

  it('catches a failed delivery with no dead letter', () => {
    let deliveryId;
    const state = buildState((seed) => {
      const delivery = firstSuccessful(seed, 'deliveries');
      deliveryId = delivery.id;
      delivery.status = 'failed';
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual([`delivery:${deliveryId} failed without a dead letter`]);
  });

  it('catches a dead letter that disagrees with its delivery', () => {
    const state = buildState((seed) => {
      seed.deliveries[seed.deadLetters.dlq_hist_1.deliveryId].status = 'success';
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual(expect.arrayContaining([expect.stringMatching(/^dead-letter:dlq_hist_1 disagrees with delivery /)]));
  });

  it('catches a metering event without its source audit event', () => {
    const state = buildState((seed) => {
      seed.meteringEvents.meter_orphan = { id: 'meter_orphan', tenantId: seed.activeTenantId, sourceEventId: 'evt_missing', connectorId: 'con_ukg', metric: 'entities.synced', quantity: 1, createdAt: seed.anchorTime };
      return seed;
    });
    expect(validateFixtureGraph(state).errors).toEqual(['metering-event:meter_orphan references missing audit event evt_missing']);
  });
});
