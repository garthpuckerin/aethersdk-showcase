import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppRoutes } from '../../app/routes';
import { runToQuiescence } from '../../demo/autopilot';
import { DemoProvider } from '../../demo/DemoProvider';
import { ACTIONS, showcaseReducer } from '../../demo/reducer';
import { selectExceptions } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';

function renderCompanion(path, state = buildState()) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} />
      </DemoProvider>
    </MemoryRouter>,
  );
}

/* The signature people-out flow, driven to the Axonify fault by the engine. */
function faultedLiveState() {
  const seeded = buildState((draft) => { draft.activePersonaId = 'operator'; });
  const started = showcaseReducer(seeded, { type: ACTIONS.START_SYNC, sourceConnectorId: seeded.liveIds.sourceConnectorId, targetConnectorIds: seeded.liveIds.targetConnectorIds });
  return runToQuiescence(showcaseReducer, started);
}

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('mobile home', () => {
  it('lists every exception with a companion destination and never escapes to desktop', () => {
    const state = buildState();
    const exceptions = selectExceptions(state);
    renderCompanion('/mobile/home', state);
    expect(screen.getByRole('heading', { name: 'Operations pulse' })).toBeVisible();
    expect(screen.getByText('Harborline FCU')).toBeVisible();
    for (const connector of exceptions.connectors) {
      expect(screen.getByRole('link', { name: new RegExp(connector.name) })).toHaveAttribute('href', `/mobile/integrations/${connector.id}`);
    }
    for (const run of exceptions.failedRuns) {
      expect(screen.getByRole('link', { name: `Open failed run ${run.id}` })).toHaveAttribute('href', `/mobile/runs/${run.id}`);
    }
    for (const item of exceptions.deadLetters) {
      expect(screen.getByRole('link', { name: new RegExp(item.id) })).toHaveAttribute('href', '/mobile/queue');
    }
    expect(screen.getByRole('link', { name: /open active run/i })).toHaveAttribute('href', expect.stringMatching(/^\/mobile\/runs\//));
    const desktopEscapes = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('view=desktop'));
    expect(desktopEscapes).toEqual([]);
  });
});

describe('mobile run detail', () => {
  it('retries only the failed target of the live run and keeps the identity chain', async () => {
    const user = userEvent.setup();
    const state = faultedLiveState();
    const runId = state.liveIds.runId;
    expect(state.runs[runId].status).toBe('failed');
    renderCompanion(`/mobile/runs/${runId}`, state);

    expect(screen.getByRole('heading', { name: runId })).toBeVisible();
    expect(screen.getByText(state.liveIds.requestId)).toBeVisible();
    expect(screen.getByText(state.liveIds.idempotencyKey)).toBeVisible();
    const axonify = screen.getByRole('link', { name: /axonify frontline/i });
    expect(within(axonify).getByText(/PROVIDER_RATE_LIMIT · sanitized/)).toBeVisible();
    expect(within(axonify).getByLabelText('Status: Failed')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry failed target only' }));

    expect(within(screen.getByRole('link', { name: /axonify frontline/i })).getByLabelText('Status: Success')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry failed target only' })).not.toBeInTheDocument();
    expect(screen.getByText(state.liveIds.idempotencyKey)).toBeVisible();
    expect(within(screen.getByRole('list', { name: 'Run stages' })).getByText('Identity link').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('shows a permission note instead of the retry verb for the auditor', () => {
    const state = { ...faultedLiveState(), activePersonaId: 'auditor' };
    renderCompanion(`/mobile/runs/${state.liveIds.runId}`, state);
    expect(screen.queryByRole('button', { name: 'Retry failed target only' })).not.toBeInTheDocument();
    expect(screen.getByText(/sync:retry permission/)).toBeVisible();
  });
});

describe('mobile runs list', () => {
  it('filters the last runs by status with real buttons', async () => {
    const user = userEvent.setup();
    renderCompanion('/mobile/runs');
    for (const label of ['All', 'Running', 'Failed', 'Success']) expect(screen.getByRole('button', { name: label })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Running' }));
    const rows = document.querySelectorAll('.mobile-record');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(within(row).getByLabelText('Status: Running')).toBeVisible();
  });
});

describe('mobile recovery queue', () => {
  it('replays the seeded dead letter and confirms the audit and metering proof', async () => {
    const user = userEvent.setup();
    const state = buildState((draft) => { draft.activePersonaId = 'operator'; });
    renderCompanion('/mobile/queue', state);
    const card = screen.getByTestId('mobile-dlq-dlq_hist_1');
    await user.click(within(card).getByRole('button', { name: 'Replay dead letter' }));
    expect(screen.queryByTestId('mobile-dlq-dlq_hist_1')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Delivery replayed. Audit and metering recorded.');
  });

  it('withholds replay from the auditor', () => {
    const state = buildState((draft) => { draft.activePersonaId = 'auditor'; });
    renderCompanion('/mobile/queue', state);
    const card = screen.getByTestId('mobile-dlq-dlq_hist_1');
    expect(within(card).queryByRole('button', { name: 'Replay dead letter' })).not.toBeInTheDocument();
    expect(within(card).getByText(/delivery:replay permission/)).toBeVisible();
  });
});

describe('mobile integration detail', () => {
  it('validates the credential reference and labels the desktop-only configuration', async () => {
    const user = userEvent.setup();
    renderCompanion('/mobile/integrations/con_linkedin');
    expect(screen.getByRole('heading', { name: 'LinkedIn Learning' })).toBeVisible();
    expect(screen.getByTestId('mobile-credential-state')).toHaveTextContent('Expiring');
    await user.click(screen.getByRole('button', { name: 'Validate credential reference' }));
    expect(screen.getByTestId('mobile-credential-state')).toHaveTextContent('Valid');
    expect(within(screen.getByRole('heading', { name: 'LinkedIn Learning' }).parentElement).getByLabelText('Status: Healthy')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open on desktop' })).toHaveAttribute('href', '/app/integrations?records=con_linkedin&view=desktop');
  });
});

describe('mobile more', () => {
  it('switches persona, theme, and autopilot and keeps the console handoff', async () => {
    const user = userEvent.setup();
    renderCompanion('/mobile/more');
    expect(screen.getByText('Amalia Frost')).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox'), 'auditor');
    expect(screen.getByText('Priya Nair')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Switch to dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    const autopilot = screen.getByRole('switch', { name: 'Autopilot' });
    expect(autopilot).toHaveAttribute('aria-checked', 'true');
    await user.click(autopilot);
    expect(autopilot).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('link', { name: 'Open full desktop console' })).toHaveAttribute('href', '/app/overview?view=desktop');
    expect(screen.getByRole('button', { name: 'Return to launch page' })).toBeVisible();
  });
});
