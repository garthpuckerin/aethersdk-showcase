import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoProvider } from '../demo/DemoProvider';
import { selectExceptions } from '../demo/selectors';
import { buildState } from '../test/fixture-builders';
import { AppRoutes } from './routes';

function setWidth(width) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

function renderApp(path, state = buildState()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} />
      </DemoProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

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

describe('mobile companion shell', () => {
  it('owns the floor with four bottom tabs and the mock-data boundary', () => {
    setWidth(390);
    renderApp('/mobile/home');
    const nav = screen.getByRole('navigation', { name: 'Companion' });
    const tabs = within(nav).getAllByRole('link');
    expect(tabs).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/mobile/home');
    expect(within(nav).getByRole('link', { name: 'Runs' })).toHaveAttribute('href', '/mobile/runs');
    expect(within(nav).getByRole('link', { name: /^Queue/ })).toHaveAttribute('href', '/mobile/queue');
    expect(within(nav).getByRole('link', { name: 'More' })).toHaveAttribute('href', '/mobile/more');
    expect(screen.getByText('Portfolio demo · mock data')).toBeVisible();
    expect(within(screen.getByRole('banner')).getByLabelText('Status: Warning')).toBeVisible();
  });

  it('badges the Queue tab with dead letters plus failed runs from the exception selector', () => {
    const state = buildState();
    const exceptions = selectExceptions(state);
    const expected = exceptions.deadLetters.length + exceptions.failedRuns.length;
    expect(expected).toBeGreaterThan(0);
    setWidth(390);
    renderApp('/mobile/home', state);
    expect(screen.getByTestId('mobile-queue-count')).toHaveTextContent(String(expected));
  });

  it('hides the Queue badge when nothing needs recovery', () => {
    const state = buildState((draft) => {
      draft.deadLetters = {};
      draft.deadLetterOrder = [];
      for (const run of Object.values(draft.runs)) if (run.status === 'failed') run.status = 'success';
    });
    setWidth(390);
    renderApp('/mobile/home', state);
    expect(screen.queryByTestId('mobile-queue-count')).not.toBeInTheDocument();
  });

  for (const [scenario, heading] of Object.entries({ loading: 'Loading simulated data', empty: 'No simulated records', error: 'Simulated service error', denied: 'Permission boundary preview' })) {
    it(`renders the ${scenario} state on companion surfaces`, () => {
      const state = buildState((draft) => { draft.scenario = scenario; });
      setWidth(390);
      renderApp('/mobile/home', state);
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
      expect(screen.getByRole('link', { name: 'More' })).toBeVisible();
    });
  }
});
