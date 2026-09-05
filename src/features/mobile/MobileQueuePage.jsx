import { useState } from 'react';
import { Link } from 'react-router-dom';
import { can } from '../../access/policy';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectExceptions } from '../../demo/selectors';
import { operationLabel, providerMarkFor, selectRetryingDeliveries } from './mobileData';

export default function MobileQueuePage() {
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const [replayed, setReplayed] = useState(false);
  const exceptions = selectExceptions(state);
  const retrying = selectRetryingDeliveries(state);
  const mayReplay = can(state.activePersonaId, 'delivery:replay');

  function replay(deadLetterId) {
    dispatch({ type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId });
    setReplayed(true);
  }

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <p className="eyebrow">Companion</p>
        <h1>Recovery queue</h1>
        <p>Dead letters replay with the same event, subscription, and payload identity.</p>
      </section>

      <section>
        <div className="mobile-section-head"><h2>Dead letters</h2><span>{exceptions.deadLetters.length}</span></div>
        {replayed && <p className="callout callout--positive mobile-callout" role="status">Delivery replayed. Audit and metering recorded.</p>}
        {exceptions.deadLetters.length === 0 ? (
          <p className="mobile-empty">No dead letters. Event delivery is caught up.</p>
        ) : (
          <div className="mobile-card-list">
            {exceptions.deadLetters.map((item) => (
              <article className="mobile-record mobile-record--stack" data-testid={`mobile-dlq-${item.id}`} key={item.id}>
                <div className="mobile-record__head">
                  <div><strong className="mono">{item.id}</strong><small>{item.deliveryId}</small></div>
                  <span className="mobile-record__time">{rel(item.createdAt)}</span>
                </div>
                <p>{item.reason}</p>
                {mayReplay
                  ? <button className="button button--primary" type="button" onClick={() => replay(item.id)}>Replay dead letter</button>
                  : <p className="permission-note">Requires delivery:replay permission. Switch persona on More to replay.</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {retrying.length > 0 && (
        <section>
          <div className="mobile-section-head"><h2>Retrying</h2><span>{retrying.length}</span></div>
          <div className="mobile-card-list">
            {retrying.map((delivery) => (
              <Link className="mobile-record mobile-record--row" key={delivery.id} to={`/mobile/runs/${delivery.runId}`}>
                <span className="provider-mark" aria-hidden="true">WH</span>
                <div><strong className="mono">{delivery.id}</strong><small>Retrying · attempt {delivery.attemptIds.length + 1} · {state.webhookSubscriptions[delivery.subscriptionId]?.name ?? delivery.subscriptionId}</small></div>
                <StatusBadge status={delivery.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mobile-section-head"><h2>Failed runs (24h)</h2><span>{exceptions.failedRuns.length}</span></div>
        {exceptions.failedRuns.length === 0 ? (
          <p className="mobile-empty">No failed runs in the last 24 hours.</p>
        ) : (
          <div className="mobile-card-list">
            {exceptions.failedRuns.map((run) => (
              <Link className="mobile-record mobile-record--row" key={run.id} aria-label={`Open failed run ${run.id}`} to={`/mobile/runs/${run.id}`}>
                <span className="provider-mark" aria-hidden="true">{providerMarkFor(state, run.sourceConnectorId)}</span>
                <div><strong className="mono">{run.id}</strong><small>{operationLabel(run.operation)} · {rel(run.startedAt)}</small></div>
                <StatusBadge status={run.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
