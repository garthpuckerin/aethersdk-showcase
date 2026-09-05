import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectVisibleRuns } from '../../demo/selectors';
import { operationLabel, providerMarkFor } from './mobileData';

const RUN_LIMIT = 30;
const FILTERS = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'running', label: 'Running', matches: (run) => run.status === 'running' },
  { id: 'failed', label: 'Failed', matches: (run) => run.status === 'failed' },
  { id: 'success', label: 'Success', matches: (run) => run.status === 'success' },
];

export default function MobileRunsPage() {
  const { state } = useDemo();
  const rel = useRelativeTime();
  const [filterId, setFilterId] = useState('all');
  const filter = FILTERS.find(({ id }) => id === filterId) ?? FILTERS[0];
  const runs = selectVisibleRuns(state).slice(0, RUN_LIMIT).filter(filter.matches);

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <p className="eyebrow">Companion</p>
        <h1>Runs</h1>
        <p>The last {RUN_LIMIT} governed syncs visible to this persona.</p>
      </section>

      <div className="chip-row mobile-chips" role="group" aria-label="Filter runs by status">
        {FILTERS.map((option) => (
          <button key={option.id} type="button" className="chip" aria-pressed={option.id === filterId} onClick={() => setFilterId(option.id)}>{option.label}</button>
        ))}
      </div>

      {runs.length === 0 ? (
        <p className="mobile-empty">No {filter.label.toLowerCase()} runs in the last {RUN_LIMIT}.</p>
      ) : (
        <div className="mobile-card-list">
          {runs.map((run) => (
            <Link className="mobile-record mobile-record--row" key={run.id} to={`/mobile/runs/${run.id}`}>
              <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, run.sourceConnectorId)}</span>
              <div>
                <strong className="mono">{run.id}</strong>
                <small>{operationLabel(run.operation)} · {run.entitiesProcessed} entities · {rel(run.startedAt)}</small>
              </div>
              <StatusBadge status={run.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
