import { can, PERMISSION_LABELS } from '../../access/policy';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectSubscriptions } from '../../demo/selectors';
import { CATCH_ALL_EVENT_TYPE } from './eventTypes';

function EventTag({ value }) {
  const isCatchAll = value === CATCH_ALL_EVENT_TYPE;
  return <span className={`event-tag ${isCatchAll ? 'event-tag--all' : ''}`.trim()}>{isCatchAll ? 'All events' : value}</span>;
}

function SubscriptionCard({ subscription, mayManage, onSetStatus, rel }) {
  const paused = subscription.status === 'paused';
  return (
    <li className="subscription-card" data-record-id={subscription.id}>
      <div className="subscription-card__head">
        <div className="subscription-card__title"><h3>{subscription.name}</h3><code>{subscription.id}</code></div>
        <StatusBadge status={subscription.status} />
      </div>
      <div className="event-tag-row">{subscription.eventTypes.map((eventType) => <EventTag key={eventType} value={eventType} />)}</div>
      <span className="subscription-card__destination" title={subscription.destination}>{subscription.destination}</span>
      <div className="subscription-card__foot">
        <span>Created {rel(subscription.createdAt)} · secret {subscription.secretState === 'write_only' ? 'write-only reference' : subscription.secretState}</span>
        {mayManage
          ? <button className="button button--ghost button--sm" type="button" onClick={() => onSetStatus(subscription.id, paused ? 'active' : 'paused')} aria-label={`${paused ? 'Resume' : 'Pause'} ${subscription.name}`}>{paused ? 'Resume' : 'Pause'}</button>
          : <p className="permission-note">Requires webhook:manage permission — {PERMISSION_LABELS['webhook:manage']}.</p>}
      </div>
    </li>
  );
}

export default function SubscriptionList() {
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const mayManage = can(state.activePersonaId, 'webhook:manage');
  const subscriptions = selectSubscriptions(state).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const onSetStatus = (subscriptionId, status) => dispatch({ type: ACTIONS.SET_SUBSCRIPTION_STATUS, subscriptionId, status });

  return (
    <section className="panel" aria-labelledby="subscriptions-title">
      <header><div><p className="eyebrow">Tenant-scoped</p><h2 id="subscriptions-title">Subscriptions</h2></div><span className="muted">{subscriptions.length} total</span></header>
      {subscriptions.length
        ? <ul className="subscription-list">{subscriptions.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} mayManage={mayManage} onSetStatus={onSetStatus} rel={rel} />)}</ul>
        : <p className="muted">No subscriptions yet — create one to start receiving signed deliveries.</p>}
    </section>
  );
}
