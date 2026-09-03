import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { useDemo } from '../../demo/context';
import { selectAuditEvents, selectDeliveries } from '../../demo/selectors';

function resourceHref(event) {
  if (event.resourceType === 'run') return `/app/runs/${event.resourceId}`;
  if (event.resourceType === 'connector') return `/app/integrations?records=${event.resourceId}`;
  if (event.resourceType === 'delivery') return `/app/webhooks?records=${event.resourceId}`;
  return null;
}

export default function AuditPage() {
  const { state } = useDemo();
  const [searchParams] = useSearchParams();
  const [actor, setActor] = useState('all');
  const [action, setAction] = useState('all');
  const [resourceType, setResourceType] = useState('all');
  const [request, setRequest] = useState('');
  const recordIds = (searchParams.get('records') ?? '').split(',').filter(Boolean);
  const events = selectAuditEvents(state).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const deliveries = selectDeliveries(state);
  const actors = [...new Set(events.map(({ actorId }) => actorId))];
  const actions = [...new Set(events.map(({ action: eventAction }) => eventAction))].sort();
  const resourceTypes = [...new Set(events.map(({ resourceType: type }) => type))].sort();
  const rows = events.filter((event) => (!recordIds.length || recordIds.includes(event.id))
    && (actor === 'all' || event.actorId === actor)
    && (action === 'all' || event.action === action)
    && (resourceType === 'all' || event.resourceType === resourceType)
    && (!request || event.requestId.toLowerCase().includes(request.toLowerCase())));
  const columns = [
    { key: 'id', label: 'Event', render: (event) => <code>{event.id}</code> },
    { key: 'action', label: 'Action', render: (event) => <strong>{event.action}</strong> },
    { key: 'actor', label: 'Actor', render: (event) => <span>{state.members[event.actorId]?.name ?? event.actorId}<small>{event.actorId}</small></span> },
    { key: 'resource', label: 'Resource', render: (event) => { const href = resourceHref(event); return href ? <Link to={href}>{event.resourceId}</Link> : <code>{event.resourceId}</code>; } },
    { key: 'request', label: 'Request', render: (event) => <code>{event.requestId}</code> },
    { key: 'related', label: 'Related', render: (event) => { const delivery = deliveries.find(({ eventId }) => eventId === event.id); return delivery ? <Link to={`/app/webhooks?records=${delivery.id}`}>View delivery</Link> : '—'; } },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Govern</p><h1>Audit trail</h1><p>Immutable tenant audit stream. Events remain read-only and retain their actor, resource, request, run, and delivery relationships.</p></div><div className="page-heading__status"><strong>{rows.length}</strong><span>events in view</span></div></section>
      <section className="panel table-panel">
        <div className="run-filters audit-filters">
          <label>Actor<select aria-label="Audit actor" value={actor} onChange={(event) => setActor(event.target.value)}><option value="all">All actors</option>{actors.map((id) => <option key={id} value={id}>{state.members[id]?.name ?? id}</option>)}</select></label>
          <label>Action<select aria-label="Audit action" value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All actions</option>{actions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Resource<select aria-label="Resource type" value={resourceType} onChange={(event) => setResourceType(event.target.value)}><option value="all">All resources</option>{resourceTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Request identity<input type="search" aria-label="Request identity" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="req_…" /></label>
        </div>
        <DataTable ariaLabel="Audit events" columns={columns} rows={rows} />
      </section>
    </div>
  );
}
