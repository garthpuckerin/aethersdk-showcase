import PlaceholderPage from './PlaceholderPage';

export const ROUTES = [
  { path: '/app/overview', routePath: 'overview', label: 'Overview', group: 'Observe', icon: '⌁', permission: 'overview:view', component: PlaceholderPage },
  { path: '/app/integrations', routePath: 'integrations', label: 'Integrations', group: 'Operate', icon: '◫', permission: 'integration:view', component: PlaceholderPage },
  { path: '/app/runs', routePath: 'runs', label: 'Sync runs', group: 'Operate', icon: '↯', permission: 'sync:view', component: PlaceholderPage },
  { path: '/app/runs/:runId', routePath: 'runs/:runId', label: 'Run detail', group: 'Operate', icon: '↯', permission: 'sync:view', component: PlaceholderPage, nav: false },
  { path: '/app/webhooks', routePath: 'webhooks', label: 'Webhooks', group: 'Operate', icon: '⌁', permission: 'webhook:view', component: PlaceholderPage },
  { path: '/app/audit', routePath: 'audit', label: 'Audit', group: 'Govern', icon: '◎', permission: 'audit:view', component: PlaceholderPage },
  { path: '/app/access', routePath: 'access', label: 'Access', group: 'Govern', icon: '◇', permission: 'access:view', component: PlaceholderPage },
  { path: '/app/health', routePath: 'health', label: 'Health', group: 'System', icon: '＋', permission: 'health:view', component: PlaceholderPage },
  { path: '/app/settings', routePath: 'settings', label: 'Settings', group: 'System', icon: '∙', permission: 'settings:view', component: PlaceholderPage },
];
