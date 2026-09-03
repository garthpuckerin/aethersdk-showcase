import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import RunsPage from './RunsPage';

function renderRuns(personaId = 'admin') {
  const state = createSeedState();
  state.activePersonaId = personaId;
  return render(<MemoryRouter><DemoProvider initialState={state}><RunsPage /></DemoProvider></MemoryRouter>);
}

function dataRows() {
  return within(screen.getByRole('table', { name: 'Sync runs' })).getAllByRole('row').slice(1);
}

describe('RunsPage', () => {
  it('filters by status, direction, entity type, provider, and time window', async () => {
    const user = userEvent.setup();
    renderRuns();
    expect(dataRows()).toHaveLength(24);
    await user.selectOptions(screen.getByLabelText('Run status'), 'failed');
    expect(dataRows()).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText('Run status'), 'all');
    await user.selectOptions(screen.getByLabelText('Run direction'), 'outbound');
    expect(dataRows().length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Run direction'), 'all');
    await user.selectOptions(screen.getByLabelText('Entity type'), 'crm.contact');
    expect(dataRows().every((row) => within(row).getByText('crm.contact'))).toBe(true);
    await user.selectOptions(screen.getByLabelText('Entity type'), 'all');
    await user.selectOptions(screen.getByLabelText('Provider'), 'Salesforce');
    expect(dataRows()).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText('Provider'), 'all');
    await user.selectOptions(screen.getByLabelText('Time window'), '6h');
    expect(dataRows()).toHaveLength(7);
  });

  it('uses stable deep links and derives duration and latency', () => {
    renderRuns();
    expect(screen.getByRole('link', { name: 'run_hist_02' })).toHaveAttribute('href', '/app/runs/run_hist_02');
    const row = screen.getByRole('link', { name: 'run_hist_02' }).closest('tr');
    expect(within(row).getByText('1.28 s')).toBeVisible();
    expect(within(row).getByText('79 ms')).toBeVisible();
  });

  it('scopes visible runs to the developer connector grant', () => {
    renderRuns('developer');
    expect(dataRows()).toHaveLength(6);
    expect(screen.queryByText('Workday')).not.toBeInTheDocument();
  });
});
