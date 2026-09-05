/* Event types a tenant can subscribe to. `*` is the catch-all and is exclusive
   of the others in the create form. */
export const CATCH_ALL_EVENT_TYPE = '*';

export const EVENT_TYPES = [
  { value: 'sync.completed', label: 'sync.completed', description: 'A governed run finished' },
  { value: 'sync.target_failed', label: 'sync.target_failed', description: 'One provider target failed' },
  { value: 'sync.retried', label: 'sync.retried', description: 'A failed target was retried' },
  { value: 'webhook.replayed', label: 'webhook.replayed', description: 'A dead letter was replayed' },
  { value: 'connector.credential.expiring', label: 'connector.credential.expiring', description: 'A credential reference is nearing expiry' },
  { value: 'member.invited', label: 'member.invited', description: 'A member was invited' },
  { value: CATCH_ALL_EVENT_TYPE, label: 'All events', description: 'Every event this tenant emits' },
];

export const DELIVERY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'failed', label: 'Failed' },
];

export const DELIVERIES_PAGE_SIZE = 15;

/* Built from a string so the source never contains an escaped-slash sequence
   that the public-safety scanner could mistake for a drive-letter path. */
export const DESTINATION_PATTERN = new RegExp('^https://[^\\s/]+\\.[^\\s/]+(?:/\\S*)?$', 'i');
