import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { can } from '../../access/policy';
import StatusBadge from '../../components/StatusBadge';
import { formatDuration } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectVisibleRuns } from '../../demo/selectors';
import { SystemCell } from './ProviderMark';
import RunSyncDialog from './RunSyncDialog';
import { DEFAULT_FILTERS, DIRECTIONS, STATUS_CHIPS, WINDOW_OPTIONS, distinct, filterRuns, paginate, runsInWindow, statusCounts, windowLabel } from './runFilters';
import { directionLabel, latencyLabel, operationLabel, plural, providerFor } from './runFormat';
import '../../styles/features/runs.css';

const COLUMN_COUNT = 9;

function RunRow({ run, state, rel }) {
  const provider = providerFor(state, run.connectorId);
  return (
    <tr data-record-id={run.id}>
      <td><Link className="run-link" to={`/app/runs/${run.id}`}>{run.id}</Link></td>
      <td><SystemCell name={state.connectors[run.connectorId]?.name ?? run.connectorId} providerName={provider?.name} /></td>
      <td>{operationLabel(run.operation)}</td>
      <td className="muted">{directionLabel(run.direction)}</td>
      <td className="num">{run.entitiesProcessed}</td>
      <td className="num muted">{latencyLabel(run.p95Ms)}</td>
      <td className="num muted">{formatDuration(run.durationMs)}</td>
      <td><StatusBadge status={run.status} /></td>
      <td className="muted">{rel(run.startedAt)}</td>
    </tr>
  );
}

export default function RunsPage() {
  const { state } = useDemo();
  const rel = useRelativeTime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const runSyncRef = useRef(null);

  const status = searchParams.get('status') ?? 'all';
  const recordIds = (searchParams.get('records') ?? '').split(',').filter(Boolean);
  const scoped = selectVisibleRuns(state);
  const windowed = recordIds.length ? scoped.filter((run) => recordIds.includes(run.id)) : runsInWindow(state, filters.window);
  const rows = filterRuns(state, windowed, { ...filters, status });
  const counts = statusCounts(windowed);
  const { page: safePage, start, end, pageRows } = paginate(rows, page);
  const providers = distinct(scoped.map((run) => providerFor(state, run.connectorId)?.name));
  const entityTypes = distinct(scoped.map((run) => run.entityType));
  const operations = distinct(scoped.map((run) => run.operation));
  const mayRun = can(state.activePersonaId, 'sync:run');
  const lede = recordIds.length ? `${plural(windowed.length, 'run')} from a linked record set` : `${plural(windowed.length, 'run')} in the ${windowLabel(filters.window)}`;

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  }

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(0);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">Operate</p><h1>Sync runs</h1><p>{lede}</p></div>
        <div className="page-heading__actions">
          <div className="page-heading__status run-counts" aria-label="Status counts">
            <span><strong>{counts.success}</strong> success</span>
            <span><strong>{counts.running}</strong> running</span>
            <span className="run-counts__failed"><strong>{counts.failed}</strong> failed</span>
          </div>
          {mayRun
            ? <button ref={runSyncRef} className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>Run sync</button>
            : <p className="permission-note">Requires sync:run permission.</p>}
        </div>
      </section>

      <section className="panel panel--flush">
        <div className="run-toolbar">
          <div className="chip-row" role="group" aria-label="Run status">
            {STATUS_CHIPS.map(({ value, label }) => <button key={value} type="button" className="chip" aria-pressed={status === value} onClick={() => setParam('status', value === 'all' ? '' : value)}>{label}</button>)}
          </div>
          <select aria-label="Direction" value={filters.direction} onChange={(event) => update({ direction: event.target.value })}>
            <option value="all">All directions</option>
            {DIRECTIONS.map((value) => <option key={value} value={value}>{directionLabel(value)}</option>)}
          </select>
          <select aria-label="Entity type" value={filters.entityType} onChange={(event) => update({ entityType: event.target.value })}>
            <option value="all">All entity types</option>
            {entityTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Provider" value={filters.provider} onChange={(event) => update({ provider: event.target.value })}>
            <option value="all">All providers</option>
            {providers.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Operation" value={filters.operation} onChange={(event) => update({ operation: event.target.value })}>
            <option value="all">All operations</option>
            {operations.map((value) => <option key={value} value={value}>{operationLabel(value)}</option>)}
          </select>
          <select aria-label="Time window" value={filters.window} onChange={(event) => update({ window: event.target.value })} disabled={recordIds.length > 0}>
            {WINDOW_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="search" aria-label="Search runs" placeholder="Run or request id" value={filters.search} onChange={(event) => update({ search: event.target.value })} />
        </div>
        {recordIds.length > 0 && (
          <p className="filter-context">
            <span>Showing {plural(windowed.length, 'run')} linked from another record.</span>
            <button type="button" onClick={() => setParam('records', '')}>Show all runs</button>
          </p>
        )}
        <div className="data-table-wrap">
          <table className="data-table run-table" aria-label="Sync runs">
            <thead>
              <tr>
                <th scope="col">Run ID</th><th scope="col">System</th><th scope="col">Operation</th><th scope="col">Direction</th>
                <th scope="col" className="num">Entities</th><th scope="col" className="num">p95</th><th scope="col" className="num">Duration</th>
                <th scope="col">Status</th><th scope="col">Started</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((run) => <RunRow key={run.id} run={run} state={state} rel={rel} />)}
              {!pageRows.length && <tr><td colSpan={COLUMN_COUNT} className="data-table__empty">No runs match this filter. Switch the status chip, widen the time window, or start a new sync.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="table-footer">
          <span>{rows.length ? `Showing ${start + 1}–${end} of ${rows.length}` : 'No runs in view'}</span>
          <div className="run-pager">
            <button className="button button--ghost button--sm" type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</button>
            <button className="button button--ghost button--sm" type="button" disabled={end >= rows.length} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        </footer>
      </section>

      <RunSyncDialog open={dialogOpen} onClose={() => setDialogOpen(false)} returnFocusRef={runSyncRef} />
    </div>
  );
}
