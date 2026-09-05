import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectRunsInRange, selectVisibleRuns } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import RunDetailPage from './RunDetailPage';
import RunsPage from './RunsPage';

function renderRuns({ personaId = 'admin', path = '/app/runs' } = {}) {
  const state = buildState((draft) => { draft.activePersonaId = personaId; });
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <Routes>
          <Route path="/app/runs" element={<RunsPage />} />
          <Route path="/app/runs/:runId" element={<RunDetailPage />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
  return state;
}

function dataRows() {
  return within(screen.getByRole('table', { name: 'Sync runs' })).getAllByRole('row').slice(1);
}

describe('RunsPage', () => {
  it('scopes the table to the selected window and paginates twenty rows at a time', async () => {
    const user = userEvent.setup();
    const state = renderRuns();
    const inWindow = selectRunsInRange(state, '24h');
    expect(screen.getByText(`${inWindow.length} runs in the last 24 hours`)).toBeVisible();
    expect(dataRows()).toHaveLength(Math.min(20, inWindow.length));

    await user.selectOptions(screen.getByLabelText('Time window'), 'all');
    const all = selectVisibleRuns(state);
    expect(all.length).toBeGreaterThan(40);
    expect(screen.getByText(`Showing 1–20 of ${all.length}`)).toBeVisible();
    expect(dataRows()).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`Showing 21–40 of ${all.length}`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText(`Showing 1–20 of ${all.length}`)).toBeVisible();
  });

  it('filters by status chip, provider, operation, and search', async () => {
    const user = userEvent.setup();
    const state = renderRuns();
    await user.selectOptions(screen.getByLabelText('Time window'), 'all');
    const all = selectVisibleRuns(state);

    await user.click(screen.getByRole('button', { name: 'Failed' }));
    expect(screen.getByRole('button', { name: 'Failed' })).toHaveAttribute('aria-pressed', 'true');
    const failed = all.filter((run) => run.status === 'failed');
    expect(dataRows()).toHaveLength(Math.min(20, failed.length));
    expect(dataRows().every((row) => within(row).getByLabelText('Status: Failed'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'All' }));

    await user.selectOptions(screen.getByLabelText('Provider'), 'UKG Pro');
    expect(dataRows().every((row) => within(row).getByText('UKG Pro · People'))).toBe(true);
    await user.selectOptions(screen.getByLabelText('Operation'), 'deactivate');
    expect(dataRows().every((row) => within(row).getByText('Deactivate'))).toBe(true);
    await user.selectOptions(screen.getByLabelText('Provider'), 'all');
    await user.selectOptions(screen.getByLabelText('Operation'), 'all');

    await user.type(screen.getByLabelText('Search runs'), 'run_0001');
    expect(dataRows()).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'run_0001' })).toHaveAttribute('href', '/app/runs/run_0001');
    await user.clear(screen.getByLabelText('Search runs'));
    await user.type(screen.getByLabelText('Search runs'), 'no-such-run');
    expect(screen.getByText(/no runs match this filter/i)).toBeVisible();
  });

  it('honours ?status= and ?records= deep links', async () => {
    const user = userEvent.setup();
    renderRuns({ path: '/app/runs?status=failed&records=run_0002,run_0003' });
    expect(screen.getByRole('button', { name: 'Failed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/2 runs linked from another record/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(dataRows()).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'run_0002' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show all runs' }));
    expect(screen.queryByText(/linked from another record/i)).not.toBeInTheDocument();
  });

  it('starts the live governed sync from the Run sync dialog and opens the new run', async () => {
    const user = userEvent.setup();
    renderRuns();
    await user.click(screen.getByRole('button', { name: 'Run sync' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a sync' });
    expect(within(dialog).getByLabelText('Source')).toHaveValue('con_ukg');
    expect(within(dialog).getByLabelText('Entity type')).toHaveValue('corporate.employee.v1');
    for (const target of ['Docebo LMS', 'LinkedIn Learning', 'Axonify Frontline']) {
      expect(within(dialog).getByRole('checkbox', { name: target })).toBeChecked();
    }
    expect(within(dialog).getByText(/executes locally under the demo engine/i)).toBeVisible();
    await user.clear(within(dialog).getByLabelText('Batch size'));
    await user.type(within(dialog).getByLabelText('Batch size'), '40');
    await user.click(within(dialog).getByRole('button', { name: 'Start sync' }));

    expect(await screen.findByRole('heading', { name: 'run_live_harborline_001' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Provision · corporate.employee.v1')).toBeVisible();
    expect(screen.getByText('40')).toBeVisible();
    expect(screen.getByText('idem_live_harborline_001')).toBeVisible();
  });

  it('starts an ordinary learning sync with Tableau as the default target', async () => {
    const user = userEvent.setup();
    renderRuns();
    await user.click(screen.getByRole('button', { name: 'Run sync' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a sync' });
    await user.selectOptions(within(dialog).getByLabelText('Source'), 'con_docebo');
    await user.selectOptions(within(dialog).getByLabelText('Entity type'), 'learning.course.v1');
    expect(within(dialog).getByRole('checkbox', { name: 'Tableau · Readiness' })).toBeChecked();
    expect(within(dialog).getByLabelText('Operation')).toHaveValue('completion');
    await user.click(within(dialog).getByRole('button', { name: 'Start sync' }));
    expect(await screen.findByRole('heading', { name: /^run_op_\d+$/ })).toBeVisible();
    expect(screen.getByText('Completion · learning.course.v1')).toBeVisible();
  });

  it('rejects an out-of-range batch size before dispatching', async () => {
    const user = userEvent.setup();
    renderRuns();
    await user.click(screen.getByRole('button', { name: 'Run sync' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a sync' });
    await user.clear(within(dialog).getByLabelText('Batch size'));
    await user.type(within(dialog).getByLabelText('Batch size'), '900');
    expect(within(dialog).getByText(/whole number between 1 and 500/i)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Start sync' })).toBeDisabled();
  });

  it('scopes runs and sync sources to the developer connector grant', async () => {
    const user = userEvent.setup();
    const state = renderRuns({ personaId: 'developer' });
    const visible = selectRunsInRange(state, '24h', 'developer');
    expect(screen.getByText(`${visible.length} runs in the last 24 hours`)).toBeVisible();
    expect(dataRows()).toHaveLength(Math.min(20, visible.length));
    expect(screen.queryByText('UKG Pro · People')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run sync' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a sync' });
    const sources = within(within(dialog).getByLabelText('Source')).getAllByRole('option').map((option) => option.textContent);
    expect(sources).toEqual(['Docebo LMS', 'LinkedIn Learning']);
  });

  it('shows the permission note instead of Run sync for the auditor', () => {
    renderRuns({ personaId: 'auditor' });
    expect(screen.queryByRole('button', { name: 'Run sync' })).not.toBeInTheDocument();
    expect(screen.getByText('Requires sync:run permission.')).toBeVisible();
  });
});
