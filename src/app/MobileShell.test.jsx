import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoProvider } from '../demo/DemoProvider';
import { createSeedState } from '../demo/seed';
import { AppRoutes } from './routes';

function setWidth(width) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

function renderApp(path, state = createSeedState()) {
  return render(<MemoryRouter initialEntries={[path]}><DemoProvider initialState={state}><AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} /></DemoProvider></MemoryRouter>);
}

afterEach(() => sessionStorage.clear());

describe('mobile boot routing', () => {
  for (const width of [320, 390, 767]) {
    it(`routes ${width}px app boots to the companion`, async () => {
      setWidth(width);
      renderApp('/app/overview');
      expect(await screen.findByRole('heading', { name: 'Operations pulse' })).toBeVisible();
      expect(screen.getByText('Portfolio demo · mock data')).toBeVisible();
    });
  }

  it('keeps 768px boots in the desktop console', () => {
    setWidth(768);
    renderApp('/app/overview');
    expect(screen.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
  });

  it('persists the desktop escape for the current navigation session', async () => {
    setWidth(390);
    const first = renderApp('/app/overview?view=desktop');
    expect(screen.getByRole('heading', { name: 'Operational overview' })).toBeVisible();
    await waitFor(() => expect(sessionStorage.getItem('aether-view-desktop')).toBe('true'));
    first.unmount();
    renderApp('/app/integrations');
    expect(screen.getByRole('heading', { name: 'Integrations' })).toBeVisible();
  });
});

describe('mobile operations companion', () => {
  it('surfaces health, exceptions, active/failed runs, and DLQ records with live affordances', async () => {
    const user = userEvent.setup();
    setWidth(390);
    renderApp('/mobile/home');
    expect(screen.getByText('Northstar Labs')).toBeVisible();
    expect(screen.getByText('Slack Events')).toBeVisible();
    expect(screen.getByRole('link', { name: /open active run run_hist_01/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /open failed run run_hist_06/i })).toBeVisible();
    expect(screen.getByText('dlq_hist_1')).toBeVisible();
    await user.click(screen.getByRole('link', { name: /open failed run run_hist_06/i }));
    expect(screen.getByRole('heading', { name: 'run_hist_06' })).toBeVisible();
    expect(screen.getByText(/PROVIDER_RATE_LIMIT · sanitized/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry failed target only' }));
    expect(screen.getByLabelText('Status: Success')).toBeVisible();
  });

  it('makes retry and replay permission-aware', async () => {
    const user = userEvent.setup();
    const state = createSeedState();
    state.activePersonaId = 'auditor';
    setWidth(390);
    renderApp('/mobile/runs/run_hist_06', state);
    expect(screen.queryByRole('button', { name: 'Retry failed target only' })).not.toBeInTheDocument();
    expect(screen.getByText(/sync:retry permission/i)).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'More' }));
    const deadLetter = screen.getByTestId('mobile-dlq-dlq_hist_1');
    expect(within(deadLetter).queryByRole('button', { name: 'Replay dead letter' })).not.toBeInTheDocument();
    expect(within(deadLetter).getByText(/delivery:replay permission/i)).toBeVisible();
  });

  it('replays a DLQ item locally and offers live home, launch, and desktop destinations', async () => {
    const user = userEvent.setup();
    const state = createSeedState();
    state.activePersonaId = 'operator';
    setWidth(390);
    renderApp('/mobile/more', state);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/mobile/home');
    expect(screen.getByRole('link', { name: 'Open full desktop console' })).toHaveAttribute('href', '/app/overview?view=desktop');
    expect(screen.getByRole('button', { name: 'Return to launch page' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Replay dead letter' }));
    expect(screen.queryByText('dlq_hist_1')).not.toBeInTheDocument();
    expect(screen.getByText(/delivery replayed successfully/i)).toBeVisible();
  });

  for (const [scenario, heading] of Object.entries({ loading: 'Loading simulated data', empty: 'No simulated records', error: 'Simulated service error', denied: 'Permission boundary preview' })) {
    it(`renders the ${scenario} state on companion surfaces`, () => {
      const state = createSeedState();
      state.scenario = scenario;
      setWidth(390);
      renderApp('/mobile/home', state);
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
      expect(screen.getByRole('link', { name: 'More' })).toBeVisible();
    });
  }
});
