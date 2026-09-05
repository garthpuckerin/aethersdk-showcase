/* The demo clock is anchored to the moment the fixture graph is created (boot
   or reset), never to a calendar constant. Every timestamp in the graph is
   derived relative to that anchor, so the cockpit reads "18m ago" on any day
   the demo is opened. Presentation code must format through these helpers and
   must never render a raw ISO string. */

export function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

export function minutesBefore(anchorIso, minutes) {
  return new Date(Date.parse(anchorIso) - minutes * 60_000).toISOString();
}

export function hoursBefore(anchorIso, hours) {
  return minutesBefore(anchorIso, hours * 60);
}

export function daysBefore(anchorIso, days) {
  return minutesBefore(anchorIso, days * 24 * 60);
}

export function minutesBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
}

export function formatRelativeTime(iso, referenceIso) {
  if (!iso) return '—';
  const minutes = Math.max(0, minutesBetween(iso, referenceIso ?? nowIso()));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatRelativeFuture(iso, referenceIso) {
  if (!iso) return '—';
  const minutes = Math.max(0, minutesBetween(referenceIso ?? nowIso(), iso));
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

export function formatDuration(milliseconds) {
  if (milliseconds == null) return 'In progress';
  if (milliseconds < 1000) return `${milliseconds} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} s`;
  return `${Math.floor(milliseconds / 60_000)}m ${Math.round((milliseconds % 60_000) / 1000)}s`;
}

export function formatUptime(milliseconds) {
  const totalHours = Math.floor(milliseconds / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days ? `${days}d ${hours}h` : `${hours}h`;
}

export function hourLabel(iso) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

/* Shift every ISO timestamp in a plain data graph by `deltaMs`. Used when a
   persisted workflow state is rehydrated so relative labels stay coherent
   instead of drifting into the past. */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function shiftTimestamps(value, deltaMs) {
  if (typeof value === 'string') return ISO_RE.test(value) ? new Date(Date.parse(value) + deltaMs).toISOString() : value;
  if (Array.isArray(value)) return value.map((item) => shiftTimestamps(item, deltaMs));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shiftTimestamps(item, deltaMs)]));
  return value;
}
