/* Referential-integrity contract for the fixture graph and for every state
   the reducer can produce. Runs in unit tests and in `npm run verify:data`. */
function checkOrder(errors, state, mapName, orderName) {
  for (const id of state[orderName]) {
    if (!state[mapName][id]) errors.push(`${orderName} references missing ${mapName} record ${id}`);
  }
  const ordered = new Set(state[orderName]);
  for (const id of Object.keys(state[mapName])) {
    if (!ordered.has(id)) errors.push(`${mapName} record ${id} is missing from ${orderName}`);
  }
}

function sameTenant(left, right) {
  return left && right && left.tenantId === right.tenantId;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function checkTimestamp(errors, label, value, anchor) {
  if (value == null) return;
  if (!ISO_RE.test(value)) errors.push(`${label} is not an ISO timestamp`);
  else if (Date.parse(value) > Date.parse(anchor) + 60_000 && !label.includes('startDate')) errors.push(`${label} is in the future relative to the anchor`);
}

export function validateFixtureGraph(state) {
  const errors = [];
  const anchor = state.anchorTime;
  if (!ISO_RE.test(anchor ?? '')) errors.push('anchorTime is not an ISO timestamp');

  checkOrder(errors, state, 'connectors', 'connectorOrder');
  checkOrder(errors, state, 'runs', 'runOrder');
  checkOrder(errors, state, 'auditEvents', 'auditOrder');
  checkOrder(errors, state, 'deliveries', 'deliveryOrder');
  checkOrder(errors, state, 'deadLetters', 'deadLetterOrder');

  for (const connector of Object.values(state.connectors)) {
    if (!state.tenants[connector.tenantId]) errors.push(`connector:${connector.id} references missing tenant ${connector.tenantId}`);
    if (!state.providerDefinitions[connector.providerDefinitionId]) errors.push(`connector:${connector.id} references missing provider definition ${connector.providerDefinitionId}`);
    checkTimestamp(errors, `connector:${connector.id}.validatedAt`, connector.validatedAt, anchor);
    checkTimestamp(errors, `connector:${connector.id}.credentialRotatedAt`, connector.credentialRotatedAt, anchor);
  }

  for (const run of Object.values(state.runs)) {
    const source = state.connectors[run.sourceConnectorId];
    if (!source) errors.push(`run:${run.id} references missing source connector ${run.sourceConnectorId}`);
    else if (!sameTenant(run, source)) errors.push(`run:${run.id} crosses tenant boundary through source connector ${source.id}`);
    const entity = state.canonicalEntities[run.canonicalEntityId];
    if (!entity) errors.push(`run:${run.id} references missing canonical entity ${run.canonicalEntityId}`);
    else if (entity.type !== run.entityType) errors.push(`run:${run.id} entity type ${run.entityType} disagrees with ${entity.id} (${entity.type})`);
    for (const targetId of run.targetConnectorIds) {
      const target = state.connectors[targetId];
      if (!target) errors.push(`run:${run.id} references missing target connector ${targetId}`);
      else if (!sameTenant(run, target)) errors.push(`run:${run.id} crosses tenant boundary through target connector ${targetId}`);
    }
    if (run.targetOutcomeIds.length !== run.targetConnectorIds.length) errors.push(`run:${run.id} has ${run.targetOutcomeIds.length} outcomes for ${run.targetConnectorIds.length} targets`);
    for (const outcomeId of run.targetOutcomeIds) {
      const outcome = state.targetOutcomes[outcomeId];
      if (!outcome) errors.push(`run:${run.id} references missing target outcome ${outcomeId}`);
      else if (outcome.runId !== run.id || !sameTenant(run, outcome)) errors.push(`run:${run.id} has invalid target outcome ${outcomeId}`);
    }
    const anyFailed = run.targetOutcomeIds.some((id) => state.targetOutcomes[id]?.status === 'failed');
    if (run.status === 'success' && anyFailed) errors.push(`run:${run.id} is successful but has a failed target outcome`);
    if (run.status === 'success' && run.stage !== 'complete') errors.push(`run:${run.id} is successful but its stage is ${run.stage}`);
    checkTimestamp(errors, `run:${run.id}.startedAt`, run.startedAt, anchor);
    checkTimestamp(errors, `run:${run.id}.completedAt`, run.completedAt, anchor);
    if (run.completedAt && Date.parse(run.completedAt) < Date.parse(run.startedAt)) errors.push(`run:${run.id} completed before it started`);
  }

  for (const link of Object.values(state.entityLinks)) {
    const entity = state.canonicalEntities[link.canonicalEntityId];
    const connector = state.connectors[link.connectorId];
    if (!entity || !connector) errors.push(`entity-link:${link.id} has a missing endpoint`);
    else if (!sameTenant(link, entity) || !sameTenant(link, connector)) errors.push(`entity-link:${link.id} crosses tenant boundary`);
  }
  const linkKeys = Object.values(state.entityLinks).map((link) => `${link.tenantId}|${link.canonicalEntityId}|${link.connectorId}`);
  if (new Set(linkKeys).size !== linkKeys.length) errors.push('duplicate entity link for the same canonical entity and connector');

  for (const event of Object.values(state.auditEvents)) {
    const resourceMap = event.resourceType === 'run' ? state.runs : event.resourceType === 'connector' ? state.connectors : event.resourceType === 'delivery' ? state.deliveries : event.resourceType === 'member' ? state.members : event.resourceType === 'subscription' ? state.webhookSubscriptions : null;
    if (resourceMap && !resourceMap[event.resourceId]) errors.push(`audit-event:${event.id} references missing ${event.resourceType} ${event.resourceId}`);
    if (event.runId && !state.runs[event.runId]) errors.push(`audit-event:${event.id} references missing run ${event.runId}`);
    checkTimestamp(errors, `audit-event:${event.id}.createdAt`, event.createdAt, anchor);
  }

  for (const delivery of Object.values(state.deliveries)) {
    const event = state.auditEvents[delivery.eventId];
    const subscription = state.webhookSubscriptions[delivery.subscriptionId];
    if (!event) errors.push(`delivery:${delivery.id} references missing event ${delivery.eventId}`);
    else if (!sameTenant(delivery, event)) errors.push(`delivery:${delivery.id} crosses tenant boundary through event ${delivery.eventId}`);
    if (!subscription) errors.push(`delivery:${delivery.id} references missing subscription ${delivery.subscriptionId}`);
    else if (!sameTenant(delivery, subscription)) errors.push(`delivery:${delivery.id} crosses tenant boundary through subscription ${delivery.subscriptionId}`);
    for (const attemptId of delivery.attemptIds) {
      const attempt = state.deliveryAttempts[attemptId];
      if (!attempt || attempt.deliveryId !== delivery.id) errors.push(`delivery:${delivery.id} has invalid attempt ${attemptId}`);
    }
    if (delivery.status === 'success' && !delivery.attemptIds.some((id) => state.deliveryAttempts[id]?.status === 'success')) errors.push(`delivery:${delivery.id} is successful without a successful attempt`);
  }

  for (const deadLetter of Object.values(state.deadLetters)) {
    const delivery = state.deliveries[deadLetter.deliveryId];
    if (!delivery) errors.push(`dead-letter:${deadLetter.id} references missing delivery ${deadLetter.deliveryId}`);
    else if (!sameTenant(deadLetter, delivery) || delivery.eventId !== deadLetter.eventId || delivery.status !== 'failed') errors.push(`dead-letter:${deadLetter.id} disagrees with delivery ${deadLetter.deliveryId}`);
  }
  const failedWithoutDlq = Object.values(state.deliveries).filter((delivery) => delivery.status === 'failed' && !Object.values(state.deadLetters).some((item) => item.deliveryId === delivery.id));
  for (const delivery of failedWithoutDlq) errors.push(`delivery:${delivery.id} failed without a dead letter`);

  for (const event of Object.values(state.meteringEvents)) {
    const source = state.auditEvents[event.sourceEventId];
    if (!source) errors.push(`metering-event:${event.id} references missing audit event ${event.sourceEventId}`);
    else if (!sameTenant(event, source)) errors.push(`metering-event:${event.id} crosses tenant boundary`);
  }

  for (const member of Object.values(state.members)) {
    if (!state.tenants[member.tenantId]) errors.push(`member:${member.id} references missing tenant`);
    checkTimestamp(errors, `member:${member.id}.lastActiveAt`, member.lastActiveAt, anchor);
  }

  return { valid: errors.length === 0, errors };
}
