import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSION_LABELS, PERSONAS, can, personaPermissions } from '../../access/policy';
import DataTable from '../../components/DataTable';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { Button } from '../../components/ui';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectMembers } from '../../demo/selectors';
import InviteMemberDialog from './InviteMemberDialog';
import '../../styles/features/access.css';

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'roles', label: 'Roles' },
  { id: 'scim', label: 'SCIM' },
];
const PERSONA_LIST = Object.values(PERSONAS);
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

/* Member kinds mirror the engine's actor types: a member is a user; service
   and agent actors hold roles like any principal (engine ADR 013). */
function kindLabel(member) {
  if (member.kind === 'service') return 'Service actor';
  if (member.kind === 'agent') return 'Agent actor';
  return 'Member';
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function connectorGrantLabel(persona, connectors) {
  if (!persona) return '—';
  if (persona.connectorIds === '*') return 'All connectors';
  const granted = persona.connectorIds.filter((id) => connectors[id]).length;
  return `${granted} ${granted === 1 ? 'connector' : 'connectors'}`;
}

function lastActiveLabel(member, rel) {
  if (member.status === 'invited') return `Invited ${rel(member.invitedAt)}`;
  return member.lastActiveAt ? rel(member.lastActiveAt) : '—';
}

function statusCounts(members) {
  return members.reduce((counts, member) => ({ ...counts, [member.status]: (counts[member.status] ?? 0) + 1 }), { active: 0, invited: 0, deprovisioned: 0 });
}

function RolePill({ roleId }) {
  return <span className="chip chip--static">{PERSONAS[roleId]?.label ?? roleId}</span>;
}

function MembersTab({ members, connectors, rel, onInspect }) {
  const columns = [
    { key: 'member', label: 'Member', render: (member) => <div className="member-cell"><span className="avatar" aria-hidden="true">{initials(member.name)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div> },
    { key: 'kind', label: 'Kind', render: (member) => kindLabel(member) },
    { key: 'role', label: 'Role', render: (member) => <RolePill roleId={member.roleId} /> },
    { key: 'status', label: 'Status', render: (member) => <StatusBadge status={member.status} /> },
    { key: 'lastActive', label: 'Last active', render: (member) => lastActiveLabel(member, rel) },
    { key: 'grants', label: 'Connector grants', render: (member) => connectorGrantLabel(PERSONAS[member.roleId], connectors) },
    { key: 'actions', label: '', render: (member) => <button type="button" className="table-link" aria-label={`Edit ${member.name}`} onClick={() => onInspect(member.id)}>Edit →</button> },
  ];
  return (
    <section className="panel panel--flush" role="tabpanel" id="access-panel-members" aria-labelledby="access-tab-members">
      <DataTable ariaLabel="Tenant members" columns={columns} rows={members} emptyMessage="No members in this tenant yet. Invite one to get started." />
      <footer className="table-footer"><span>{members.length} identities · roles resolve from the same tenant policy that gates routes and actions</span></footer>
    </section>
  );
}

function MemberDrawer({ member, connectors, rel, onClose, returnFocusRef }) {
  const persona = PERSONAS[member.roleId];
  const permissions = personaPermissions(member.roleId);
  const grantedConnectors = persona?.connectorIds === '*'
    ? Object.values(connectors).filter(({ tenantId }) => tenantId === member.tenantId)
    : (persona?.connectorIds ?? []).map((id) => connectors[id]).filter(Boolean);
  return (
    <Drawer open onClose={onClose} title={member.name} returnFocusRef={returnFocusRef} className="member-drawer">
      <div className="drawer-stack">
        <div className="callout">
          <strong>Read-only projection</strong>
          <p>This shows what {member.name}&rsquo;s role resolves to right now. Role changes and deprovisioning arrive as SCIM lifecycle events from the identity provider; the console does not edit identities directly.</p>
        </div>
        <dl className="detail-list">
          <div><dt>Email</dt><dd><code>{member.email}</code></dd></div>
          <div><dt>Kind</dt><dd>{kindLabel(member)}</dd></div>
          <div><dt>Role</dt><dd><RolePill roleId={member.roleId} /></dd></div>
          <div><dt>Status</dt><dd><StatusBadge status={member.status} /></dd></div>
          <div><dt>Last active</dt><dd>{lastActiveLabel(member, rel)}</dd></div>
          <div><dt>Stable id</dt><dd><code>{member.id}</code></dd></div>
        </dl>
        <section>
          <h3>Permissions · {permissions.length}</h3>
          <ul className="permission-chips">
            {permissions.map((permission) => <li key={permission}><code>{permission}</code><span>{PERMISSION_LABELS[permission]}</span></li>)}
          </ul>
        </section>
        <section>
          <h3>Connector grants · {persona?.connectorIds === '*' ? `all ${grantedConnectors.length}` : grantedConnectors.length}</h3>
          <ul className="record-list">
            {grantedConnectors.map((connector) => <li key={connector.id}><div><strong>{connector.name}</strong><small>{connector.id}</small></div><StatusBadge status={connector.status} /></li>)}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}

function RoleMatrix() {
  return (
    <div className="panel panel--flush">
      <div className="data-table-wrap">
        <table className="data-table matrix-table" aria-label="Role permission matrix">
          <thead>
            <tr>
              <th scope="col">Permission</th>
              {PERSONA_LIST.map((persona) => <th scope="col" key={persona.id}>{persona.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <th scope="row"><code>{permission}</code><small>{PERMISSION_LABELS[permission]}</small></th>
                {PERSONA_LIST.map((persona) => {
                  const granted = can(persona.id, permission);
                  return <td key={persona.id}><span className={granted ? 'matrix-table__granted' : 'matrix-table__none'} aria-label={granted ? `${persona.label}: granted` : `${persona.label}: not granted`}>{granted ? '✓' : '—'}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesTab({ members, connectors }) {
  const [compare, setCompare] = useState(false);
  return (
    <div className="page-stack" role="tabpanel" id="access-panel-roles" aria-labelledby="access-tab-roles">
      <div className="roles-header">
        <p className="lede">Four tenant roles. Permissions are resolved by the same policy that gates every route and action in this console.</p>
        <Button variant="ghost" aria-pressed={compare} onClick={() => setCompare((value) => !value)}>Compare</Button>
      </div>
      {compare && <RoleMatrix />}
      <div className="role-grid">
        {PERSONA_LIST.map((persona) => {
          const permissions = personaPermissions(persona.id);
          const holders = members.filter(({ roleId }) => roleId === persona.id).length;
          return (
            <article className="panel role-card" key={persona.id}>
              <div className="role-card__meta">
                <h2>{persona.label}</h2>
                <span className="chip chip--static">{holders} {holders === 1 ? 'member' : 'members'}</span>
              </div>
              <p>{persona.description}</p>
              <p className="role-card__count">{permissions.length} permissions · {connectorGrantLabel(persona, connectors)}</p>
              <ul className="permission-chips">
                {permissions.map((permission) => <li key={permission}><code>{permission}</code><span>{PERMISSION_LABELS[permission]}</span></li>)}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ScimTab({ scim, members, rel, canManage, onReconcile, reconciled, reconcileRef }) {
  const counts = statusCounts(members);
  return (
    <div className="scim-layout" role="tabpanel" id="access-panel-scim" aria-labelledby="access-tab-scim">
      <section className="panel">
        <header className="panel__header">
          <div><p className="eyebrow">Identity lifecycle</p><h2>SCIM provisioning</h2></div>
          <span className="status-badge status-badge--active" aria-label="Status: Connected"><span className="status-badge__dot" aria-hidden="true" />Connected</span>
        </header>
        <dl className="detail-list">
          <div><dt>Identity provider</dt><dd>{scim.provider}</dd></div>
          <div><dt>SCIM endpoint</dt><dd><code>{scim.endpoint}</code></dd></div>
          <div><dt>Bearer token</dt><dd>Write-only reference · never displayed</dd></div>
          <div><dt>Last provisioned</dt><dd>{rel(scim.lastProvisionedAt)}</dd></div>
          <div><dt>Users in sync</dt><dd>{counts.active} active · {counts.invited} invited · {counts.deprovisioned} deprovisioned</dd></div>
        </dl>
        <div className="scim-actions">
          <div className="callout">
            <strong>Local projection</strong>
            <p>The reconciliation preview compares {scim.provider}&rsquo;s last known lifecycle state with the members held in this console. It never calls the identity provider; the result is written to the audit trail as <code>scim.reconciled</code>.</p>
          </div>
          {canManage
            ? <Button ref={reconcileRef} onClick={onReconcile}>Run reconciliation preview</Button>
            : <p className="permission-note">Running a reconciliation preview requires access:manage. Switch persona to Platform Admin.</p>}
          {reconciled && (
            <div className="callout callout--positive" role="status">
              <strong>{counts.active} identities reconciled locally · no identity provider was contacted</strong>
              <p>Recorded as <code>scim.reconciled</code> {rel(scim.lastProvisionedAt)} · <Link to="/app/audit">open the audit trail</Link></p>
            </div>
          )}
        </div>
      </section>
      <section className="panel panel--flush">
        <header className="panel__header scim-mapping__header"><div><p className="eyebrow">Attribute mapping</p><h2>{scim.provider} → console</h2></div></header>
        <div className="data-table-wrap">
          <table className="data-table" aria-label="SCIM attribute mapping">
            <thead><tr><th scope="col">{scim.provider} attribute</th><th scope="col">Console field</th></tr></thead>
            <tbody>
              {scim.mappings.map(([source, target]) => <tr key={source}><td><code>{source}</code></td><td><code>{target}</code></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function AccessPage() {
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const inviteButtonRef = useRef(null);
  const reconcileRef = useRef(null);
  const editButtonRef = useRef(null);
  const [tab, setTab] = useState('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inspectedId, setInspectedId] = useState(null);
  const [reconciled, setReconciled] = useState(false);

  const members = selectMembers(state);
  const canManage = can(state.activePersonaId, 'access:manage');
  const inspected = inspectedId ? state.members[inspectedId] : null;
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const closeDrawer = useCallback(() => setInspectedId(null), []);

  function reconcile() {
    dispatch({ type: ACTIONS.SCIM_RECONCILE });
    setReconciled(true);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Govern</p>
          <h1>Access control</h1>
          <p>Members, roles, and SCIM provisioning for this tenant</p>
        </div>
        <div className="page-heading__actions">
          {canManage
            ? <Button ref={inviteButtonRef} onClick={() => setInviteOpen(true)}>Invite member</Button>
            : <p className="permission-note">Inviting members requires access:manage. Switch persona to Platform Admin.</p>}
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Access control sections">
        {TABS.map((item) => <button key={item.id} type="button" role="tab" id={`access-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`access-panel-${item.id}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>

      {tab === 'members' && <MembersTab members={members} connectors={state.connectors} rel={rel} onInspect={(id) => { editButtonRef.current = document.activeElement; setInspectedId(id); }} />}
      {tab === 'roles' && <RolesTab members={members} connectors={state.connectors} />}
      {tab === 'scim' && <ScimTab scim={state.scim} members={members} rel={rel} canManage={canManage} onReconcile={reconcile} reconciled={reconciled} reconcileRef={reconcileRef} />}

      {inspected && <MemberDrawer member={inspected} connectors={state.connectors} rel={rel} onClose={closeDrawer} returnFocusRef={editButtonRef} />}
      <InviteMemberDialog open={inviteOpen} onClose={closeInvite} returnFocusRef={inviteButtonRef} />
    </div>
  );
}
