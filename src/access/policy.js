const ALL_CONNECTORS = '*';

export const PERSONAS = {
  admin: {
    id: 'admin',
    label: 'Platform Admin',
    description: 'Operate and govern the whole tenant',
    actorId: 'actor_admin',
    permissions: ['*'],
    connectorIds: ALL_CONNECTORS,
  },
  operator: {
    id: 'operator',
    label: 'Integration Operator',
    description: 'Run, diagnose, and recover syncs',
    actorId: 'actor_operator',
    permissions: [
      'overview:view', 'integration:view', 'connector:validate', 'connector:manage', 'sync:view',
      'sync:run', 'sync:retry', 'audit:view', 'webhook:view', 'webhook:manage', 'delivery:replay',
      'health:view', 'settings:view',
    ],
    connectorIds: ALL_CONNECTORS,
  },
  auditor: {
    id: 'auditor',
    label: 'Auditor',
    description: 'Inspect immutable operational evidence',
    actorId: 'actor_auditor',
    permissions: [
      'overview:view', 'integration:view', 'sync:view', 'audit:view', 'audit:export',
      'webhook:view', 'health:view',
    ],
    connectorIds: ALL_CONNECTORS,
  },
  developer: {
    id: 'developer',
    label: 'Developer',
    description: 'Work within the learning-platform connectors',
    actorId: 'actor_developer',
    permissions: [
      'overview:view', 'integration:view', 'connector:validate', 'sync:view',
      'sync:run', 'sync:retry', 'health:view',
    ],
    connectorIds: ['con_docebo', 'con_linkedin'],
  },
};

export const PERMISSION_LABELS = {
  'overview:view': 'View the operational overview',
  'integration:view': 'View integrations',
  'connector:validate': 'Validate and rotate credential references',
  'connector:manage': 'Add, enable, and disable connectors',
  'sync:view': 'View sync runs',
  'sync:run': 'Start governed syncs',
  'sync:retry': 'Retry failed targets',
  'audit:view': 'View the audit trail',
  'audit:export': 'Request audit exports',
  'webhook:view': 'View webhooks and deliveries',
  'webhook:manage': 'Create and pause subscriptions',
  'delivery:replay': 'Replay dead letters',
  'access:view': 'View members and roles',
  'access:manage': 'Invite members and run SCIM reconciliation',
  'health:view': 'View runtime health',
  'settings:view': 'View tenant settings',
};

export function can(personaId, permission) {
  const permissions = PERSONAS[personaId]?.permissions ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function personaPermissions(personaId) {
  const persona = PERSONAS[personaId];
  if (!persona) return [];
  return persona.permissions.includes('*') ? Object.keys(PERMISSION_LABELS) : persona.permissions;
}

export function actorIdFor(personaId) {
  return PERSONAS[personaId]?.actorId ?? 'actor_service';
}

export function scopeRecords(records, personaId, tenantId) {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  return records.filter((record) => {
    if (record.tenantId !== tenantId) return false;
    // Connector records are scoped by their own id; everything else by the
    // connector it belongs to. Records with no connector are tenant-wide.
    const scopeId = record.connectorId ?? (record.providerDefinitionId ? record.id : null);
    if (persona.connectorIds === ALL_CONNECTORS || !scopeId) return true;
    return persona.connectorIds.includes(scopeId);
  });
}
