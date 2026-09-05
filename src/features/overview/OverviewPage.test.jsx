import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { hourLabel } from '../../demo/clock';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectOverviewMetrics, selectThroughputSeries } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import OverviewPage from './OverviewPage';

function renderOverview(state = buildState()) {
  return render(
    <MemoryRouter initialEntries={['/app/overview']}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <OverviewPage />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  it('greets the active persona by first name under the fixed heading', () => {
    const state = buildState();
    renderOverview(state);
    expect(screen.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
    expect(screen.getByText(/^Good (morning|afternoon|evening), Amalia$/)).toBeVisible();
    const metrics = selectOverviewMetrics(state);
    expect(screen.getByText(new RegExp(`^${metrics.running.value} syncs? running · \\d+ needs? attention$`))).toBeVisible();
  });

  it('cross-foots every KPI against the overview selector', () => {
    const state = buildState();
    renderOverview(state);
    const metrics = selectOverviewMetrics(state);
    expect(screen.getByTestId('active-integrations-value')).toHaveTextContent(String(metrics.integrations.value));
    expect(screen.getByTestId('success-rate-value')).toHaveTextContent(`${metrics.successRate}%`);
    expect(screen.getByTestId('entities-processed-value')).toHaveTextContent(metrics.entities.value.toLocaleString());
    expect(screen.getByTestId('entities-synced-value')).toHaveTextContent(metrics.entities.value.toLocaleString());
    expect(screen.getByTestId('needs-attention-value')).toHaveTextContent(String(metrics.failed.value));
    expect(screen.getByText(`${metrics.success.value.toLocaleString()} of ${metrics.runs.value} runs`)).toBeVisible();
    expect(screen.getByRole('link', { name: /run success/i })).toHaveAttribute('href', '/app/runs?status=success');
    expect(screen.getByRole('link', { name: /active integrations/i })).toHaveAttribute('href', '/app/integrations');
  });

  it('re-derives the hero total when the range changes', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderOverview(state);
    const day = selectOverviewMetrics(state, undefined, '24h').entities.value;
    const week = selectOverviewMetrics(state, undefined, '7d').entities.value;
    expect(week).not.toBe(day);
    expect(screen.getByTestId('entities-synced-value')).toHaveTextContent(day.toLocaleString());
    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('entities-synced-value')).toHaveTextContent(week.toLocaleString());
    expect(screen.getByText('Entities synced · Last 7 days')).toBeVisible();
    expect(screen.getByRole('group', { name: /entities synced per day/i }).querySelectorAll('button')).toHaveLength(7);
  });

  it('opens the bucket drawer from a chart bar with the runs of that bucket', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderOverview(state);
    const bucket = selectThroughputSeries(state, '24h').find(({ recordIds }) => recordIds.length > 0);
    const label = hourLabel(bucket.startIso);
    const bar = screen.getByRole('button', { name: new RegExp(`^${label}, `) });
    await user.click(bar);
    const dialog = screen.getByRole('dialog', { name: `${label} window` });
    expect(within(dialog).getByText('Runs in this window')).toBeVisible();
    const runLinks = within(dialog).getAllByRole('link').filter((link) => link.getAttribute('href').startsWith('/app/runs/'));
    expect(runLinks.map((link) => link.getAttribute('href'))).toEqual(bucket.recordIds.map((id) => `/app/runs/${id}`));
    expect(within(dialog).getByRole('link', { name: 'Open in Sync runs' })).toHaveAttribute('href', `/app/runs?records=${encodeURIComponent(bucket.recordIds.join(','))}`);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bar).toHaveFocus();
  });

  it('renders the KPI bar, integration matrix, and power table in dense mode', () => {
    const state = buildState((draft) => { draft.density = 'dense'; });
    renderOverview(state);
    const metrics = selectOverviewMetrics(state);
    expect(screen.getByTestId('active-integrations-value')).toHaveTextContent(String(metrics.integrations.value));
    expect(screen.getByRole('img', { name: /^Volume, / })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Catalog →' })).toHaveAttribute('href', '/app/integrations');
    const table = screen.getByRole('table', { name: 'Sync runs' });
    expect(within(table).getByRole('columnheader', { name: 'Run ID' })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: 'Duration' })).toBeVisible();
    expect(within(table).getAllByRole('row')).toHaveLength(Math.min(12, metrics.runs.value) + 1);
    expect(screen.queryByRole('group', { name: /entities synced per/i })).not.toBeInTheDocument();
  });

  it('scopes the developer persona to runs on learning-platform connectors', () => {
    const state = buildState((draft) => { draft.activePersonaId = 'developer'; });
    renderOverview(state);
    expect(screen.getByText(/^Good (morning|afternoon|evening), Marco$/)).toBeVisible();
    const metrics = selectOverviewMetrics(state);
    expect(metrics.runs.value).toBeLessThan(selectOverviewMetrics(buildState()).runs.value);
    expect(screen.getByText(`${metrics.success.value.toLocaleString()} of ${metrics.runs.value} runs`)).toBeVisible();
    const table = screen.getByRole('table', { name: 'Recent sync runs' });
    const systems = within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(systems.length).toBeGreaterThan(0);
    expect(systems.every((system) => /Docebo|LinkedIn Learning/.test(system))).toBe(true);
  });
});
