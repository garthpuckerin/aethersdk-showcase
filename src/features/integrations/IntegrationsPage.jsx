import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { selectConnectorHealth, selectVisibleConnectors } from '../../demo/selectors';
import ConnectorDrawer from './ConnectorDrawer';

export default function IntegrationsPage() {
  const { state } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const recordParam = searchParams.get('records') ?? '';
  const recordFilter = useMemo(() => recordParam.split(',').filter(Boolean), [recordParam]);
  const connectors = selectVisibleConnectors(state);
  const rows = useMemo(() => connectors.filter((connector) => {
    const provider = state.providerDefinitions[connector.providerDefinitionId];
    const matchesRecords = !recordFilter.length || recordFilter.includes(connector.id);
    const matchesQuery = `${connector.name} ${provider.name} ${provider.entityType}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || connector.status === status;
    return matchesRecords && matchesQuery && matchesStatus;
  }), [connectors, query, recordFilter, state.providerDefinitions, status]);

  const columns = [
    { key: 'name', label: 'Integration', render: (connector) => <button type="button" className="table-link" onClick={() => setSelectedId(connector.id)} aria-label={`View ${connector.name}`}>{connector.name}<small>{connector.id}</small></button> },
    { key: 'provider', label: 'Provider / type', render: (connector) => { const provider = state.providerDefinitions[connector.providerDefinitionId]; return <span>{provider.name}<small>{provider.entityType}</small></span>; } },
    { key: 'direction', label: 'Direction', render: (connector) => connector.direction },
    { key: 'health', label: 'Health', render: (connector) => <StatusBadge status={connector.status} /> },
    { key: 'lastRun', label: 'Last run', render: (connector) => <code>{selectConnectorHealth(state, connector.id).lastRunId ?? '—'}</code> },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Operate</p><h1>Integrations</h1><p>Connector definitions, credential references, health, and runs resolved from one tenant-scoped graph.</p></div><div className="page-heading__status"><strong>{connectors.length}</strong><span>visible connectors</span></div></section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <label><span className="sr-only">Filter integrations</span><input type="search" aria-label="Filter integrations" placeholder="Filter by connector, provider, or type" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="healthy">Healthy</option><option value="warning">Warning</option><option value="failed">Failed</option><option value="running">Running</option><option value="inactive">Inactive</option></select></label>
        </div>
        {recordFilter.length > 0 && <p className="filter-context">Showing {rows.length} contributing records <button type="button" onClick={() => setSearchParams({})}>Clear drill-down</button></p>}
        <DataTable ariaLabel="Integrations" columns={columns} rows={rows} />
      </section>
      {selectedId && <ConnectorDrawer connectorId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
