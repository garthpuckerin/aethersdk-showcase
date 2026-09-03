import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { ACTIONS, showcaseReducer } from '../../demo/reducer';
import { createSeedState } from '../../demo/seed';
import AuditPage from '../audit/AuditPage';
import OverviewPage from '../overview/OverviewPage';
import WebhooksPage from './WebhooksPage';

function generatedDeliveryState(personaId = 'operator', exhausted = false) {
  let state = createSeedState();
  state.activePersonaId = personaId;
  state = showcaseReducer(state, { type: ACTIONS.START_SYNC, sourceConnectorId: 'con_salesforce', targetConnectorIds: ['con_hubspot', 'con_pipedrive'] });
  state = showcaseReducer(state, { type: ACTIONS.ADVANCE_RUN_STAGE, runId: state.liveIds.runId, stage: 'audit' });
  state = showcaseReducer(state, { type: ACTIONS.ADVANCE_RUN_STAGE, runId: state.liveIds.runId, stage: 'webhook' });
  if (exhausted) {
    state = showcaseReducer(state, { type: ACTIONS.ADVANCE_DELIVERY_ATTEMPT, deliveryId: state.liveIds.deliveryId });
    state = showcaseReducer(state, { type: ACTIONS.ADVANCE_DELIVERY_ATTEMPT, deliveryId: state.liveIds.deliveryId });
    state = showcaseReducer(state, { type: ACTIONS.EXHAUST_DELIVERY, deliveryId: state.liveIds.deliveryId });
    state.activePersonaId = personaId;
  }
  return state;
}

function renderRecovery(state = generatedDeliveryState(), path = '/app/audit?records=evt_live_northstar_001') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state}>
        <Routes>
          <Route path="/app/audit" element={<AuditPage />} />
          <Route path="/app/webhooks" element={<WebhooksPage />} />
          <Route path="/app/overview" element={<OverviewPage />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('WebhooksPage recovery workflow', () => {
  it('carries generated identities through attempts, DLQ, replay, audit, metering, and health', async () => {
    const user = userEvent.setup();
    renderRecovery();
    await user.click(screen.getByRole('link', { name: 'View delivery' }));
    const drawer = screen.getByRole('dialog', { name: 'delivery_live_northstar_001' });
    for (const id of ['req_live_northstar_001', 'run_live_northstar_001', 'evt_live_northstar_001', 'delivery_live_northstar_001', 'payload_live_northstar_001', 'sub_ops']) {
      expect(within(drawer).getAllByText(id).length).toBeGreaterThan(0);
    }
    expect(within(drawer).getByText(/signature algorithm: hmac-sha256/i)).toBeVisible();
    expect(within(drawer).getByText(/signature material is never displayed/i)).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Send next simulated attempt' }));
    await user.click(within(drawer).getByRole('button', { name: 'Send next simulated attempt' }));
    expect(within(drawer).getByText('HTTP 429 · sanitized')).toBeVisible();
    expect(within(drawer).getByText('HTTP 503 · sanitized')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Move exhausted delivery to DLQ' }));
    expect(within(drawer).getByText('dlq_live_northstar_001')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Replay dead letter' }));
    expect(within(drawer).getAllByLabelText('Status: Success').length).toBeGreaterThan(0);
    expect(within(drawer).queryByText('dlq_live_northstar_001')).not.toBeInTheDocument();
    expect(within(drawer).getByText('evt_live_replay')).toBeVisible();
    expect(within(drawer).getByText('meter_live_replay')).toBeVisible();
    expect(within(drawer).getByText('Delivery service healthy')).toBeVisible();
    await user.click(within(drawer).getByRole('link', { name: 'Review recovered overview' }));
    expect(screen.getByRole('link', { name: /trace metering sources/i })).toHaveAttribute('data-record-ids', expect.stringContaining('meter_live_replay'));
  });

  it('explains write-only secrets without exposing usable secret material', () => {
    renderRecovery(generatedDeliveryState(), '/app/webhooks');
    expect(screen.getAllByText(/webhook secrets are write-only references/i)).toHaveLength(2);
    expect(screen.queryByText(/whsec_|secret_[a-z0-9]{8}/i)).not.toBeInTheDocument();
  });

  it('denies replay to the Auditor with the exact permission', () => {
    renderRecovery(generatedDeliveryState('auditor', true), '/app/webhooks?records=delivery_live_northstar_001');
    const drawer = screen.getByRole('dialog', { name: 'delivery_live_northstar_001' });
    expect(within(drawer).queryByRole('button', { name: 'Replay dead letter' })).not.toBeInTheDocument();
    expect(within(drawer).getByText(/delivery:replay permission/i)).toBeVisible();
    expect(within(drawer).getByText('dlq_live_northstar_001')).toBeVisible();
  });
});
