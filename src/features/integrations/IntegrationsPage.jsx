import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectCategories, selectConnectorHealth, selectConnectorVolume, selectVisibleConnectors } from '../../demo/selectors';
import '../../styles/features/integrations.css';
import AddIntegrationDialog from './AddIntegrationDialog';
import ConnectorDrawer from './ConnectorDrawer';
import { DIRECTION_LABELS, ROLE_LABELS, label } from './labels';
import { ProviderMark } from './providerMark';

const STATUS_OPTIONS = [
  ['all', 'All statuses'],
  ['healthy', 'Healthy'],
  ['warning', 'Warning'],
  ['failed', 'Failed'],
  ['running', 'Running'],
  ['inactive', 'Inactive'],
];

function ConnectorCard({ connector, provider, onConfigure, onSync, maySync }) {
  const { state } = useDemo();
  const rel = useRelativeTime();
  const volume = selectConnectorVolume(state, connector.id);
  const health = selectConnectorHealth(state, connector.id);
  const meta = [provider.category, label(DIRECTION_LABELS, connector.direction), connector.enabled ? null : 'Disabled'].filter(Boolean).join(' · ');

  return (
    <li>
      <article className="integration-card" aria-label={connector.name}>
        {connector.credentialState === 'reference_expiring' && (
          <p className="callout callout--warning integration-card__callout">Credential reference expires soon</p>
        )}
        <header className="integration-card__head">
          <ProviderMark name={provider.name} />
          <div className="integration-card__title">
            <h2>{connector.name}</h2>
            <span>{meta}</span>
          </div>
          <StatusBadge status={connector.status} />
        </header>
        <dl className="integration-card__stats">
          <div>
            <dt>Volume</dt>
            <dd className="num">{volume.value.toLocaleString()} <small>entities · 24h</small></dd>
          </div>
          <div>
            <dt>Last sync</dt>
            <dd>{health.lastRunAt ? rel(health.lastRunAt) : 'No runs yet'}</dd>
          </div>
        </dl>
        <span className="integration-card__role">{label(ROLE_LABELS, connector.role)}</span>
        <footer className="integration-card__actions">
          <button type="button" className="button button--ghost button--sm" aria-label={`View ${connector.name}`} onClick={onConfigure}>Configure</button>
          {maySync && (
            <button type="button" className="button button--ghost button--sm" aria-label={`Sync ${connector.name} now`} onClick={onSync}>Sync now</button>
          )}
        </footer>
      </article>
    </li>
  );
}

export default function IntegrationsPage() {
  const { state } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [drawer, setDrawer] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const addButtonRef = useRef(null);
  const openTimer = useRef(null);

  const recordParam = searchParams.get('records') ?? '';
  const recordFilter = useMemo(() => recordParam.split(',').filter(Boolean), [recordParam]);
  const connectors = selectVisibleConnectors(state);
  const categories = selectCategories(state);
  const mayManage = can(state.activePersonaId, 'connector:manage');
  const maySync = can(state.activePersonaId, 'sync:run');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return connectors.filter((connector) => {
      const provider = state.providerDefinitions[connector.providerDefinitionId];
      const haystack = `${connector.name} ${provider.name} ${provider.category} ${provider.entityTypes.join(' ')}`.toLowerCase();
      return (!recordFilter.length || recordFilter.includes(connector.id))
        && (!needle || haystack.includes(needle))
        && (category === 'all' || provider.category === category)
        && (status === 'all' || connector.status === status);
    });
  }, [category, connectors, query, recordFilter, state.providerDefinitions, status]);

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const handleAdded = useCallback((connectorId) => {
    setAddOpen(false);
    clearTimeout(openTimer.current);
    /* Let the catalog dialog hand focus back before the drawer takes it. */
    openTimer.current = setTimeout(() => setDrawer({ connectorId, section: null, fromAdd: true }), 0);
  }, []);
  useEffect(() => () => clearTimeout(openTimer.current), []);

  function clearFilters() {
    setQuery('');
    setCategory('all');
    setStatus('all');
    if (recordFilter.length) setSearchParams({});
  }

  const hasActiveFilter = Boolean(query || category !== 'all' || status !== 'all' || recordFilter.length);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Operate</p>
          <h1>Integrations</h1>
          <p>{connectors.length} connected adapters across {categories.length} categories</p>
        </div>
        {mayManage && (
          <div className="page-heading__actions">
            <button ref={addButtonRef} type="button" className="button button--primary" onClick={() => setAddOpen(true)}>Add integration</button>
          </div>
        )}
      </section>

      <section className="integrations-toolbar" aria-label="Integration filters">
        <label className="field integrations-toolbar__search">
          <span className="sr-only">Filter integrations</span>
          <input type="search" aria-label="Filter integrations" placeholder="Search adapters" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="chip-row" role="group" aria-label="Category">
          <button type="button" className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All</button>
          {categories.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>
          ))}
        </div>
        <label className="field integrations-toolbar__status">
          <span className="sr-only">Status</span>
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
      </section>

      {recordFilter.length > 0 && (
        <p className="filter-context">
          <span>Showing {rows.length} contributing records</span>
          <button type="button" onClick={() => setSearchParams({})}>Clear</button>
        </p>
      )}

      {rows.length ? (
        <ul className="integration-grid" aria-label="Integrations">
          {rows.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              provider={state.providerDefinitions[connector.providerDefinitionId]}
              maySync={maySync}
              onConfigure={() => setDrawer({ connectorId: connector.id, section: null })}
              onSync={() => setDrawer({ connectorId: connector.id, section: 'sync' })}
            />
          ))}
        </ul>
      ) : (
        <DataState
          state="empty"
          title="No adapters match"
          detail={hasActiveFilter ? 'Try a different category or clear the search.' : 'No connectors are visible to this persona yet.'}
          action={hasActiveFilter ? <button type="button" className="button button--ghost" onClick={clearFilters}>Clear filters</button> : null}
        />
      )}

      {drawer && (
        <ConnectorDrawer
          connectorId={drawer.connectorId}
          section={drawer.section}
          onClose={closeDrawer}
          returnFocusRef={drawer.fromAdd ? addButtonRef : undefined}
        />
      )}
      <AddIntegrationDialog open={addOpen} onClose={closeAdd} onAdded={handleAdded} returnFocusRef={addButtonRef} />
    </div>
  );
}
