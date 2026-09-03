import { describe, expect, it } from 'vitest';
import { PERSONAS, can, scopeRecords } from './policy';

describe('access policy', () => {
  it('defines the four showcase personas once', () => {
    expect(Object.keys(PERSONAS)).toEqual(['admin', 'operator', 'auditor', 'developer']);
  });

  it('allows operators to recover deliveries without managing access', () => {
    expect(can('operator', 'delivery:replay')).toBe(true);
    expect(can('operator', 'access:manage')).toBe(false);
  });

  it('keeps auditors read-only', () => {
    expect(can('auditor', 'audit:view')).toBe(true);
    expect(can('auditor', 'sync:run')).toBe(false);
    expect(can('auditor', 'delivery:replay')).toBe(false);
  });

  it('scopes developers to assigned connectors and the current tenant', () => {
    const records = [
      { id: 'a', tenantId: 'tenant_northstar', connectorId: 'con_hubspot' },
      { id: 'b', tenantId: 'tenant_northstar', connectorId: 'con_workday' },
      { id: 'c', tenantId: 'tenant_other', connectorId: 'con_hubspot' },
    ];

    expect(scopeRecords(records, 'developer', 'tenant_northstar').map(({ id }) => id)).toEqual(['a']);
  });

  it('never leaks records across tenants even to an administrator', () => {
    const records = [
      { id: 'a', tenantId: 'tenant_northstar' },
      { id: 'b', tenantId: 'tenant_other' },
    ];

    expect(scopeRecords(records, 'admin', 'tenant_northstar').map(({ id }) => id)).toEqual(['a']);
  });
});
