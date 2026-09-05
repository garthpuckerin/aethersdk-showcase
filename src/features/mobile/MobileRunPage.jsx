import { Link, useParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectVisibleRuns } from '../../demo/selectors';
import { connectorName, operationLabel, providerMarkFor, selectRunEvidence, stageLabel, stageProgress } from './mobileData';

function outcomeDetail(outcome) {
  if (outcome.remoteId) return `Remote id ${outcome.remoteId}`;
  if (outcome.errorCode) return `${outcome.errorCode} · sanitized`;
  return outcome.status === 'running' ? 'Writing to provider' : 'Pending';
}

export default function MobileRunPage() {
  const { runId } = useParams();
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const run = selectVisibleRuns(state).find(({ id }) => id === runId);
  if (!run) return <DataState state="empty" title="Run not found" detail="This run is outside the active persona's scope or does not exist." action={<Link className="button button--ghost button-link" to="/mobile/runs">Back to runs</Link>} />;

  const outcomes = run.targetOutcomeIds.map((id) => state.targetOutcomes[id]).filter(Boolean);
  const failed = outcomes.some(({ status }) => status === 'failed');
  const mayRetry = can(state.activePersonaId, 'sync:retry');
  const evidence = selectRunEvidence(state, run.id);
  const progress = stageProgress(run);
  const targets = run.targetConnectorIds.map((id) => connectorName(state, id)).join(', ');

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <Link to="/mobile/runs">← Runs</Link>
        <p className="eyebrow">{operationLabel(run.operation)} · started {rel(run.startedAt)}</p>
        <h1 className="mono">{run.id}</h1>
        <div className="mobile-title__status"><StatusBadge status={run.status} /><span>{run.entitiesProcessed} entities</span></div>
        <p className="mobile-run-line"><span className="provider-mark" aria-hidden="true">{providerMarkFor(state, run.sourceConnectorId)}</span>{connectorName(state, run.sourceConnectorId)} → {targets}</p>
      </section>

      <section className="mobile-identity" aria-label="Identity chain">
        <span>Request</span><code>{run.requestId}</code>
        <span>Idempotency</span><code>{run.idempotencyKey}</code>
        <span>Stage</span><strong>{stageLabel(run.stage)}</strong>
      </section>

      <section>
        <div className="mobile-section-head"><h2>Stage progress</h2><span>{stageLabel(run.stage)}</span></div>
        <ol className="mobile-stages" aria-label="Run stages">
          {progress.map((step) => (
            <li key={step.stage} className={`mobile-stages__item mobile-stages__item--${step.state}`} aria-current={step.state === 'current' || step.state === 'failed' ? 'step' : undefined}>
              <span className="mobile-stages__dot" aria-hidden="true" />
              <span>{stageLabel(step.stage)}</span>
              <small>{step.state === 'failed' ? 'Waiting on retry' : step.state}</small>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mobile-section-head"><h2>Target outcomes</h2><span>{outcomes.length}</span></div>
        <div className="mobile-card-list">
          {outcomes.map((outcome) => (
            <Link className="mobile-record mobile-record--row" key={outcome.id} to={`/mobile/integrations/${outcome.connectorId}`}>
              <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, outcome.connectorId)}</span>
              <div><strong>{connectorName(state, outcome.connectorId)}</strong><small>{outcomeDetail(outcome)}</small></div>
              <StatusBadge status={outcome.status} />
            </Link>
          ))}
        </div>
        {failed && mayRetry && (
          <button className="button button--primary mobile-action" type="button" onClick={() => dispatch({ type: ACTIONS.RETRY_FAILED_TARGET, runId: run.id })}>Retry failed target only</button>
        )}
        {failed && !mayRetry && <p className="permission-note mobile-action">Requires sync:retry permission. Switch persona on More to retry.</p>}
      </section>

      {(evidence.auditEvent || evidence.deliveries.length > 0) && (
        <section>
          <div className="mobile-section-head"><h2>Evidence</h2></div>
          <div className="mobile-card-list">
            {evidence.auditEvent && (
              <article className="mobile-evidence">
                <span className="eyebrow">Audit event</span>
                <strong className="mono">{evidence.auditEvent.id}</strong>
                <small>{evidence.auditEvent.detail} · {rel(evidence.auditEvent.createdAt)}</small>
              </article>
            )}
            {evidence.deliveries.map((delivery) => (
              delivery.status === 'success' ? (
                <article className="mobile-evidence" key={delivery.id}>
                  <span className="eyebrow">Delivery</span>
                  <strong className="mono">{delivery.id}</strong>
                  <small>{state.webhookSubscriptions[delivery.subscriptionId]?.name ?? delivery.subscriptionId} · {delivery.attemptIds.length} attempt{delivery.attemptIds.length === 1 ? '' : 's'} · {rel(delivery.createdAt)}</small>
                </article>
              ) : (
                <Link className="mobile-record mobile-record--row" key={delivery.id} to="/mobile/queue">
                  <span className="provider-mark" aria-hidden="true">WH</span>
                  <div><strong className="mono">{delivery.id}</strong><small>{state.webhookSubscriptions[delivery.subscriptionId]?.name ?? delivery.subscriptionId} · open recovery queue</small></div>
                  <StatusBadge status={delivery.status} />
                </Link>
              )
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
