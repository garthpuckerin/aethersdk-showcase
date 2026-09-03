function checkOrder(errors, state, mapName, orderName) {
  for (const id of state[orderName]) {
    if (!state[mapName][id]) errors.push(`${orderName} references missing ${mapName} record ${id}`);
  }
}

function sameTenant(left, right) {
  return left && right && left.tenantId === right.tenantId;
}

export function validateFixtureGraph(state) {
  const errors = [];
  checkOrder(errors, state, 'connectors', 'connectorOrder');
  checkOrder(errors, state, 'runs', 'runOrder');
  checkOrder(errors, state, 'auditEvents', 'auditOrder');
  checkOrder(errors, state, 'deliveries', 'deliveryOrder');
  checkOrder(errors, state, 'deadLetters', 'deadLetterOrder');

  for (const connector of Object.values(state.connectors)) {
    if (!state.tenants[connector.tenantId]) errors.push(`connector:${connector.id} references missing tenant ${connector.tenantId}`);
    if (!state.providerDefinitions[connector.providerDefinitionId]) errors.push(`connector:${connector.id} references missing provider definition ${connector.providerDefinitionId}`);
  }

  for (const run of Object.values(state.runs)) {
    const source = state.connectors[run.sourceConnectorId];
    if (!source) errors.push(`run:${run.id} references missing source connector ${run.sourceConnectorId}`);
    else if (!sameTenant(run, source)) errors.push(`run:${run.id} crosses tenant boundary through source connector ${source.id}`);
    if (!state.canonicalEntities[run.canonicalEntityId]) errors.push(`run:${run.id} references missing canonical entity ${run.canonicalEntityId}`);
    for (const targetId of run.targetConnectorIds) {
      const target = state.connectors[targetId];
      if (!target) errors.push(`run:${run.id} references missing target connector ${targetId}`);
      else if (!sameTenant(run, target)) errors.push(`run:${run.id} crosses tenant boundary through target connector ${targetId}`);
    }
    for (const outcomeId of run.targetOutcomeIds) {
      const outcome = state.targetOutcomes[outcomeId];
      if (!outcome) errors.push(`run:${run.id} references missing target outcome ${outcomeId}`);
      else if (outcome.runId !== run.id || !sameTenant(run, outcome)) errors.push(`run:${run.id} has invalid target outcome ${outcomeId}`);
    }
  }

  for (const link of Object.values(state.entityLinks)) {
    const entity = state.canonicalEntities[link.canonicalEntityId];
    const connector = state.connectors[link.connectorId];
    if (!entity || !connector) errors.push(`entity-link:${link.id} has a missing endpoint`);
    else if (!sameTenant(link, entity) || !sameTenant(link, connector)) errors.push(`entity-link:${link.id} crosses tenant boundary`);
  }

  for (const event of Object.values(state.auditEvents)) {
    const resourceMap = event.resourceType === 'run' ? state.runs : event.resourceType === 'connector' ? state.connectors : null;
    if (resourceMap && !resourceMap[event.resourceId]) errors.push(`audit-event:${event.id} references missing ${event.resourceType} ${event.resourceId}`);
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
  }

  for (const deadLetter of Object.values(state.deadLetters)) {
    const delivery = state.deliveries[deadLetter.deliveryId];
    if (!delivery) errors.push(`dead-letter:${deadLetter.id} references missing delivery ${deadLetter.deliveryId}`);
    else if (!sameTenant(deadLetter, delivery) || delivery.eventId !== deadLetter.eventId || delivery.status !== 'failed') errors.push(`dead-letter:${deadLetter.id} disagrees with delivery ${deadLetter.deliveryId}`);
  }

  for (const event of Object.values(state.meteringEvents)) {
    const source = state.auditEvents[event.sourceEventId];
    if (!source) errors.push(`metering-event:${event.id} references missing audit event ${event.sourceEventId}`);
    else if (!sameTenant(event, source)) errors.push(`metering-event:${event.id} crosses tenant boundary`);
  }

  return { valid: errors.length === 0, errors };
}
