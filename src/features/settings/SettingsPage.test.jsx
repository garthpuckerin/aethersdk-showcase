import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectTenant, selectUsageMetric } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import SettingsPage from './SettingsPage';

function renderSettings(state = buildState()) {
  return render(
    <MemoryRouter>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <SettingsPage />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('derives plan usage and its percentage from the metering graph and tenant limit', () => {
    const state = buildState();
    const tenant = selectTenant(state);
    const usage = selectUsageMetric(state).value;
    const percentage = Math.round((usage / tenant.entityLimit) * 100);
    renderSettings(state);
    expect(screen.getByRole('progressbar', { name: 'Entity event usage' })).toHaveAttribute('aria-valuenow', String(usage));
    expect(screen.getByTestId('usage-value')).toHaveTextContent(usage.toLocaleString());
    expect(screen.getByTestId('usage-percentage')).toHaveTextContent(`${percentage}% of plan`);
    expect(screen.getByText(new RegExp(`${tenant.plan} · renews in \\d+d`))).toBeVisible();
    expect(screen.getByDisplayValue(tenant.name)).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue(tenant.id)).toHaveAttribute('readonly');
  });

  it('explains that no billing portal is connected', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: 'Manage plan' }));
    expect(screen.getByText('No billing portal is connected in this demo.')).toBeVisible();
  });

  it('requires the typed tenant short name before the simulated deletion resolves', async () => {
    const user = userEvent.setup();
    const state = buildState();
    const tenant = selectTenant(state);
    renderSettings(state);
    await user.click(screen.getByRole('button', { name: 'Delete tenant' }));
    const confirm = screen.getByRole('button', { name: 'Confirm deletion' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /to confirm/i }), 'wrong name');
    expect(confirm).toBeDisabled();
    await user.clear(screen.getByRole('textbox', { name: /to confirm/i }));
    await user.type(screen.getByRole('textbox', { name: /to confirm/i }), tenant.shortName);
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(screen.getByText('Destructive actions are disabled in this portfolio demo. No tenant data changed.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm deletion' })).not.toBeInTheDocument();
  });

  it('hides deletion from non-admin personas behind a permission note', () => {
    renderSettings(buildState((draft) => { draft.activePersonaId = 'operator'; }));
    expect(screen.queryByRole('button', { name: 'Delete tenant' })).not.toBeInTheDocument();
    expect(screen.getByText(/only a platform admin can delete a tenant/i)).toBeVisible();
  });

  it('dispatches autopilot, theme, and density preferences', async () => {
    const user = userEvent.setup();
    renderSettings();
    const autopilot = screen.getByRole('checkbox', { name: 'Autopilot' });
    expect(autopilot).toBeChecked();
    await user.click(autopilot);
    expect(autopilot).not.toBeChecked();
    expect(screen.getByText(/use demo controls → step workflow/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Dense' }));
    expect(screen.getByRole('button', { name: 'Dense' })).toHaveAttribute('aria-pressed', 'true');
  });
});
