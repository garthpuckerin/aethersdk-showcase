/* Fixture-coherence gate. Fails the build when the generated graph stops
   telling one story: referential integrity, the featured providers, an
   anchor-relative clock with an in-flight run straddling "now", no
   pre-seeded live identities, and cross-footed metrics. */
import { runToQuiescence } from '../src/demo/autopilot.js';
import { validateFixtureGraph } from '../src/demo/integrity.js';
import { ACTIONS, showcaseReducer } from '../src/demo/reducer.js';
import { createSeedState } from '../src/demo/seed.js';
import { selectExceptions, selectOverviewMetrics, selectThroughputSeries, selectUsageMetric } from '../src/demo/selectors.js';

const now = Date.now();
const state = createSeedState({ now });
const errors = [...validateFixtureGraph(state).errors];
const tenant = state.activeTenantId;
const connectors = Object.values(state.connectors).filter(({ tenantId }) => tenantId === tenant);
const runs = Object.values(state.runs).filter(({ tenantId }) => tenantId === tenant);
const providers = new Set(connectors.map(({ providerDefinitionId }) => state.providerDefinitions[providerDefinitionId].name));

for (const name of ['UKG Pro', 'Xperience', 'Docebo', 'LinkedIn Learning', 'Axonify', 'Tableau']) if (!providers.has(name)) errors.push(`featured provider ${name} is not connected`);
if (Math.abs(Date.parse(state.anchorTime) - now) > 1000) errors.push('anchorTime is not the boot clock');
const running = runs.filter(({ status }) => status === 'running');
if (running.length !== 1) errors.push(`expected exactly one in-flight run, received ${running.length}`);
if (running[0] && Date.parse(running[0].startedAt) > now) errors.push('the in-flight run starts in the future');
if (runs.some((run) => Date.parse(run.startedAt) > now)) errors.push('a seeded run starts in the future');
for (const key of ['runId', 'eventId', 'deliveryId', 'deadLetterId']) {
  const id = state.liveIds[key];
  if (state.runs[id] || state.auditEvents[id] || state.deliveries[id] || state.deadLetters[id]) errors.push(`live identity ${id} must be created by the workflow, not pre-seeded`);
}
if (Object.values(state.connectors).filter(({ tenantId }) => tenantId !== tenant).length !== 1) errors.push('tenant isolation control record is missing');

/* Cross-footing: overview KPIs ↔ chart ↔ usage ↔ exceptions all agree. */
const metrics = selectOverviewMetrics(state);
const series = selectThroughputSeries(state, '24h');
const chartEntities = series.reduce((sum, bucket) => sum + bucket.value, 0);
if (chartEntities !== metrics.entities.value) errors.push(`24h chart total ${chartEntities} ≠ overview entities ${metrics.entities.value}`);
const chartRuns = series.reduce((sum, bucket) => sum + bucket.runs, 0);
if (chartRuns !== metrics.runs.value) errors.push(`24h chart runs ${chartRuns} ≠ overview runs ${metrics.runs.value}`);
if (metrics.success.value + metrics.failed.value + metrics.running.value !== metrics.runs.value) errors.push('success + failed + running ≠ total runs in the 24h window');
const usage = selectUsageMetric(state);
const meteredSum = Object.values(state.meteringEvents).filter((event) => event.tenantId === tenant && Date.parse(event.createdAt) >= now - 30 * 86_400_000).reduce((sum, event) => sum + event.quantity, 0);
if (usage.value !== meteredSum) errors.push('usage metric does not equal the metering ledger');
const exceptions = selectExceptions(state);
if (exceptions.deadLetters.length !== state.deadLetterOrder.length) errors.push('exception queue disagrees with the dead-letter order');
const nonLinear = series.filter((bucket) => bucket.value > 0).map((bucket) => bucket.value);
if (nonLinear.length > 3 && new Set(nonLinear.slice(1).map((value, index) => value - nonLinear[index])).size === 1) errors.push('throughput series is a straight line (generated-looking fixture)');

/* The signature chain must complete deterministically under the autopilot. */
let live = showcaseReducer(state, { type: ACTIONS.START_SYNC, sourceConnectorId: state.liveIds.sourceConnectorId, targetConnectorIds: state.liveIds.targetConnectorIds });
live = runToQuiescence(showcaseReducer, live);
if (live.runs[state.liveIds.runId]?.status !== 'failed') errors.push('live run did not stop at the deterministic provider-write fault');
live = showcaseReducer(live, { type: ACTIONS.RETRY_FAILED_TARGET, runId: state.liveIds.runId, personaId: 'operator' });
live = runToQuiescence(showcaseReducer, live);
if (!live.deadLetters[state.liveIds.deadLetterId]) errors.push('live delivery did not exhaust into its dead letter');
live = showcaseReducer(live, { type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId: state.liveIds.deadLetterId, personaId: 'operator' });
errors.push(...validateFixtureGraph(live).errors.map((error) => `after workflow: ${error}`));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Fixture graph verified: ${connectors.length} connectors, ${runs.length} runs (${metrics.runs.value} in 24h, ${metrics.successRate}% success), ${Object.keys(state.auditEvents).length} audit events, live chain reserved and completes under autopilot.`);
}
