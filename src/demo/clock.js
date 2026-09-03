export const DEMO_ANCHOR_ISO = '2026-09-10T16:00:00.000Z';

export function minutesBeforeAnchor(minutes) {
  return new Date(Date.parse(DEMO_ANCHOR_ISO) - minutes * 60_000).toISOString();
}

export function formatRelativeTime(iso, anchorIso = DEMO_ANCHOR_ISO) {
  const minutes = Math.max(0, Math.round((Date.parse(anchorIso) - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
