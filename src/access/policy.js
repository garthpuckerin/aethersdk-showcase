const ALL_CONNECTORS = '*';

export const PERSONAS = {
  admin: {
    id: 'admin',
    label: 'Platform Admin',
    permissions: ['*'],
    connectorIds: ALL_CONNECTORS,
  },
  operator: {
    id: 'operator',
    label: 'Integration Operator',
    permissions: [
      'overview:view', 'integration:view', 'connector:validate', 'sync:view',
      'sync:run', 'sync:retry', 'audit:view', 'webhook:view', 'delivery:replay',
      'health:view', 'settings:view',
    ],
    connectorIds: ALL_CONNECTORS,
  },
  auditor: {
    id: 'auditor',
    label: 'Auditor',
    permissions: [
      'overview:view', 'integration:view', 'sync:view', 'audit:view',
      'webhook:view', 'health:view',
    ],
    connectorIds: ALL_CONNECTORS,
  },
  developer: {
    id: 'developer',
    label: 'Developer',
    permissions: [
      'overview:view', 'integration:view', 'connector:validate', 'sync:view',
      'sync:run', 'sync:retry', 'health:view',
    ],
    connectorIds: ['con_hubspot', 'con_salesforce'],
  },
};

export function can(personaId, permission) {
  const permissions = PERSONAS[personaId]?.permissions ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function scopeRecords(records, personaId, tenantId) {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  return records.filter((record) => {
    if (record.tenantId !== tenantId) return false;
    if (persona.connectorIds === ALL_CONNECTORS || !record.connectorId) return true;
    return persona.connectorIds.includes(record.connectorId);
  });
}
