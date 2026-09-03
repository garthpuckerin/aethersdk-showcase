import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import { selectUsageMetric } from '../../demo/selectors';
import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
  it('derives plan and usage from the active tenant and metering graph', () => {
    const state = createSeedState();
    const usage = selectUsageMetric(state).value;
    render(<MemoryRouter><DemoProvider initialState={state}><SettingsPage /></DemoProvider></MemoryRouter>);
    expect(screen.getByText('Scale')).toBeVisible();
    expect(screen.getByText('75,000 entity events')).toBeVisible();
    expect(screen.getByText(`${usage.toLocaleString()} used`)).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Entity event usage' })).toHaveAttribute('aria-valuenow', String(usage));
  });

  it('explains simulated billing and destructive controls', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><DemoProvider initialState={createSeedState()}><SettingsPage /></DemoProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Open billing portal' }));
    expect(screen.getByText(/no billing portal is connected/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Delete tenant' }));
    expect(screen.getByText(/destructive actions are disabled in this portfolio demo/i)).toBeVisible();
  });
});
