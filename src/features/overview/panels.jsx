import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { formatDuration } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectConnectorHealth } from '../../demo/selectors';
import { activityFamily, directionLabel, providerMark, recordsLink } from './format';

/* Building blocks shared by the roomy and dense overview layouts. Every
   number is read from the record or selector passed in. */

function useProviderName() {
  const { state } = useDemo();
  return (connectorId) => state.providerDefinitions[state.connectors[connectorId]?.providerDefinitionId]?.name ?? connectorId;
}

export function ProviderCell({ name, size }) {
  return (
    <span className="provider-cell">
      <span className={`provider-mark ${size === 'sm' ? 'provider-mark--sm' : ''}`.trim()}>{providerMark(name)}</span>
      <strong>{name}</strong>
    </span>
  );
}

function formatLatency(p95) {
  return p95 == null ? '—' : `${p95.toLocaleString()} ms`;
}

const RUN_COLUMNS = {
  recent: ['system', 'direction', 'entities', 'status', 'started'],
  power: ['id', 'system', 'direction', 'entities', 'p95', 'duration', 'status', 'started'],
};

const HEADERS = {
  id: { label: 'Run ID' },
  system: { label: 'System' },
  direction: { label: 'Direction' },
  entities: { label: 'Entities', className: 'num' },
  p95: { label: 'p95', className: 'num' },
  duration: { label: 'Duration', className: 'num' },
  status: { label: 'Status' },
  started: { label: 'Started', className: 'num' },
};

export function RunsTable({ runs, variant = 'recent', ariaLabel }) {
  const rel = useRelativeTime();
  const providerName = useProviderName();
  const columns = RUN_COLUMNS[variant];
  const cells = {
    id: (run) => <Link className="table-link mono" to={`/app/runs/${run.id}`}>{run.id}</Link>,
    system: (run) => <Link className="table-link" to={`/app/runs/${run.id}`}><ProviderCell name={providerName(run.connectorId)} size="sm" /></Link>,
    direction: (run) => <span className="muted">{directionLabel(run.direction)}</span>,
    entities: (run) => run.entitiesProcessed.toLocaleString(),
    p95: (run) => <span className="muted">{formatLatency(run.p95Ms)}</span>,
    duration: (run) => <span className="muted">{formatDuration(run.durationMs)}</span>,
    status: (run) => <StatusBadge status={run.status} />,
    started: (run) => <span className="muted">{rel(run.startedAt)}</span>,
  };

  return (
    <div className="data-table-wrap">
      <table className="data-table runs-table" aria-label={ariaLabel}>
        <thead>
          <tr>{columns.map((key) => <th key={key} scope="col" className={HEADERS[key].className}>{HEADERS[key].label}</th>)}</tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} data-record-id={run.id}>
              {columns.map((key) => <td key={key} className={HEADERS[key].className}>{cells[key](run)}</td>)}
            </tr>
          ))}
          {!runs.length && <tr><td colSpan={columns.length} className="data-table__empty">No runs in this range for the active persona.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function HealthList({ connectors }) {
  const { state } = useDemo();
  const rel = useRelativeTime();
  if (!connectors.length) return <p className="muted">No connectors are scoped to this persona.</p>;
  return (
    <ul className="health-list">
      {connectors.map((connector) => {
        const provider = state.providerDefinitions[connector.providerDefinitionId];
        const health = selectConnectorHealth(state, connector.id);
        return (
          <li key={connector.id}>
            <Link to={recordsLink('/app/integrations', [connector.id])} className="health-list__row">
              <span className="provider-mark">{providerMark(provider?.name ?? connector.name)}</span>
              <span className="health-list__body">
                <strong>{provider?.name ?? connector.name}</strong>
                <small>{provider?.category ?? connector.role} · {health?.lastRunAt ? rel(health.lastRunAt) : 'no runs yet'}</small>
              </span>
            </Link>
            <StatusBadge status={connector.status} />
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityList({ events }) {
  const { state } = useDemo();
  const rel = useRelativeTime();
  if (!events.length) return <p className="muted">No audit events for this persona yet.</p>;
  return (
    <ul className="activity-list">
      {events.map((event) => (
        <li key={event.id}>
          <span className={`activity-list__dot activity-list__dot--${activityFamily(event.action)}`} aria-hidden="true" />
          <div>
            <Link to={recordsLink('/app/audit', [event.id])} className="activity-list__link">
              <strong>{event.action}</strong>
              <small>{state.members[event.actorId]?.name ?? event.actorId} · {event.resourceId}</small>
            </Link>
          </div>
          <time>{rel(event.createdAt)}</time>
        </li>
      ))}
    </ul>
  );
}

export function IntegrationMatrix({ connectors }) {
  const { state } = useDemo();
  const rel = useRelativeTime();
  if (!connectors.length) return <p className="muted">No connectors are scoped to this persona.</p>;
  return (
    <div className="integration-matrix">
      {connectors.map((connector) => {
        const provider = state.providerDefinitions[connector.providerDefinitionId];
        const health = selectConnectorHealth(state, connector.id);
        return (
          <Link key={connector.id} to={recordsLink('/app/integrations', [connector.id])} className="integration-card">
            <span className="integration-card__head">
              <span className="provider-mark">{providerMark(provider?.name ?? connector.name)}</span>
              <strong>{provider?.name ?? connector.name}</strong>
              <span className={`status-dot status-dot--${connector.status}`} aria-label={`Status: ${connector.status}`} />
            </span>
            <small>{provider?.category ?? connector.role} · {health?.lastRunAt ? rel(health.lastRunAt) : 'no runs yet'}</small>
          </Link>
        );
      })}
    </div>
  );
}
