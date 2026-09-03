import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { showcaseReducer, ACTIONS } from '../../demo/reducer';
import { createSeedState } from '../../demo/seed';
import AuditPage from './AuditPage';

function generatedAuditState() {
  let state = createSeedState();
  state = showcaseReducer(state, { type: ACTIONS.START_SYNC, sourceConnectorId: 'con_salesforce', targetConnectorIds: ['con_hubspot', 'con_pipedrive'] });
  state = showcaseReducer(state, { type: ACTIONS.ADVANCE_RUN_STAGE, runId: state.liveIds.runId, stage: 'audit' });
  state = showcaseReducer(state, { type: ACTIONS.ADVANCE_RUN_STAGE, runId: state.liveIds.runId, stage: 'webhook' });
  return state;
}

function renderAudit(state = generatedAuditState()) {
  return render(<MemoryRouter><DemoProvider initialState={state}><AuditPage /></DemoProvider></MemoryRouter>);
}

function rows() {
  return within(screen.getByRole('table', { name: 'Audit events' })).getAllByRole('row').slice(1);
}

describe('AuditPage', () => {
  it('filters immutable events by actor, action, resource, and request identity', async () => {
    const user = userEvent.setup();
    renderAudit();
    await user.selectOptions(screen.getByLabelText('Audit actor'), 'actor_operator');
    expect(rows().length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Audit action'), 'sync.completed');
    await user.selectOptions(screen.getByLabelText('Resource type'), 'run');
    await user.type(screen.getByRole('searchbox', { name: 'Request identity' }), 'req_live_northstar_001');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('evt_live_northstar_001')).toBeVisible();
  });

  it('links the shared run and generated delivery without mutation affordances', () => {
    renderAudit();
    const eventRow = screen.getByText('evt_live_northstar_001').closest('tr');
    expect(within(eventRow).getByRole('link', { name: 'run_live_northstar_001' })).toHaveAttribute('href', '/app/runs/run_live_northstar_001');
    expect(within(eventRow).getByRole('link', { name: 'View delivery' })).toHaveAttribute('href', '/app/webhooks?records=delivery_live_northstar_001');
    expect(screen.getByText(/immutable tenant audit stream/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /delete|edit/i })).not.toBeInTheDocument();
  });
});
