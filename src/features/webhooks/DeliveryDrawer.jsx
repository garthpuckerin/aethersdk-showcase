import { Link } from 'react-router-dom';
import { can, PERMISSION_LABELS } from '../../access/policy';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';

function findReplay(state, deliveryId) {
  const event = Object.values(state.auditEvents).find(({ action, resourceId }) => action === 'webhook.replayed' && resourceId === deliveryId);
  if (!event) return null;
  const meter = Object.values(state.meteringEvents).find(({ sourceEventId }) => sourceEventId === event.id) ?? null;
  return { event, meter };
}

function Identity({ label, value, to }) {
  const code = <code>{value ?? '—'}</code>;
  return <div><dt>{label}</dt><dd>{to && value ? <Link to={to}>{code}</Link> : code}</dd></div>;
}

export default function DeliveryDrawer({ deliveryId, onClose, returnFocusRef }) {
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const delivery = state.deliveries[deliveryId];
  if (!delivery) return null;
  const event = state.auditEvents[delivery.eventId];
  const subscription = state.webhookSubscriptions[delivery.subscriptionId];
  const attempts = delivery.attemptIds.map((id) => state.deliveryAttempts[id]).filter(Boolean);
  const deadLetter = Object.values(state.deadLetters).find(({ deliveryId: id }) => id === delivery.id);
  const mayReplay = can(state.activePersonaId, 'delivery:replay');
  const replay = findReplay(state, delivery.id);
  const eventDelivery = state.dependencies.dep_event_delivery;
  const runId = delivery.runId ?? event?.runId;

  return (
    <Drawer open title={delivery.id} onClose={onClose} returnFocusRef={returnFocusRef}>
      <div className="drawer-stack">
        <div className="delivery-trace-head">
          <div><p className="eyebrow">Signed delivery trace</p><h3>{subscription?.name ?? delivery.subscriptionId}</h3><p>{event?.action ?? 'event'} · created {rel(delivery.createdAt)}</p></div>
          <StatusBadge status={delivery.status} />
        </div>
        <dl className="delivery-identities">
          <Identity label="Request" value={delivery.requestId ?? event?.requestId} />
          <Identity label="Run" value={runId} to={runId ? `/app/runs/${runId}` : null} />
          <Identity label="Event" value={delivery.eventId} to={`/app/audit?records=${delivery.eventId}`} />
          <Identity label="Delivery" value={delivery.id} />
          <Identity label="Payload" value={delivery.payloadId} />
          <Identity label="Subscription" value={delivery.subscriptionId} />
        </dl>
        <p className="callout"><strong>Signature: HMAC-SHA256 over timestamp + payload.</strong> Signing material never enters this console.</p>
        <section className="drawer-section" aria-labelledby={`attempts-${delivery.id}`}>
          <p className="eyebrow" id={`attempts-${delivery.id}`}>Attempt history</p>
          {attempts.length
            ? (
              <ol className="attempt-list">
                {attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <div><strong>Attempt {attempt.attempt}</strong><code>{attempt.id}</code></div>
                    <span>HTTP {attempt.responseCode} · sanitized</span>
                    <StatusBadge status={attempt.status} />
                    <time>{rel(attempt.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )
            : <p className="muted-copy">No attempts recorded yet.</p>}
        </section>
        {delivery.status === 'retrying' && <p className="callout callout--warning" role="status"><strong>Retrying</strong> — the engine backs off between attempts.</p>}
        {deadLetter && (
          <section className="dead-letter-callout" aria-labelledby={`dlq-${deadLetter.id}`}>
            <p className="eyebrow" id={`dlq-${deadLetter.id}`}>Dead-letter record</p>
            <strong>{deadLetter.id}</strong>
            <p>{deadLetter.reason}</p>
            <div className="dead-letter-callout__actions">
              {mayReplay
                ? <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId: deadLetter.id })}>Replay dead letter</button>
                : <p className="permission-note">Requires delivery:replay permission — {PERMISSION_LABELS['delivery:replay']}.</p>}
            </div>
          </section>
        )}
        {replay && (
          <section className="callout callout--positive recovery-record" role="status" aria-labelledby={`recovery-${delivery.id}`}>
            <strong id={`recovery-${delivery.id}`}>Recovery recorded</strong>
            <dl>
              <dt>Audit event</dt><dd><Link to={`/app/audit?records=${replay.event.id}`}><code>{replay.event.id}</code></Link></dd>
              <dt>Metering</dt><dd><code>{replay.meter?.id ?? '—'}</code></dd>
              <dt>Dependency</dt><dd>Event delivery: {eventDelivery?.status ?? 'unknown'}</dd>
              <dt>Replayed</dt><dd>{rel(replay.event.createdAt)} by {replay.event.actorId}</dd>
            </dl>
            <Link className="button button--ghost button--sm button-link" to="/app/overview">Review recovered overview</Link>
          </section>
        )}
      </div>
    </Drawer>
  );
}
