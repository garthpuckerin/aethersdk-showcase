import { DEMO_ANCHOR_ISO, minutesBeforeAnchor } from './clock';

const NORTHSTAR = 'tenant_northstar';

function keyed(items) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function buildHistory(connectors, entities) {
  const connectorIds = connectors.map(({ id }) => id);
  const targetOutcomes = [];
  const runs = Array.from({ length: 24 }, (_, index) => {
    const sourceConnectorId = connectorIds[index % connectorIds.length];
    let targetConnectorId = connectorIds[(index + 1) % connectorIds.length];
    if (targetConnectorId === sourceConnectorId) targetConnectorId = connectorIds[(index + 2) % connectorIds.length];
    const status = index === 0 ? 'running' : [5, 12, 19].includes(index) ? 'failed' : 'success';
    const id = `run_hist_${String(index + 1).padStart(2, '0')}`;
    const outcomeId = `out_${id}_${targetConnectorId}`;
    targetOutcomes.push({
      id: outcomeId,
      tenantId: NORTHSTAR,
      runId: id,
      connectorId: targetConnectorId,
      status: status === 'failed' ? 'failed' : status === 'running' ? 'running' : 'success',
      remoteId: status === 'success' ? `remote_${index + 100}` : null,
      errorCode: status === 'failed' ? 'PROVIDER_RATE_LIMIT' : null,
      retryable: status === 'failed',
    });
    return {
      id,
      tenantId: NORTHSTAR,
      connectorId: sourceConnectorId,
      sourceConnectorId,
      targetConnectorIds: [targetConnectorId],
      targetOutcomeIds: [outcomeId],
      canonicalEntityId: entities[index % entities.length].id,
      entityType: entities[index % entities.length].type,
      direction: index % 3 === 0 ? 'bidirectional' : index % 2 === 0 ? 'outbound' : 'inbound',
      status,
      entitiesProcessed: 72 + index * 17,
      durationMs: status === 'running' ? null : 1_200 + index * 83,
      p95Ms: 74 + index * 5,
      startedAt: minutesBeforeAnchor(index * 57),
      requestId: `req_hist_${String(index + 1).padStart(2, '0')}`,
      idempotencyKey: `idem_hist_${String(index + 1).padStart(2, '0')}`,
      stage: status === 'running' ? 'provider_write' : 'complete',
    };
  });
  return { runs, targetOutcomes };
}

