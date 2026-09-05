/* Presentation helpers for the overview. Pure functions, no state. */

const ACTIVITY_FAMILIES = [
  [/^sync\..*fail/, 'failed'],
  [/^sync\./, 'sync'],
  [/credential|^scim\.|^audit\./, 'secure'],
  [/^member\.|^role\./, 'access'],
  [/^webhook\./, 'webhook'],
];

const DIRECTION_LABELS = { inbound: 'Inbound', outbound: 'Outbound', bidirectional: 'Bidirectional' };

export function providerMark(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return initials.toUpperCase();
}

export function firstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

export function greetingFor(nowIso) {
  const hour = new Date(nowIso).getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function activityFamily(action = '') {
  return ACTIVITY_FAMILIES.find(([pattern]) => pattern.test(action))?.[1] ?? 'default';
}

export function directionLabel(direction) {
  return DIRECTION_LABELS[direction] ?? direction;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

export function recordsLink(path, recordIds) {
  return `${path}?records=${encodeURIComponent(recordIds.join(','))}`;
}
