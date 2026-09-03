import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import OverviewPage from '../overview/OverviewPage';
import IntegrationsPage from './IntegrationsPage';

function renderIntegrations(path = '/app/integrations', personaId = 'admin') {
  const state = createSeedState();
  state.activePersonaId = personaId;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state}>
        <Routes>
          <Route path="/app/integrations" element={<IntegrationsPage />} />
          <Route path="/app/overview" element={<OverviewPage />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('IntegrationsPage', () => {
  it('filters shared connector records and keeps health aligned with last run', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.type(screen.getByRole('searchbox', { name: /filter integrations/i }), 'Salesforce');
    const table = screen.getByRole('table', { name: 'Integrations' });
    expect(within(table).getByText('Salesforce CRM')).toBeVisible();
    expect(within(table).queryByText('HubSpot CRM')).not.toBeInTheDocument();
    expect(within(table).getByText('run_hist_01')).toBeVisible();
    expect(within(table).getByLabelText('Status: Healthy')).toBeVisible();
  });

  it('honors KPI record filters from Overview', () => {
    renderIntegrations('/app/integrations?records=con_salesforce,con_hubspot');
    expect(screen.getByText('Showing 2 contributing records')).toBeVisible();
    expect(screen.getByText('Salesforce CRM')).toBeVisible();
    expect(screen.queryByText('Workday People')).not.toBeInTheDocument();
  });

  it('opens a complete connector drawer and validates through the shared reducer', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: /view pipedrive crm/i }));
    const drawer = screen.getByRole('dialog', { name: 'Pipedrive CRM' });
    expect(within(drawer).getByText('Pipedrive')).toBeVisible();
    expect(within(drawer).getByText('crm.contact')).toBeVisible();
    expect(within(drawer).getByText('Outbound')).toBeVisible();
    expect(within(drawer).getByText('Reference expired')).toBeVisible();
    expect(within(drawer).getByRole('link', { name: 'run_hist_08' })).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Validate credential reference' }));
    expect(within(drawer).getByLabelText('Status: Healthy')).toBeVisible();
    expect(within(drawer).getByText('Reference valid')).toBeVisible();
    await user.click(within(drawer).getByRole('link', { name: 'View updated overview' }));
    expect(screen.getByTestId('active-integrations-value')).toHaveTextContent('8');
  });

  it('does not offer connector validation to an auditor', async () => {
    const user = userEvent.setup();
    renderIntegrations('/app/integrations', 'auditor');
    await user.click(screen.getByRole('button', { name: /view pipedrive crm/i }));
    expect(screen.queryByRole('button', { name: 'Validate credential reference' })).not.toBeInTheDocument();
    expect(screen.getByText(/connector:validate permission/i)).toBeVisible();
  });
});
