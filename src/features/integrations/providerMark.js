import { createElement } from 'react';

/* Two-letter mark for a provider name: "UKG Pro" → "UP", "Docebo" → "DO". */
export function providerInitials(name = '') {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '··';
  const initials = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return initials.toUpperCase();
}

export function ProviderMark({ name, size }) {
  const className = size === 'lg' ? 'provider-mark provider-mark--lg' : 'provider-mark';
  return createElement('span', { className, 'aria-hidden': 'true' }, providerInitials(name));
}
