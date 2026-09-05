import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemo } from '../../demo/context';
import { selectDeadLetters } from '../../demo/selectors';
import '../../styles/features/webhooks.css';
import DeadLetterPanel from './DeadLetterPanel';
import DeliveriesTable from './DeliveriesTable';
import DeliveryDrawer from './DeliveryDrawer';
import SubscriptionForm from './SubscriptionForm';
import SubscriptionList from './SubscriptionList';

export default function WebhooksPage() {
  const { state } = useDemo();
  const [searchParams] = useSearchParams();
  const requestedId = (searchParams.get('records') ?? '').split(',').find((id) => state.deliveries[id]) ?? null;
  const [lastRequestedId, setLastRequestedId] = useState(requestedId);
  const [selectedId, setSelectedId] = useState(requestedId);
  const triggerRef = useRef(null);
  if (requestedId !== lastRequestedId) {
    setLastRequestedId(requestedId);
    if (requestedId) setSelectedId(requestedId);
  }
  const deadLetters = selectDeadLetters(state);

  function open(deliveryId) {
    triggerRef.current = document.activeElement;
    setSelectedId(deliveryId);
  }

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split">
        <div><p className="eyebrow">Operate</p><h1>Webhooks & recovery</h1><p>Tenant-scoped delivery destinations · secrets are write-only</p></div>
        <div className="page-heading__status"><strong>{deadLetters.length}</strong><span>items in DLQ</span></div>
      </section>
      <div className="grid-main-rail grid-main-rail--webhooks">
        <SubscriptionForm />
        <SubscriptionList />
      </div>
      <DeliveriesTable onSelect={open} />
      <DeadLetterPanel onInspect={open} />
      {selectedId && <DeliveryDrawer deliveryId={selectedId} onClose={() => setSelectedId(null)} returnFocusRef={triggerRef} />}
    </div>
  );
}
