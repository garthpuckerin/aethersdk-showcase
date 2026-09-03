import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import OverviewPage from './OverviewPage';

function renderOverview(state = createSeedState()) {
  return render(
    <MemoryRouter initialEntries={['/app/overview']}>
      <DemoProvider initialState={state}>
        <Routes><Route path="/app/overview" element={<OverviewPage />} /><Route path="/app/integrations" element={<Drilldown />} /></Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

function Drilldown() {
  const location = useLocation();
  return <div>Integration drill-down <output>{location.search}</output></div>;
}

describe('OverviewPage', () => {
  it('shows cross-footed operational health and an honest percentage', () => {
    renderOverview();
    expect(screen.getByTestId('active-integrations-value')).toHaveTextContent('7');
    expect(screen.getByTestId('success-rate-value')).toHaveTextContent('83%');
    expect(screen.getByText('20 of 24 runs')).toBeVisible();
    expect(screen.getByText('3 failed runs need attention')).toBeVisible();
  });

  it('drills from a KPI to its contributing connector records', async () => {
    const user = userEvent.setup();
    renderOverview();
    const link = screen.getByRole('link', { name: /inspect 7 active integrations/i });
    expect(link).toHaveAttribute('data-record-ids', expect.stringContaining('con_salesforce'));
    await user.click(link);
    expect(screen.getByText('Integration drill-down')).toBeVisible();
    expect(screen.getByText(/records=con_salesforce/)).toBeVisible();
  });
});
