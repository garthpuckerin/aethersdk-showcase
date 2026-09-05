import { Link, useParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectConnectorHealth, selectConnectorRuns, selectVisibleConnectors } from '../../demo/selectors';
import { credentialLabel, directionLabel, operationLabel, providerFor, providerInitials } from './mobileData';

const RECENT_RUN_LIMIT = 3;

export default function MobileIntegrationPage() {
  const { connectorId } = useParams();
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const connector = selectVisibleConnectors(state).find(({ id }) => id === connectorId);
  if (!connector) return <DataState state="empty" title="Integration not found" detail="This connector is outside the active persona's scope or does not exist." action={<Link className="button button--ghost button-link" to="/mobile/home">Back to home</Link>} />;

  const provider = providerFor(state, connector.id);
  const health = selectConnectorHealth(state, connector.id);
  const recentRuns = selectConnectorRuns(state, connector.id, RECENT_RUN_LIMIT);
  const mayValidate = can(state.activePersonaId, 'connector:validate');
  const desktopHref = `/app/integrations?records=${connector.id}&view=desktop`;

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <Link to="/mobile/home">← Home</Link>
        <p className="eyebrow">{provider?.name ?? 'Connector'}</p>
        <h1>{connector.name}</h1>
        <div className="mobile-title__status">
          <span className="provider-mark" aria-hidden="true">{providerInitials(provider?.name ?? connector.name)}</span>
          <StatusBadge status={connector.status} />
        </div>
      </section>

      <section className="panel mobile-panel">
        <dl className="detail-list">
          <div><dt>Category</dt><dd>{provider?.category ?? '—'}</dd></div>
          <div><dt>Direction</dt><dd>{directionLabel(connector.direction)}</dd></div>
          <div><dt>Credential reference</dt><dd data-testid="mobile-credential-state">{credentialLabel(connector.credentialState)}</dd></div>
          <div><dt>Last validation</dt><dd>{rel(connector.validatedAt)}</dd></div>
          <div><dt>Last run</dt><dd className="mobile-detail-inline">{health?.lastRunAt ? <>{rel(health.lastRunAt)} <StatusBadge status={health.lastRunStatus} /></> : 'No runs yet'}</dd></div>
        </dl>
        {mayValidate ? (
          <button className="button button--primary mobile-action" type="button" onClick={() => dispatch({ type: ACTIONS.VALIDATE_CONNECTOR, connectorId: connector.id })}>Validate credential reference</button>
        ) : (
          <p className="permission-note mobile-action">Requires connector:validate permission. Switch persona on More to validate.</p>
        )}
      </section>

      <section>
        <div className="mobile-section-head"><h2>Recent runs</h2><Link to="/mobile/runs">All runs</Link></div>
        {recentRuns.length === 0 ? (
          <p className="mobile-empty">No runs have crossed this connector yet.</p>
        ) : (
          <div className="mobile-card-list">
            {recentRuns.map((run) => (
              <Link className="mobile-record mobile-record--row" key={run.id} to={`/mobile/runs/${run.id}`}>
                <span className="provider-mark" aria-hidden="true">{run.sourceConnectorId === connector.id ? 'SRC' : 'TGT'}</span>
                <div><strong className="mono">{run.id}</strong><small>{operationLabel(run.operation)} · {run.entitiesProcessed} entities · {rel(run.startedAt)}</small></div>
                <StatusBadge status={run.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mobile-desktop-note">
        <p className="eyebrow">Workstation only</p>
        <p>Configure targets and schedules on the desktop console. The phone validates and recovers; it does not author.</p>
        <Link className="button button--ghost button-link" to={desktopHref}>Open on desktop</Link>
      </section>
    </div>
  );
}
