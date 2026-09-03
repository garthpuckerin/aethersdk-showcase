import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { selectVisibleRuns } from '../../demo/selectors';

function formatDuration(milliseconds) {
  return milliseconds == null ? 'In progress' : `${(milliseconds / 1000).toFixed(2)} s`;
}

export default function RunsPage() {
  const { state } = useDemo();
  const runs = selectVisibleRuns(state);
  const [status, setStatus] = useState('all');
  const [direction, setDirection] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [provider, setProvider] = useState('all');
  const [window, setWindow] = useState('all');
  const providerNames = [...new Set(runs.map((run) => state.providerDefinitions[state.connectors[run.connectorId].providerDefinitionId].name))].sort();
  const entityTypes = [...new Set(runs.map((run) => run.entityType))].sort();
  const rows = runs.filter((run) => {
    const providerName = state.providerDefinitions[state.connectors[run.connectorId].providerDefinitionId].name;
    const ageHours = (Date.parse(state.anchorTime) - Date.parse(run.startedAt)) / 3_600_000;
    return (status === 'all' || run.status === status)
      && (direction === 'all' || run.direction === direction)
      && (entityType === 'all' || run.entityType === entityType)
      && (provider === 'all' || providerName === provider)
      && (window === 'all' || ageHours <= Number.parseInt(window, 10));
  });
  const columns = [
    { key: 'run', label: 'Run', render: (run) => <Link className="record-link" to={`/app/runs/${run.id}`}>{run.id}</Link> },
    { key: 'provider', label: 'Provider', render: (run) => state.providerDefinitions[state.connectors[run.connectorId].providerDefinitionId].name },
    { key: 'entity', label: 'Entity type', render: (run) => <code>{run.entityType}</code> },
    { key: 'direction', label: 'Direction' },
    { key: 'status', label: 'Status', render: (run) => <StatusBadge status={run.status} /> },
    { key: 'duration', label: 'Duration', render: (run) => formatDuration(run.durationMs) },
    { key: 'p95', label: 'p95 latency', render: (run) => run.p95Ms == null ? '—' : `${run.p95Ms} ms` },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Operate</p><h1>Sync runs</h1><p>Tenant-scoped execution history with canonical identities, provider outcomes, and derived latency.</p></div><div className="page-heading__status"><strong>{rows.length}</strong><span>runs in view</span></div></section>
      <section className="panel table-panel">
        <div className="run-filters">
          <label>Run status<select aria-label="Run status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All</option><option value="success">Success</option><option value="failed">Failed</option><option value="running">Running</option></select></label>
          <label>Direction<select aria-label="Run direction" value={direction} onChange={(event) => setDirection(event.target.value)}><option value="all">All</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option><option value="bidirectional">Bidirectional</option></select></label>
          <label>Entity type<select aria-label="Entity type" value={entityType} onChange={(event) => setEntityType(event.target.value)}><option value="all">All</option>{entityTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Provider<select aria-label="Provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">All</option>{providerNames.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Time window<select aria-label="Time window" value={window} onChange={(event) => setWindow(event.target.value)}><option value="all">All</option><option value="6h">Last 6 hours</option><option value="24h">Last 24 hours</option></select></label>
        </div>
        <DataTable ariaLabel="Sync runs" columns={columns} rows={rows} />
      </section>
    </div>
  );
}
