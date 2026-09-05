import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { runToQuiescence } from '../../demo/autopilot';
import { DemoProvider } from '../../demo/DemoProvider';
import { ACTIONS, showcaseReducer } from '../../demo/reducer';
import { buildState } from '../../test/fixture-builders';
import RunDetailPage from './RunDetailPage';

const LIVE_RUN = 'run_live_harborline_001';

/* Start the signature run and let the engine advance until it stops at the
   Axonify fault; optionally retry and let it run to completion. */
function liveState({ personaId = 'operator', retried = false } = {}) {
  let state = buildState();
  const ids = state.liveIds;
  state = showcaseReducer(state, { type: ACTIONS.START_SYNC, sourceConnectorId: ids.sourceConnectorId, targetConnectorIds: ids.targetConnectorIds });
  state = runToQuiescence(showcaseReducer, state);
  if (retried) {
    state = showcaseReducer(state, { type: ACTIONS.RETRY_FAILED_TARGET, runId: ids.runId });
    state = runToQuiescence(showcaseReducer, state);
  }
  return { ...state, activePersonaId: personaId };
}

function renderRun(state, runId = LIVE_RUN) {
  render(
    <MemoryRouter initialEntries={[`/app/runs/${runId}`]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <Routes><Route path="/app/runs/:runId" element={<RunDetailPage />} /></Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

function stageState(label) {
  const rail = screen.getByRole('list', { name: 'Sync stages' });
  return within(rail).getByText(label).closest('li').getAttribute('data-stage-state');
}

describe('RunDetailPage', () => {
  it('shows the engine paused at the failed target and lets the operator retry only that target', async () => {
    const user = userEvent.setup();
    renderRun(liveState());

    expect(screen.getByRole('heading', { name: LIVE_RUN })).toBeVisible();
    expect(screen.getByText('Provision · corporate.employee.v1')).toBeVisible();
    expect(screen.getByText(/UKG Pro · People → Docebo LMS, LinkedIn Learning, Axonify Frontline · Priya Raman/)).toBeVisible();
    const heading = screen.getByRole('heading', { name: LIVE_RUN }).closest('section');
    expect(within(heading).getByLabelText('Status: Failed')).toBeVisible();
    expect(screen.queryByRole('button', { name: /advance|simulate/i })).not.toBeInTheDocument();

    const chain = screen.getByTestId('identity-chain');
    expect(chain).toHaveTextContent('req_live_harborline_001');
    expect(chain).toHaveTextContent(LIVE_RUN);
    expect(within(chain).getAllByText('Pending')).toHaveLength(2);
    expect(within(chain).getByText('—')).toBeVisible();

    expect(stageState('Provider write')).toBe('danger');
    expect(stageState('Match')).toBe('complete');
    expect(stageState('Identity link')).toBe('pending');
    expect(screen.getByText('PROVIDER_RATE_LIMIT', { selector: 'li small' })).toBeVisible();

    const axonify = screen.getByRole('row', { name: /axonify frontline/i });
    expect(within(axonify).getByLabelText('Status: Failed')).toBeVisible();
    expect(within(axonify).getByText('PROVIDER_RATE_LIMIT · sanitized')).toBeVisible();
    expect(within(axonify).getByText(/429 Too Many Requests from the provider/)).toBeVisible();
    expect(within(screen.getByRole('row', { name: /docebo lms/i })).getByText('✓ linked')).toBeVisible();
    expect(screen.getByText('2 identity links')).toBeVisible();
    expect(screen.getByText(/re-uses idempotency key/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry failed target only' }));
    expect(within(axonify).getByLabelText('Status: Success')).toBeVisible();
    expect(within(axonify).getByText('axonify_emp_live')).toBeVisible();
    expect(within(axonify).getByText('✓ linked')).toBeVisible();
    expect(within(axonify).getByRole('cell', { name: '1' })).toBeVisible();
    expect(screen.getByText('3 identity links')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry failed target only' })).not.toBeInTheDocument();
    expect(stageState('Identity link')).toBe('current');
    expect(screen.getByText('idem_live_harborline_001', { selector: 'dd code' })).toBeVisible();
  });

  it('carries the audit event, delivery, and dead letter through the identity chain once the engine finishes', () => {
    renderRun(liveState({ retried: true }));
    const chain = screen.getByTestId('identity-chain');
    for (const id of ['req_live_harborline_001', LIVE_RUN, 'evt_live_harborline_001', 'delivery_live_harborline_001', 'dlq_live_harborline_001']) {
      expect(chain).toHaveTextContent(id);
    }
    const heading = screen.getByRole('heading', { name: LIVE_RUN }).closest('section');
    expect(within(heading).getByLabelText('Status: Success')).toBeVisible();
    expect(screen.getByText('Governed sync complete — 3 targets, 3 identity links')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review updated overview' })).toHaveAttribute('href', '/app/overview');
    expect(screen.getByRole('link', { name: 'Open related audit event →' })).toHaveAttribute('href', '/app/audit?records=evt_live_harborline_001');
    expect(screen.getByRole('link', { name: 'Open related delivery →' })).toHaveAttribute('href', '/app/webhooks?records=delivery_live_harborline_001');
    const stages = within(screen.getByRole('list', { name: 'Sync stages' })).getAllByRole('listitem');
    expect(stages).toHaveLength(10);
    expect(stages.every((stage) => stage.getAttribute('data-stage-state') === 'complete')).toBe(true);
    expect(screen.queryByText(/20\d\d-\d\d-\d\dT/)).not.toBeInTheDocument();
  });

  it('shows the auditor the permission boundary instead of the retry verb', () => {
    renderRun(liveState({ personaId: 'auditor' }));
    expect(screen.queryByRole('button', { name: 'Retry failed target only' })).not.toBeInTheDocument();
    expect(screen.getByText('Requires sync:retry permission.')).toBeVisible();
  });

  it('renders an empty state for an unknown run', () => {
    renderRun(buildState(), 'run_missing');
    expect(screen.getByRole('heading', { name: 'Run not found' })).toBeVisible();
  });
});
