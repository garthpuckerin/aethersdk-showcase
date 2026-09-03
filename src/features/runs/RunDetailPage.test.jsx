import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import IntegrationsPage from '../integrations/IntegrationsPage';
import OverviewPage from '../overview/OverviewPage';
import RunDetailPage from './RunDetailPage';

function renderWorkflow() {
  return render(
    <MemoryRouter initialEntries={['/app/integrations']}>
      <DemoProvider initialState={createSeedState()}>
        <Routes>
          <Route path="/app/integrations" element={<IntegrationsPage />} />
          <Route path="/app/runs/:runId" element={<RunDetailPage />} />
          <Route path="/app/overview" element={<OverviewPage />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('RunDetailPage signature workflow', () => {
  it('preserves identity through partial failure, targeted retry, audit, and webhook delivery', async () => {
    const user = userEvent.setup();
    renderWorkflow();
    await user.click(screen.getByRole('button', { name: /view salesforce crm/i }));
    await user.click(screen.getByRole('button', { name: 'Validate credential reference' }));
    await user.click(screen.getByRole('button', { name: 'Start governed sync' }));

    expect(screen.getByRole('heading', { name: 'run_live_northstar_001' })).toBeVisible();
    expect(screen.getByText('req_live_northstar_001')).toBeVisible();
    expect(screen.getByText('idem_live_northstar_001')).toBeVisible();

    for (const nextStage of ['authorization', 'fetch', 'normalization', 'match', 'provider write']) {
      await user.click(screen.getByRole('button', { name: `Advance to ${nextStage}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Simulate one target failure' }));
    const hubspot = screen.getByRole('row', { name: /hubspot crm/i });
    const pipedrive = screen.getByRole('row', { name: /pipedrive crm/i });
    expect(within(hubspot).getByLabelText('Status: Success')).toBeVisible();
    expect(within(pipedrive).getByLabelText('Status: Failed')).toBeVisible();
    expect(screen.getByText('1 canonical identity link')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry failed target only' }));
    expect(within(hubspot).getByLabelText('Status: Success')).toBeVisible();
    expect(within(pipedrive).getByLabelText('Status: Success')).toBeVisible();
    expect(screen.getByText('2 canonical identity links')).toBeVisible();
    expect(screen.getByText('idem_live_northstar_001')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Advance to audit' }));
    expect(screen.getByText('evt_live_northstar_001')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Advance to webhook' }));
    expect(screen.getByText('delivery_live_northstar_001')).toBeVisible();
    const identity = screen.getByTestId('identity-chain');
    expect(identity).toHaveTextContent('req_live_northstar_001');
    expect(identity).toHaveTextContent('run_live_northstar_001');
    expect(identity).toHaveTextContent('evt_live_northstar_001');
    expect(identity).toHaveTextContent('delivery_live_northstar_001');
    await user.click(screen.getByRole('button', { name: 'Advance to metering' }));
    expect(screen.getByText('Governed sync complete')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Review updated overview' }));
    expect(screen.getByTestId('active-integrations-value')).toHaveTextContent('8');
    expect(screen.getByText('21 of 25 runs')).toBeVisible();
    expect(screen.getByTestId('success-rate-value')).toHaveTextContent('84%');
    expect(screen.getByText(/run_live_northstar_001 · req_live_northstar_001/)).toBeVisible();
    expect(screen.getByRole('link', { name: /trace metering sources/i })).toHaveAttribute('data-record-ids', expect.stringContaining('meter_live_sync'));
  });
});
