import { Link } from 'react-router-dom';
import { can } from '../../access/policy';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';

export default function DeliveryDrawer({ deliveryId, onClose }) {
  const { state, dispatch } = useDemo();
  const delivery = state.deliveries[deliveryId];
  if (!delivery) return null;
  const attempts = delivery.attemptIds.map((id) => state.deliveryAttempts[id]).filter(Boolean);
  const deadLetter = Object.values(state.deadLetters).find(({ deliveryId: id }) => id === delivery.id);
  const mayReplay = can(state.activePersonaId, 'delivery:replay');
  const replayEvent = state.auditEvents.evt_live_replay;
  const replayMeter = state.meteringEvents.meter_live_replay;
  const deliveryHealth = state.dependencies.dep_event_delivery.status;

  return (
    <Drawer open title={delivery.id} onClose={onClose}>
      <div className="drawer-stack">
        <div className="connector-identity"><div><p className="eyebrow">Signed delivery trace</p><h3>{delivery.subscriptionId}</h3></div><StatusBadge status={delivery.status} /></div>
        <dl className="delivery-identities">
          <div><dt>Request</dt><dd><code>{delivery.requestId ?? state.auditEvents[delivery.eventId]?.requestId}</code></dd></div>
          <div><dt>Run</dt><dd><code>{delivery.runId ?? state.auditEvents[delivery.eventId]?.runId}</code></dd></div>
          <div><dt>Event</dt><dd><code>{delivery.eventId}</code></dd></div>
          <div><dt>Delivery</dt><dd><code>{delivery.id}</code></dd></div>
          <div><dt>Payload</dt><dd><code>{delivery.payloadId}</code></dd></div>
          <div><dt>Subscription</dt><dd><code>{delivery.subscriptionId}</code></dd></div>
        </dl>
        <section className="signature-note"><strong>Signature algorithm: HMAC-SHA256</strong><p>Timestamped signing is simulated; signature material is never displayed or copied.</p></section>
        <section><p className="eyebrow">Attempt history</p><ol className="attempt-list">{attempts.map((attempt) => <li key={attempt.id}><div><strong>Attempt {attempt.attempt}</strong><code>{attempt.id}</code></div><span>HTTP {attempt.responseCode} · sanitized</span><StatusBadge status={attempt.status} /></li>)}</ol>{!attempts.length && <p className="muted-copy">No attempts recorded yet.</p>}</section>
        {delivery.status === 'retrying' && attempts.length < 2 && <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.ADVANCE_DELIVERY_ATTEMPT, deliveryId })}>Send next simulated attempt</button>}
        {delivery.status === 'retrying' && attempts.length >= 2 && <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.EXHAUST_DELIVERY, deliveryId })}>Move exhausted delivery to DLQ</button>}
        {deadLetter && <section className="dead-letter-callout"><p className="eyebrow">Dead-letter record</p><strong>{deadLetter.id}</strong><p>{deadLetter.reason}</p>{mayReplay ? <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId: deadLetter.id })}>Replay dead letter</button> : <p className="permission-note">Requires delivery:replay permission.</p>}</section>}
        {replayEvent && delivery.id === state.liveIds.deliveryId && <section className="recovery-proof"><strong>Recovery recorded</strong><code>{replayEvent.id}</code><code>{replayMeter.id}</code><span>Delivery service {deliveryHealth}</span></section>}
        {replayEvent && delivery.id === state.liveIds.deliveryId && <Link className="button button--ghost button-link" to="/app/overview">Review recovered overview</Link>}
      </div>
    </Drawer>
  );
}
