import { useState } from 'react';
import { PERSONAS } from '../../access/policy';
import DataTable from '../../components/DataTable';
import { useDemo } from '../../demo/context';

export default function AccessPage() {
  const { state } = useDemo();
  const [scimResult, setScimResult] = useState('');
  const members = Object.values(state.members).filter(({ tenantId }) => tenantId === state.activeTenantId);
  const columns = [
    { key: 'name', label: 'Identity', render: (member) => <strong>{member.name}</strong> },
    { key: 'kind', label: 'Kind', render: (member) => member.kind === 'service' ? 'Service actor' : 'Member' },
    { key: 'role', label: 'Role', render: (member) => PERSONAS[member.roleId]?.label ?? member.roleId },
    { key: 'id', label: 'Stable ID', render: (member) => <code>{member.id}</code> },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Govern</p><h1>Access control</h1><p>Members, service actors, connector grants, and permissions resolved from the same tenant policy used by routes and actions.</p></div><div className="page-heading__status"><strong>{members.length}</strong><span>tenant identities</span></div></section>
      <section className="panel table-panel"><DataTable ariaLabel="Tenant identities" columns={columns} rows={members} /></section>
      <section className="role-grid" aria-label="Role definitions">
        {Object.values(PERSONAS).map((persona) => <article className="panel role-card" key={persona.id}><p className="eyebrow">{persona.id}</p><h2>{persona.label}</h2><p>{persona.connectorIds === '*' ? 'All tenant connectors' : `${persona.connectorIds.length} connector grants`}</p><ul>{persona.permissions.map((permission) => <li key={permission}><code>{permission === '*' ? 'All permissions' : permission}</code></li>)}</ul></article>)}
      </section>
      <section className="panel scim-panel"><div><p className="eyebrow">Simulation only</p><h2>SCIM provisioning</h2><p>Preview identity reconciliation without calling an identity provider or changing external accounts.</p></div><button className="button button--primary" type="button" onClick={() => setScimResult(`${members.length} identities reconciled locally. No external system was contacted.`)}>Simulate SCIM sync</button>{scimResult && <output>{scimResult}</output>}</section>
    </div>
  );
}
