/* Human labels for the connector vocabulary. Unknown values fall back to a
   sentence-cased form so a new fixture value never renders as snake_case. */
export const ROLE_LABELS = {
  system_of_record: 'System of record',
  target: 'Learning target',
  analytics: 'Analytics',
  notifications: 'Notifications',
  tickets: 'Tickets',
};

export const AUTH_LABELS = { oauth2: 'OAuth 2.0', api_key: 'API key', basic: 'Basic', saml: 'SAML' };

export const CREDENTIAL_LABELS = {
  reference_valid: 'Reference valid',
  reference_expiring: 'Reference expiring',
  reference_expired: 'Reference expired',
  reference_missing: 'Reference missing',
};

export const DIRECTION_LABELS = { inbound: 'Inbound', outbound: 'Outbound', bidirectional: 'Bidirectional' };

export const OPERATION_LABELS = {
  provision: 'Provision',
  deactivate: 'Deactivate',
  completion: 'Completion',
  ticket_sync: 'Ticket sync',
  notify: 'Notify',
};

export function humanize(value) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export function label(map, value) {
  return map[value] ?? humanize(value);
}
