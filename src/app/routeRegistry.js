import PlaceholderPage from './PlaceholderPage';
import AuditPage from '../features/audit/AuditPage';
import IntegrationsPage from '../features/integrations/IntegrationsPage';
import OverviewPage from '../features/overview/OverviewPage';
import RunDetailPage from '../features/runs/RunDetailPage';
import RunsPage from '../features/runs/RunsPage';
import WebhooksPage from '../features/webhooks/WebhooksPage';

export const ROUTES = [
  { path: '/app/overview', routePath: 'overview', label: 'Overview', group: 'Observe', icon: '⌁', permission: 'overview:view', component: OverviewPage },
  { path: '/app/integrations', routePath: 'integrations', label: 'Integrations', group: 'Operate', icon: '◫', permission: 'integration:view', component: IntegrationsPage },
  { path: '/app/runs', routePath: 'runs', label: 'Sync runs', group: 'Operate', icon: '↯', permission: 'sync:view', component: RunsPage },
  { path: '/app/runs/:runId', routePath: 'runs/:runId', label: 'Run detail', group: 'Operate', icon: '↯', permission: 'sync:view', component: RunDetailPage, nav: false },
  { path: '/app/webhooks', routePath: 'webhooks', label: 'Webhooks', group: 'Operate', icon: '⌁', permission: 'webhook:view', component: WebhooksPage },
  { path: '/app/audit', routePath: 'audit', label: 'Audit', group: 'Govern', icon: '◎', permission: 'audit:view', component: AuditPage },
  { path: '/app/access', routePath: 'access', label: 'Access', group: 'Govern', icon: '◇', permission: 'access:view', component: PlaceholderPage },
  { path: '/app/health', routePath: 'health', label: 'Health', group: 'System', icon: '＋', permission: 'health:view', component: PlaceholderPage },
  { path: '/app/settings', routePath: 'settings', label: 'Settings', group: 'System', icon: '∙', permission: 'settings:view', component: PlaceholderPage },
];
