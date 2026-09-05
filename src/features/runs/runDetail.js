/* Everything the run detail page shows is derived here from the state graph:
   the related audit event, the delivery that carried it, the dead letter it
   fell into, and the identity links the run produced. */
import { formatRelativeFuture, formatRelativeTime } from '../../demo/clock';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function describeRun(state, run) {
  const live = state.liveIds;
  const source = state.connectors[run.sourceConnectorId ?? run.connectorId] ?? null;
  const targets = run.targetConnectorIds.map((id) => state.connectors[id]).filter(Boolean);
  const entity = state.canonicalEntities[run.canonicalEntityId] ?? null;
  const outcomes = run.targetOutcomeIds.map((id) => state.targetOutcomes[id]).filter(Boolean);
  const failed = outcomes.some(({ status }) => status === 'failed');
  const errorCode = outcomes.find(({ status }) => status === 'failed')?.errorCode ?? null;
  const event = state.auditEvents[`evt_${run.id}`] ?? (run.id === live.runId ? state.auditEvents[live.eventId] ?? null : null);
  const deliveries = Object.values(state.deliveries).filter((delivery) => delivery.runId === run.id);
  // Prefer the delivery that tells the recovery story: the reserved live one,
  // then any delivery still in trouble, then the first delivered.
  const delivery = deliveries.find(({ id }) => id === state.liveIds.deliveryId) ?? deliveries.find(({ status }) => status !== 'success') ?? deliveries[0] ?? null;
  const deadLetter = delivery ? Object.values(state.deadLetters).find((item) => item.deliveryId === delivery.id) ?? null : null;
  const targetIds = new Set(run.targetConnectorIds);
  const linkedConnectorIds = new Set(Object.values(state.entityLinks)
    .filter((link) => link.canonicalEntityId === run.canonicalEntityId && targetIds.has(link.connectorId))
    .map((link) => link.connectorId));
  return { source, targets, entity, outcomes, failed, errorCode, event, delivery, deadLetter, linkedConnectorIds, linkCount: linkedConnectorIds.size };
}

/* Sample payload: the canonical entity as the engine would hand it to a
   provider adapter. Timestamps are shown relative to now, never raw. */
export function samplePayload(entity, now) {
  if (!entity) return {};
  const attributes = Object.fromEntries(Object.entries(entity.attributes ?? {}).map(([key, value]) => {
    if (typeof value !== 'string' || !ISO_RE.test(value)) return [key, value];
    return [key, Date.parse(value) > Date.parse(now) ? formatRelativeFuture(value, now) : formatRelativeTime(value, now)];
  }));
  return { id: entity.id, type: entity.type, displayName: entity.displayName, subtitle: entity.subtitle, attributes, fictional: true };
}
