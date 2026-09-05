import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectExceptions, selectOverviewMetrics, selectRuntimeHealth, selectTenant, selectVisibleRuns } from '../../demo/selectors';
import { credentialLabel, operationLabel, providerMarkFor } from './mobileData';

const RECENT_RUN_LIMIT = 5;

function connectorIssue(connector) {
  if (connector.credentialState === 'reference_expiring') return `Credential reference ${credentialLabel(connector.credentialState).toLowerCase()}`;
  return connector.status === 'failed' ? 'Last sync failed' : 'Needs review';
}

export default function MobileHomePage() {
  const { state } = useDemo();
  const rel = useRelativeTime();
  const tenant = selectTenant(state);
  const metrics = selectOverviewMetrics(state);
  const exceptions = selectExceptions(state);
  const runs = selectVisibleRuns(state);
  const activeRun = runs.find(({ status }) => status === 'running');
  const recentRuns = runs.slice(0, RECENT_RUN_LIMIT);
  const health = selectRuntimeHealth(state);

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <p className="eyebrow">{tenant.shortName}</p>
        <h1>Operations pulse</h1>
        <p>Triage, approvals, and monitoring over the same governed records as the console.</p>
      </section>

      <section className="mobile-health-card" aria-label="Runtime health">
        <div><span>Runtime health</span><strong>{health}</strong></div>
        <StatusBadge status={health} />
        <dl>
          <div><dt>Active integrations</dt><dd>{metrics.integrations.value}</dd></div>
          <div><dt>Failed runs (24h)</dt><dd>{metrics.failed.value}</dd></div>
          <div><dt>DLQ</dt><dd>{exceptions.deadLetters.length}</dd></div>
        </dl>
      </section>

      {activeRun && (
        <section>
          <div className="mobile-section-head"><h2>Active run</h2><Link to="/mobile/runs">All runs</Link></div>
          <Link className="mobile-record mobile-record--dark" aria-label={`Open active run ${activeRun.id}`} to={`/mobile/runs/${activeRun.id}`}>
            <div><span>{operationLabel(activeRun.operation)} · started {rel(activeRun.startedAt)}</span><strong className="mono">{activeRun.id}</strong></div>
            <StatusBadge status={activeRun.status} />
          </Link>
        </section>
      )}

      <section>
        <div className="mobile-section-head"><h2>Needs attention</h2><span>{exceptions.total}</span></div>
        {exceptions.total === 0 ? (
          <p className="mobile-empty">Nothing needs attention right now.</p>
        ) : (
          <div className="mobile-card-list">
            {exceptions.connectors.map((connector) => (
              <Link className="mobile-record mobile-record--row" key={connector.id} to={`/mobile/integrations/${connector.id}`}>
                <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, connector.id)}</span>
                <div><strong>{connector.name}</strong><small>{connectorIssue(connector)}</small></div>
                <StatusBadge status={connector.status} />
              </Link>
            ))}
            {exceptions.failedRuns.map((run) => (
              <Link className="mobile-record mobile-record--row" key={run.id} aria-label={`Open failed run ${run.id}`} to={`/mobile/runs/${run.id}`}>
                <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, run.sourceConnectorId)}</span>
                <div><strong className="mono">{run.id}</strong><small>{operationLabel(run.operation)} · {rel(run.startedAt)}</small></div>
                <StatusBadge status={run.status} />
              </Link>
            ))}
            {exceptions.deadLetters.map((item) => (
              <Link className="mobile-record mobile-record--row" key={item.id} to="/mobile/queue">
                <span className="provider-mark" aria-hidden="true">DL</span>
                <div><strong className="mono">{item.id}</strong><small>Dead letter · {rel(item.createdAt)}</small></div>
                <span className="mobile-record__cta">Recover</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mobile-section-head"><h2>Recent runs</h2><Link to="/mobile/runs">All runs</Link></div>
        <div className="mobile-card-list">
          {recentRuns.map((run) => (
            <Link className="mobile-record mobile-record--row" key={run.id} to={`/mobile/runs/${run.id}`}>
              <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, run.sourceConnectorId)}</span>
              <div><strong className="mono">{run.id}</strong><small>{operationLabel(run.operation)} · {run.entitiesProcessed} entities · {rel(run.startedAt)}</small></div>
              <StatusBadge status={run.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
