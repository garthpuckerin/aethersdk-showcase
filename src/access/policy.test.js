import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PERMISSION_LABELS, PERSONAS, actorIdFor, can, personaPermissions, scopeRecords } from './policy';

const TENANT = 'tenant_harborline';

describe('access policy', () => {
  it('defines the four showcase personas once, each with an actor', () => {
    expect(Object.keys(PERSONAS)).toEqual(['admin', 'operator', 'auditor', 'developer']);
    for (const [id, persona] of Object.entries(PERSONAS)) {
      expect(persona.id).toBe(id);
      expect(persona.actorId).toMatch(/^actor_/);
      expect(persona.label).toBeTruthy();
    }
  });

  it('answers can() from the persona permission list and denies unknown personas', () => {
    expect(can('admin', 'access:manage')).toBe(true);
    expect(can('admin', 'anything:else')).toBe(true);
    expect(can('operator', 'delivery:replay')).toBe(true);
    expect(can('operator', 'access:manage')).toBe(false);
    expect(can('auditor', 'audit:view')).toBe(true);
    expect(can('auditor', 'audit:export')).toBe(true);
    expect(can('auditor', 'sync:run')).toBe(false);
    expect(can('auditor', 'delivery:replay')).toBe(false);
    expect(can('developer', 'sync:retry')).toBe(true);
    expect(can('developer', 'webhook:view')).toBe(false);
    expect(can('ghost', 'overview:view')).toBe(false);
    expect(can(undefined, 'overview:view')).toBe(false);
  });

  it('expands the admin wildcard to every labelled permission', () => {
    expect(personaPermissions('admin')).toEqual(Object.keys(PERMISSION_LABELS));
    expect(personaPermissions('operator')).toEqual(PERSONAS.operator.permissions);
    expect(personaPermissions('ghost')).toEqual([]);
    for (const persona of Object.values(PERSONAS)) {
      for (const permission of personaPermissions(persona.id)) expect(PERMISSION_LABELS[permission], `${persona.id} → ${permission}`).toBeTruthy();
    }
  });

  it('labels every permission the reducer checks', () => {
    const source = readFileSync('src/demo/reducer.js', 'utf8');
    const used = [...new Set([...source.matchAll(/'([a-z]+:[a-z]+)'/g)].map(([, permission]) => permission))];
    expect(used.length).toBeGreaterThan(5);
    for (const permission of used) expect(PERMISSION_LABELS[permission], permission).toBeTruthy();
  });

  it('maps personas to actors and falls back to the service account', () => {
    expect(actorIdFor('admin')).toBe('actor_admin');
    expect(actorIdFor('operator')).toBe('actor_operator');
    expect(actorIdFor('auditor')).toBe('actor_auditor');
    expect(actorIdFor('developer')).toBe('actor_developer');
    expect(actorIdFor('ghost')).toBe('actor_service');
    expect(actorIdFor(undefined)).toBe('actor_service');
  });

  it('scopes developers to the learning-platform connectors within the tenant', () => {
    const records = [
      { id: 'a', tenantId: TENANT, connectorId: 'con_docebo' },
      { id: 'b', tenantId: TENANT, connectorId: 'con_linkedin' },
      { id: 'c', tenantId: TENANT, connectorId: 'con_ukg' },
      { id: 'd', tenantId: 'tenant_other', connectorId: 'con_docebo' },
      { id: 'e', tenantId: TENANT },
    ];
    expect(scopeRecords(records, 'developer', TENANT).map(({ id }) => id)).toEqual(['a', 'b', 'e']);
    expect(scopeRecords(records, 'operator', TENANT).map(({ id }) => id)).toEqual(['a', 'b', 'c', 'e']);
    expect(scopeRecords(records, 'ghost', TENANT)).toEqual([]);
    expect(records).toHaveLength(5);
  });

  it('never leaks records across tenants even to an administrator', () => {
    const records = [{ id: 'a', tenantId: TENANT }, { id: 'b', tenantId: 'tenant_other' }];
    expect(scopeRecords(records, 'admin', TENANT).map(({ id }) => id)).toEqual(['a']);
    expect(scopeRecords(records, 'admin', 'tenant_other').map(({ id }) => id)).toEqual(['b']);
  });
});
