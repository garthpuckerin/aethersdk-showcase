import { validateFixtureGraph } from '../src/demo/integrity.js';
import { createSeedState } from '../src/demo/seed.js';

const state = createSeedState();
const integrity = validateFixtureGraph(state);
const activeTenant = state.activeTenantId;
const connectors = Object.values(state.connectors).filter(({ tenantId }) => tenantId === activeTenant);
const runs = Object.values(state.runs).filter(({ tenantId }) => tenantId === activeTenant);
const success = runs.filter(({ status }) => status === 'success');
const errors = [...integrity.errors];

if (connectors.length !== 8) errors.push(`expected 8 active-tenant connectors, received ${connectors.length}`);
if (runs.length !== 24) errors.push(`expected 24 active-tenant runs, received ${runs.length}`);
if (success.length !== 20) errors.push(`expected 20 successful runs, received ${success.length}`);
if (state.runs[state.liveIds.runId] || state.auditEvents[state.liveIds.eventId] || state.deliveries[state.liveIds.deliveryId] || state.deadLetters[state.liveIds.deadLetterId]) errors.push('live signature identities must be created by the workflow, not pre-seeded');
if (Object.values(state.connectors).filter(({ tenantId }) => tenantId !== activeTenant).length !== 1) errors.push('tenant isolation control record is missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Fixture graph verified: ${connectors.length} connectors, ${success.length}/${runs.length} successful runs, live chain reserved.`);
}
