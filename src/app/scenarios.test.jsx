import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../demo/DemoProvider';
import { createSeedState } from '../demo/seed';
import { AppRoutes } from './routes';

const SURFACES = ['/app/overview', '/app/integrations', '/app/runs', '/app/webhooks', '/app/audit', '/app/access', '/app/health', '/app/settings'];
const SCENARIOS = {
  loading: 'Loading simulated data',
  empty: 'No simulated records',
  error: 'Simulated service error',
  denied: 'Permission boundary preview',
};

describe('route scenario boundary', () => {
  for (const [scenario, heading] of Object.entries(SCENARIOS)) {
    it(`renders ${scenario} consistently across every data surface`, () => {
      for (const path of SURFACES) {
        const state = createSeedState();
        state.scenario = scenario;
        const view = render(<MemoryRouter initialEntries={[path]}><DemoProvider initialState={state}><AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} /></DemoProvider></MemoryRouter>);
        expect(screen.getByRole('heading', { name: heading })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Demo controls' })).toBeVisible();
        view.unmount();
      }
    });
  }

  it('resets a scenario through keyboard-reachable demo controls', async () => {
    const user = userEvent.setup();
    const state = createSeedState();
    state.scenario = 'error';
    render(<MemoryRouter initialEntries={['/app/overview']}><DemoProvider initialState={state}><AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} /></DemoProvider></MemoryRouter>);
    await user.tab();
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Demo controls' }));
    await user.selectOptions(screen.getByLabelText('Data scenario'), 'default');
    expect(screen.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
  });
});