export function createSeedState() {
  const tenants = [
    { id: NORTHSTAR, name: 'Northstar Labs', plan: 'Scale', entityLimit: 75_000 },
    { id: 'tenant_other', name: 'Fictional Other Tenant', plan: 'Core', entityLimit: 15_000 },
  ];
  const providerDefinitions = [
    { id: 'provider_salesforce_contact', name: 'Salesforce', domain: 'crm', entityType: 'crm.contact' },
    { id: 'provider_hubspot_contact', name: 'HubSpot', domain: 'crm', entityType: 'crm.contact' },
    { id: 'provider_workday_worker', name: 'Workday', domain: 'corporate', entityType: 'corporate.worker' },
    { id: 'provider_slack_message', name: 'Slack', domain: 'media', entityType: 'media.message' },
    { id: 'provider_jira_ticket', name: 'Jira', domain: 'corporate', entityType: 'corporate.ticket' },
    { id: 'provider_canvas_enrollment', name: 'Canvas', domain: 'learning', entityType: 'learning.enrollment' },
    { id: 'provider_notion_page', name: 'Notion', domain: 'media', entityType: 'media.document' },
    { id: 'provider_pipedrive_contact', name: 'Pipedrive', domain: 'crm', entityType: 'crm.contact' },
  ];
  const connectors = [
    { id: 'con_salesforce', tenantId: NORTHSTAR, providerDefinitionId: 'provider_salesforce_contact', name: 'Salesforce CRM', status: 'healthy', direction: 'bidirectional', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(18) },
    { id: 'con_hubspot', tenantId: NORTHSTAR, providerDefinitionId: 'provider_hubspot_contact', name: 'HubSpot CRM', status: 'warning', direction: 'bidirectional', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(65) },
    { id: 'con_workday', tenantId: NORTHSTAR, providerDefinitionId: 'provider_workday_worker', name: 'Workday People', status: 'healthy', direction: 'inbound', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(92) },
    { id: 'con_slack', tenantId: NORTHSTAR, providerDefinitionId: 'provider_slack_message', name: 'Slack Events', status: 'failed', direction: 'inbound', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(130) },
    { id: 'con_jira', tenantId: NORTHSTAR, providerDefinitionId: 'provider_jira_ticket', name: 'Jira Service', status: 'running', direction: 'bidirectional', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(34) },
    { id: 'con_canvas', tenantId: NORTHSTAR, providerDefinitionId: 'provider_canvas_enrollment', name: 'Canvas Learning', status: 'healthy', direction: 'bidirectional', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(80) },
    { id: 'con_notion', tenantId: NORTHSTAR, providerDefinitionId: 'provider_notion_page', name: 'Notion Knowledge', status: 'healthy', direction: 'outbound', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(160) },
    { id: 'con_pipedrive', tenantId: NORTHSTAR, providerDefinitionId: 'provider_pipedrive_contact', name: 'Pipedrive CRM', status: 'inactive', direction: 'outbound', credentialState: 'reference_expired', validatedAt: minutesBeforeAnchor(1_400) },
    { id: 'con_other', tenantId: 'tenant_other', providerDefinitionId: 'provider_hubspot_contact', name: 'Other Tenant CRM', status: 'healthy', direction: 'inbound', credentialState: 'reference_valid', validatedAt: minutesBeforeAnchor(12) },
  ];
  const canonicalEntities = [
    { id: 'entity_contact_ada', tenantId: NORTHSTAR, type: 'crm.contact', displayName: 'Ada Moreno' },
    { id: 'entity_contact_jon', tenantId: NORTHSTAR, type: 'crm.contact', displayName: 'Jon Bell' },
    { id: 'entity_worker_mina', tenantId: NORTHSTAR, type: 'corporate.worker', displayName: 'Mina Cho' },
    { id: 'entity_ticket_142', tenantId: NORTHSTAR, type: 'corporate.ticket', displayName: 'Routing policy review' },
    { id: 'entity_enrollment_88', tenantId: NORTHSTAR, type: 'learning.enrollment', displayName: 'Secure Integrations 201' },
    { id: 'entity_document_31', tenantId: NORTHSTAR, type: 'media.document', displayName: 'Partner onboarding guide' },
    { id: 'entity_org_nova', tenantId: NORTHSTAR, type: 'crm.organization', displayName: 'Nova Fabrication' },
    { id: 'entity_message_54', tenantId: NORTHSTAR, type: 'media.message', displayName: 'Deployment acknowledgment' },
  ];
  const history = buildHistory(connectors.filter(({ tenantId }) => tenantId === NORTHSTAR), canonicalEntities);
  const entityLinks = canonicalEntities.slice(0, 6).map((entity, index) => ({
    id: `link_${index + 1}`,
    tenantId: NORTHSTAR,
    canonicalEntityId: entity.id,
    connectorId: connectors[index].id,
    remoteId: `remote_link_${index + 1}`,
    matchMethod: index % 2 ? 'deterministic_email' : 'provider_identity',
  }));
  const auditEvents = history.runs.slice(1, 13).map((run, index) => ({
    id: `evt_hist_${String(index + 1).padStart(2, '0')}`,
    tenantId: NORTHSTAR,
    actorId: index % 2 ? 'actor_operator' : 'actor_service',
    action: run.status === 'failed' ? 'sync.target_failed' : 'sync.completed',
    resourceType: 'run',
    resourceId: run.id,
    requestId: run.requestId,
    runId: run.id,
    createdAt: run.startedAt,
  }));
  auditEvents.push({ id: 'evt_other_tenant', tenantId: 'tenant_other', actorId: 'actor_other', action: 'connector.validated', resourceType: 'connector', resourceId: 'con_other', requestId: 'req_other', runId: null, createdAt: minutesBeforeAnchor(10) });
  const subscriptions = [
    { id: 'sub_ops', tenantId: NORTHSTAR, name: 'Operations event stream', eventTypes: ['sync.completed', 'sync.target_failed'], status: 'active', secretState: 'write_only' },
    { id: 'sub_audit', tenantId: NORTHSTAR, name: 'Audit archive', eventTypes: ['*'], status: 'active', secretState: 'write_only' },
  ];
  const deliveries = auditEvents.slice(0, 6).map((event, index) => ({
    id: `delivery_hist_${index + 1}`,
    tenantId: NORTHSTAR,
    eventId: event.id,
    subscriptionId: 'sub_ops',
    payloadId: `payload_hist_${index + 1}`,
    status: index === 5 ? 'failed' : 'success',
    attemptIds: [`attempt_hist_${index + 1}_1`, `attempt_hist_${index + 1}_2`],
    createdAt: event.createdAt,
  }));
  const deliveryAttempts = deliveries.flatMap((delivery) => delivery.attemptIds.map((id, attemptIndex) => ({
    id,
    tenantId: NORTHSTAR,
    deliveryId: delivery.id,
    attempt: attemptIndex + 1,
    status: delivery.status === 'failed' ? 'failed' : attemptIndex === 0 ? 'failed' : 'success',
    responseCode: delivery.status === 'failed' ? 503 : attemptIndex === 0 ? 429 : 202,
    createdAt: delivery.createdAt,
  })));
  const deadLetters = [{
    id: 'dlq_hist_1',
    tenantId: NORTHSTAR,
    deliveryId: 'delivery_hist_6',
    eventId: deliveries[5].eventId,
    reason: 'Attempts exhausted after upstream 503',
    createdAt: deliveries[5].createdAt,
  }];
  const meteringEvents = auditEvents.slice(0, 12).map((event, index) => ({
    id: `meter_hist_${index + 1}`,
    tenantId: NORTHSTAR,
    sourceEventId: event.id,
    connectorId: history.runs[index + 1].connectorId,
    metric: 'entities.synced',
    quantity: history.runs[index + 1].entitiesProcessed,
    createdAt: event.createdAt,
  }));
  const dependencies = [
    { id: 'dep_control_plane', tenantId: NORTHSTAR, name: 'Control plane', status: 'healthy', latencyMs: 42 },
    { id: 'dep_connector_registry', tenantId: NORTHSTAR, name: 'Connector registry', status: 'healthy', latencyMs: 18 },
    { id: 'dep_operation_journal', tenantId: NORTHSTAR, name: 'Operation journal', status: 'healthy', latencyMs: 31 },
    { id: 'dep_event_delivery', tenantId: NORTHSTAR, name: 'Event delivery', status: 'warning', latencyMs: 184 },
    { id: 'dep_metering', tenantId: NORTHSTAR, name: 'Metering bridge', status: 'healthy', latencyMs: 26 },
  ];

  return {
    anchorTime: DEMO_ANCHOR_ISO,
    activeTenantId: NORTHSTAR,
    activePersonaId: 'admin',
    scenario: 'default',
    theme: 'light',
    density: 'roomy',
    tenants: keyed(tenants),
    providerDefinitions: keyed(providerDefinitions),
    connectors: keyed(connectors),
    connectorOrder: connectors.map(({ id }) => id),
    canonicalEntities: keyed(canonicalEntities),
    entityLinks: keyed(entityLinks),
    runs: keyed(history.runs),
    runOrder: history.runs.map(({ id }) => id),
    targetOutcomes: keyed(history.targetOutcomes),
    auditEvents: keyed(auditEvents),
    auditOrder: auditEvents.map(({ id }) => id),
    webhookSubscriptions: keyed(subscriptions),
    deliveries: keyed(deliveries),
    deliveryOrder: deliveries.map(({ id }) => id),
    deliveryAttempts: keyed(deliveryAttempts),
    deadLetters: keyed(deadLetters),
    deadLetterOrder: deadLetters.map(({ id }) => id),
    meteringEvents: keyed(meteringEvents),
    dependencies: keyed(dependencies),
    members: {
      actor_admin: { id: 'actor_admin', tenantId: NORTHSTAR, name: 'Amalia Frost', roleId: 'admin', kind: 'member' },
      actor_operator: { id: 'actor_operator', tenantId: NORTHSTAR, name: 'Theo Park', roleId: 'operator', kind: 'member' },
      actor_service: { id: 'actor_service', tenantId: NORTHSTAR, name: 'Sync worker', roleId: 'operator', kind: 'service' },
    },
    liveIds: {
      requestId: 'req_live_northstar_001',
      runId: 'run_live_northstar_001',
      eventId: 'evt_live_northstar_001',
      deliveryId: 'delivery_live_northstar_001',
      deadLetterId: 'dlq_live_northstar_001',
      payloadId: 'payload_live_northstar_001',
      idempotencyKey: 'idem_live_northstar_001',
      subscriptionId: 'sub_ops',
      canonicalEntityId: 'entity_contact_ada',
    },
  };
}
