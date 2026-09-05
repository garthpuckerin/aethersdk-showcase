import { useState } from 'react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { selectDeliveries } from '../../demo/selectors';
import { DELIVERIES_PAGE_SIZE, DELIVERY_FILTERS } from './eventTypes';

function lastResponse(state, delivery) {
  const attempt = state.deliveryAttempts[delivery.attemptIds.at(-1)];
  return attempt ? <code className="response-code">HTTP {attempt.responseCode}</code> : '—';
}

export default function DeliveriesTable({ onSelect }) {
  const { state } = useDemo();
  const rel = useRelativeTime();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const deliveries = selectDeliveries(state);
  const counts = Object.fromEntries(DELIVERY_FILTERS.map(({ value }) => [value, value === 'all' ? deliveries.length : deliveries.filter(({ status }) => status === value).length]));
  const rows = filter === 'all' ? deliveries : deliveries.filter(({ status }) => status === filter);
  const pageCount = Math.max(1, Math.ceil(rows.length / DELIVERIES_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * DELIVERIES_PAGE_SIZE;
  const visible = rows.slice(start, start + DELIVERIES_PAGE_SIZE);

  function changeFilter(value) {
    setFilter(value);
    setPage(0);
  }

  const columns = [
    { key: 'id', label: 'Delivery', render: (delivery) => <button className="table-link" type="button" onClick={() => onSelect(delivery.id)} aria-label={`View ${delivery.id}`}><code>{delivery.id}</code></button> },
    { key: 'event', label: 'Event', render: (delivery) => <span>{state.auditEvents[delivery.eventId]?.action ?? '—'}<small>{delivery.eventId}</small></span> },
    { key: 'subscription', label: 'Subscription', render: (delivery) => state.webhookSubscriptions[delivery.subscriptionId]?.name ?? delivery.subscriptionId },
    { key: 'attempts', label: 'Attempts', className: 'num', render: (delivery) => <span className="num">{delivery.attemptIds.length}</span> },
    { key: 'response', label: 'Last response', render: (delivery) => lastResponse(state, delivery) },
    { key: 'status', label: 'Status', render: (delivery) => <StatusBadge status={delivery.status} /> },
    { key: 'created', label: 'Created', render: (delivery) => rel(delivery.createdAt) },
  ];

  return (
    <section className="panel panel--flush" aria-labelledby="deliveries-title">
      <div className="table-toolbar deliveries-toolbar">
        <div className="chip-row" role="group" aria-label="Delivery status filter">
          {DELIVERY_FILTERS.map(({ value, label }) => (
            <button key={value} className="chip" type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label} <span className="muted">{counts[value]}</span></button>
          ))}
        </div>
        <span id="deliveries-title">Deliveries in the tenant window</span>
      </div>
      <DataTable ariaLabel="Webhook deliveries" columns={columns} rows={visible} emptyMessage={`No ${filter === 'all' ? '' : `${filter} `}deliveries in this window.`} />
      <div className="table-footer">
        <span>{rows.length ? `Showing ${start + 1}–${start + visible.length} of ${rows.length}` : 'Nothing to page through'}</span>
        <div className="table-footer__pager">
          <button className="button button--quiet button--sm" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <span>Page {currentPage + 1} of {pageCount}</span>
          <button className="button button--quiet button--sm" type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}
