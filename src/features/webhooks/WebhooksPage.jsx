import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { selectDeadLetters, selectDeliveries } from '../../demo/selectors';
import DeliveryDrawer from './DeliveryDrawer';

export default function WebhooksPage() {
  const { state } = useDemo();
  const [searchParams] = useSearchParams();
  const requestedId = (searchParams.get('records') ?? '').split(',').find((id) => state.deliveries[id]);
  const [selectedId, setSelectedId] = useState(requestedId ?? null);
  const deliveries = selectDeliveries(state).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const deadLetters = selectDeadLetters(state);
  const columns = [
    { key: 'id', label: 'Delivery', render: (delivery) => <button className="table-link" type="button" onClick={() => setSelectedId(delivery.id)} aria-label={`View ${delivery.id}`}>{delivery.id}<small>{delivery.eventId}</small></button> },
    { key: 'subscription', label: 'Subscription', render: (delivery) => state.webhookSubscriptions[delivery.subscriptionId]?.name ?? delivery.subscriptionId },
    { key: 'status', label: 'Status', render: (delivery) => <StatusBadge status={delivery.status} /> },
    { key: 'attempts', label: 'Attempts', render: (delivery) => delivery.attemptIds.length },
    { key: 'payload', label: 'Payload', render: (delivery) => <code>{delivery.payloadId}</code> },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Operate</p><h1>Webhooks & recovery</h1><p>Signed event delivery, sanitized retries, dead-letter handling, and replay tied back to the same governed run.</p></div><div className="page-heading__status"><strong>{deadLetters.length}</strong><span>items in DLQ</span></div></section>
      <section className="webhook-summary">
        {Object.values(state.webhookSubscriptions).map((subscription) => <article className="panel subscription-card" key={subscription.id}><div><p className="eyebrow">{subscription.id}</p><h2>{subscription.name}</h2></div><StatusBadge status={subscription.status === 'active' ? 'healthy' : subscription.status} /><p>{subscription.eventTypes.join(', ')}</p><strong>Webhook secrets are write-only references.</strong><small>Rotations replace the reference; usable secret and signature bytes never enter this console.</small></article>)}
      </section>
      <section className="panel table-panel"><DataTable ariaLabel="Webhook deliveries" columns={columns} rows={deliveries} /></section>
      <section className="panel"><header><div><p className="eyebrow">Recovery queue</p><h2>Dead letters</h2></div><span>{deadLetters.length} retained</span></header><ul className="record-list">{deadLetters.map((item) => <li key={item.id}><div><strong>{item.id}</strong><small>{item.deliveryId} · {item.reason}</small></div><button className="button button--ghost" type="button" onClick={() => setSelectedId(item.deliveryId)}>Inspect</button></li>)}</ul></section>
      {selectedId && <DeliveryDrawer deliveryId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
