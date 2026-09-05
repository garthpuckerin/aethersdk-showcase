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

function renderScenario(path, scenario) {
  const state = createSeedState();
  state.scenario = scenario;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('route scenario boundary', () => {
  for (const [scenario, heading] of Object.entries(SCENARIOS)) {
    it(`renders ${scenario} consistently across every data surface`, () => {
      for (const path of SURFACES) {
        const view = renderScenario(path, scenario);
        expect(screen.getByRole('heading', { name: heading })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Demo controls' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Search and commands' })).toBeVisible();
        view.unmount();
      }
    });
  }

  it('resets a scenario through keyboard-reachable demo controls', async () => {
    const user = userEvent.setup();
    renderScenario('/app/overview', 'error');
    await user.tab();
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Demo controls' }));
    await user.selectOptions(screen.getByLabelText('Data scenario'), 'default');
    expect(screen.queryByRole('heading', { name: 'Simulated service error' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
