/* Pure list helpers for the Sync runs page. Windows come from the shared
   RANGES so "runs in the last 24 hours" is the same number the overview uses. */
import { RANGES, selectRunsInRange, selectVisibleRuns } from '../../demo/selectors';
import { providerFor } from './runFormat';

export const PAGE_SIZE = 20;

export const STATUS_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'running', label: 'Running' },
  { value: 'failed', label: 'Failed' },
];

export const WINDOW_OPTIONS = [
  ...Object.entries(RANGES).map(([value, { label }]) => ({ value, label })),
  { value: 'all', label: 'All history' },
];

export const DIRECTIONS = ['inbound', 'outbound', 'bidirectional'];

export const DEFAULT_FILTERS = { direction: 'all', entityType: 'all', provider: 'all', operation: 'all', window: '24h', search: '' };

export function windowLabel(window) {
  return window === 'all' ? 'full history' : RANGES[window].label.toLowerCase();
}

export function runsInWindow(state, window) {
  return window === 'all' ? selectVisibleRuns(state) : selectRunsInRange(state, window);
}

export function statusCounts(runs) {
  return runs.reduce(
    (counts, run) => ({ ...counts, [run.status]: (counts[run.status] ?? 0) + 1 }),
    { success: 0, running: 0, failed: 0 },
  );
}

export function filterRuns(state, runs, { status, direction, entityType, provider, operation, search }) {
  const needle = search.trim().toLowerCase();
  return runs.filter((run) => (status === 'all' || run.status === status)
    && (direction === 'all' || run.direction === direction)
    && (entityType === 'all' || run.entityType === entityType)
    && (provider === 'all' || providerFor(state, run.connectorId)?.name === provider)
    && (operation === 'all' || run.operation === operation)
    && (!needle || run.id.toLowerCase().includes(needle) || run.requestId.toLowerCase().includes(needle)));
}

export function distinct(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function paginate(rows, page) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const end = Math.min(rows.length, start + PAGE_SIZE);
  return { page: safePage, pageCount, start, end, pageRows: rows.slice(start, end) };
}
