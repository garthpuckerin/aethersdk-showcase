import { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataTable from '../../components/DataTable';
import Dialog from '../../components/Dialog';
import { Button } from '../../components/ui';
import { hoursBefore } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { RANGES, selectAuditEvents, selectDeliveries } from '../../demo/selectors';
import '../../styles/features/audit.css';

const PAGE_SIZE = 25;
const RESOURCE_TYPES = ['run', 'connector', 'delivery', 'member', 'subscription', 'scim', 'audit'];
const WINDOWS = [{ id: 'all', label: 'All time' }, ...Object.entries(RANGES).map(([id, range]) => ({ id, label: range.label }))];
const EXPORT_SCOPES = [
  { id: '24h', label: 'Last 24 hours', scope: '24-hour' },
  { id: '7d', label: 'Last 7 days', scope: '7-day' },
  { id: '30d', label: 'Last 30 days', scope: '30-day' },
];
const EXPORT_FORMATS = ['JSONL', 'CSV'];
const INITIAL_FILTERS = { search: '', resourceType: 'all', actor: 'all', family: 'all', window: 'all' };

/* The action family is the first dotted segment (sync, connector, webhook…). */
/* Actor kinds mirror the engine's ActorType: user · service · agent (ADR 013). */
function actorKindLabel(member) {
  if (member?.kind === 'service') return 'service';
  if (member?.kind === 'agent') return 'agent';
  return 'user';
}

function actionFamily(action) {
  return action.split('.')[0];
}

/* Semantic tone for the row dot: failures always read as danger. */
function actionTone(action) {
  if (/failed|exhausted|deprovisioned/.test(action)) return 'danger';
  const family = actionFamily(action);
  if (family === 'sync') return 'positive';
  if (family === 'webhook') return 'accent';
  if (family === 'member' || family === 'role') return 'warning';
  return 'info';
}

function resourceHref(event) {
  switch (event.resourceType) {
    case 'run': return `/app/runs/${event.resourceId}`;
    case 'connector': return `/app/integrations?records=${event.resourceId}`;
    case 'delivery': return `/app/webhooks?records=${event.resourceId}`;
    case 'member': return '/app/access';
    case 'subscription': return '/app/webhooks';
    default: return null;
  }
}

function matchesSearch(event, needle) {
  if (!needle) return true;
  return [event.action, event.requestId, event.resourceId, event.id].some((value) => value?.toLowerCase().includes(needle));
}

function ExportDialog({ open, onClose, onSubmit, returnFocusRef }) {
  const [scopeId, setScopeId] = useState('30d');
  const [format, setFormat] = useState(EXPORT_FORMATS[0]);

  function submit(event) {
    event.preventDefault();
    onSubmit({ scope: EXPORT_SCOPES.find(({ id }) => id === scopeId), format });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Export audit trail" returnFocusRef={returnFocusRef}>
      <form className="form-grid export-options" onSubmit={submit}>
        <div className="field" role="group" aria-labelledby="export-scope-label">
          <span id="export-scope-label">Scope</span>
          <div className="segmented">
            {EXPORT_SCOPES.map((option) => <button key={option.id} type="button" aria-pressed={scopeId === option.id} onClick={() => setScopeId(option.id)}>{option.label}</button>)}
          </div>
        </div>
        <label className="field">
          <span>Format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            {EXPORT_FORMATS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <div className="callout">
          <strong>No file is produced in this demo.</strong>
          <p>The request itself is written to the trail as <code>audit.export.requested</code>, which is how a real export would be evidenced.</p>
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Request export</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AuditPage() {
  const { state, dispatch, now } = useDemo();
  const rel = useRelativeTime();
  const [searchParams, setSearchParams] = useSearchParams();
  const exportButtonRef = useRef(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  const recordIds = (searchParams.get('records') ?? '').split(',').filter(Boolean);
  const events = selectAuditEvents(state);
  const deliveries = selectDeliveries(state);
  const actorIds = [...new Set(events.map(({ actorId }) => actorId))];
  const families = [...new Set(events.map(({ action }) => actionFamily(action)))].sort();
  const windowSince = filters.window === 'all' ? null : Date.parse(hoursBefore(now, RANGES[filters.window].hours));
  const needle = filters.search.trim().toLowerCase();

  const rows = events.filter((event) => (!recordIds.length || recordIds.includes(event.id))
    && (filters.resourceType === 'all' || event.resourceType === filters.resourceType)
    && (filters.actor === 'all' || event.actorId === filters.actor)
    && (filters.family === 'all' || actionFamily(event.action) === filters.family)
    && (windowSince == null || Date.parse(event.createdAt) >= windowSince)
    && matchesSearch(event, needle));
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstIndex = rows.length ? currentPage * PAGE_SIZE + 1 : 0;
  const lastIndex = currentPage * PAGE_SIZE + pageRows.length;
  const canExport = can(state.activePersonaId, 'audit:export') || can(state.activePersonaId, 'audit:view');
  /* Stable identity: Dialog re-arms its focus trap whenever onClose changes. */
  const closeExport = useCallback(() => setExportOpen(false), []);

  function updateFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(0);
  }

  function requestExport({ scope, format }) {
    dispatch({ type: ACTIONS.EXPORT_AUDIT, scope: scope.scope, format });
    setExportOpen(false);
    setExportNotice({ scopeLabel: scope.label, format });
  }

  const columns = [
    { key: 'id', label: 'Event', render: (event) => <code>{event.id}</code> },
    { key: 'action', label: 'Action', render: (event) => <span className="audit-action"><span className={`status-dot status-dot--${actionTone(event.action)}`} aria-hidden="true" />{event.action}</span> },
    { key: 'actor', label: 'Actor', render: (event) => { const member = state.members[event.actorId]; return <span className="audit-actor"><strong>{member?.name ?? event.actorId}</strong><small>{actorKindLabel(member)}{event.actorRunId ? <> · <code>{event.actorRunId}</code></> : null}</small></span>;} },
    { key: 'resource', label: 'Resource', render: (event) => { const href = resourceHref(event); return href ? <Link to={href}>{event.resourceId}</Link> : <code>{event.resourceId}</code>; } },
    { key: 'detail', label: 'Detail', render: (event) => <span className="audit-detail">{event.detail ?? '—'}</span> },
    { key: 'request', label: 'Request', render: (event) => <code>{event.requestId}</code> },
    { key: 'time', label: 'Time', render: (event) => <time dateTime={event.createdAt}>{rel(event.createdAt)}</time> },
    { key: 'related', label: 'Related', render: (event) => { const delivery = deliveries.find(({ eventId }) => eventId === event.id); return delivery ? <Link to={`/app/webhooks?records=${delivery.id}`}>View delivery</Link> : <span className="muted">—</span>; } },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Govern</p>
          <h1>Audit trail</h1>
          <p>Read-only, tamper-evident event stream · {events.length} events</p>
        </div>
        <div className="page-heading__actions">
          {canExport
            ? <Button ref={exportButtonRef} variant="ghost" onClick={() => setExportOpen(true)}>Export</Button>
            : <p className="permission-note">Requesting an export needs audit:export or audit:view.</p>}
        </div>
      </section>

      {exportNotice && (
        <div className="callout callout--positive" role="status">
          <strong>Export requested — recorded as an audit event</strong>
          <p>{exportNotice.scopeLabel} · {exportNotice.format} · no file is produced in this demo; the new <code>audit.export.requested</code> row is the evidence a real export would leave.</p>
        </div>
      )}

      <section className="panel panel--flush">
        <div className="table-toolbar audit-toolbar">
          <label className="field field--search">
            <span>Search</span>
            <input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Action, request id, or resource id" />
          </label>
          <label className="field">
            <span>Actor</span>
            <select value={filters.actor} onChange={(event) => updateFilter('actor', event.target.value)}>
              <option value="all">All actors</option>
              {actorIds.map((id) => <option key={id} value={id}>{state.members[id]?.name ?? id}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Action family</span>
            <select value={filters.family} onChange={(event) => updateFilter('family', event.target.value)}>
              <option value="all">All families</option>
              {families.map((family) => <option key={family} value={family}>{family}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Time window</span>
            <select value={filters.window} onChange={(event) => updateFilter('window', event.target.value)}>
              {WINDOWS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="audit-chip-bar" role="group" aria-label="Resource type">
          <span>Resource</span>
          <div className="chip-row">
            <button type="button" className="chip" aria-pressed={filters.resourceType === 'all'} onClick={() => updateFilter('resourceType', 'all')}>All</button>
            {RESOURCE_TYPES.map((type) => <button key={type} type="button" className="chip" aria-pressed={filters.resourceType === type} onClick={() => updateFilter('resourceType', type)}>{type}</button>)}
          </div>
        </div>
        {recordIds.length > 0 && (
          <p className="filter-context">
            <span>Showing {rows.length} linked {rows.length === 1 ? 'event' : 'events'}</span>
            <button type="button" onClick={() => setSearchParams({})}>Show all events</button>
          </p>
        )}
        <DataTable ariaLabel="Audit events" columns={columns} rows={pageRows} emptyMessage="No events match — clear the search or widen the resource type." />
        <footer className="table-footer">
          <span>Showing {firstIndex}–{lastIndex} of {rows.length} events</span>
          <div className="audit-pager">
            <Button variant="ghost" className="button--sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <span>Page {currentPage + 1} of {pageCount}</span>
            <Button variant="ghost" className="button--sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </footer>
      </section>

      <ExportDialog open={exportOpen} onClose={closeExport} onSubmit={requestExport} returnFocusRef={exportButtonRef} />
    </div>
  );
}
