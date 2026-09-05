/* Self-hosted provider marks (vendor brand assets, used to identify the
   systems a tenant integrates). Anything without an entry renders as a
   two-letter monogram. Keys are provider definition names. */
export const PROVIDER_ICONS = {
  'UKG Pro': '/icons/providers/ukg.png',
  Xperience: '/icons/providers/xperience.png',
  Docebo: '/icons/providers/docebo.jpg',
  'LinkedIn Learning': '/icons/providers/linkedin-learning.png',
  Axonify: '/icons/providers/axonify.png',
  Tableau: '/icons/providers/tableau.png',
  Slack: '/icons/providers/slack.png',
  'Jira Service Management': '/icons/providers/jira.jpg',
};

export function providerIconSrc(name) {
  return PROVIDER_ICONS[name] ?? null;
}

export function providerInitials(name = '') {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '··';
  const initials = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return initials.toUpperCase();
}
