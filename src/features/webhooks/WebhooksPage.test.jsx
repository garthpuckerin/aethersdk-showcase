import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useDemo } from '../../demo/context';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectDeliveries, selectSubscriptions } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import WebhooksPage from './WebhooksPage';

/* Exposes the reducer state to assertions without reaching around the provider. */
function StateProbe() {
  const { state } = useDemo();
  const created = Object.values(state.auditEvents).filter(({ action }) => action === 'webhook.subscription.created');
  const replayed = Object.values(state.auditEvents).filter(({ action }) => action === 'webhook.replayed');
  return (
    <output data-testid="state-probe" data-created={created.length} data-replayed={replayed.length} data-denied={state.lastDeniedPermission ?? ''}>
      {Object.keys(state.deadLetters).join(',')}
    </output>
  );
}

function renderWebhooks(state = buildState(), path = '/app/webhooks') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <Routes>
          <Route path="/app/webhooks" element={<><WebhooksPage /><StateProbe /></>} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}

function seededDeadLetter(state) {
  return state.deadLetters.dlq_hist_1;
}

describe('WebhooksPage subscriptions', () => {
  it('renders every tenant subscription with its status, event types, and controls', () => {
    const state = buildState();
    renderWebhooks(state);
    expect(screen.getByRole('heading', { name: 'Webhooks & recovery' })).toBeVisible();
    const panel = screen.getByRole('region', { name: 'Subscriptions' });
    for (const subscription of selectSubscriptions(state)) {
      expect(within(panel).getByRole('heading', { name: subscription.name })).toBeVisible();
      expect(within(panel).getByText(subscription.id)).toBeVisible();
    }
    expect(within(panel).getByLabelText('Status: Paused')).toBeVisible();
    expect(within(panel).getAllByLabelText('Status: Active')).toHaveLength(3);
    expect(within(panel).getByText('All events')).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Resume Audit archive' })).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Pause HR provisioning receipts' })).toBeVisible();
    expect(screen.queryByText(/whsec_|secret_[a-z0-9]{8}/i)).not.toBeInTheDocument();
  });

  it('validates the create form inline and creates a subscription with an audit event', async () => {
    const user = userEvent.setup();
    renderWebhooks();
    const form = screen.getByRole('region', { name: 'Create subscription' });
    await user.click(within(form).getByRole('button', { name: 'Create subscription' }));
    expect(within(form).getByText('Give the subscription a name.')).toBeVisible();
    expect(within(form).getByText('Choose at least one event type.')).toBeVisible();
    expect(within(form).getByText('Destination must be an https:// URL.')).toBeVisible();
    expect(screen.getByTestId('state-probe')).toHaveAttribute('data-created', '1');

    await user.type(within(form).getByLabelText('Name'), 'Payroll sync receipts');
    await user.click(within(form).getByRole('checkbox', { name: 'sync.completed' }));
    await user.click(within(form).getByRole('checkbox', { name: 'webhook.replayed' }));
    await user.type(within(form).getByLabelText('Destination URL'), 'http://hooks.example.test/aether');
    await user.type(within(form).getByLabelText('Signing secret'), 'whsec_typed_value_only');
    await user.click(within(form).getByRole('button', { name: 'Create subscription' }));
    expect(within(form).getByText('Destination must be an https:// URL.')).toBeVisible();
    expect(screen.getByTestId('state-probe')).toHaveAttribute('data-created', '1');

    await user.clear(within(form).getByLabelText('Destination URL'));
    await user.type(within(form).getByLabelText('Destination URL'), 'https://hooks.example.test/aether');
    await user.click(within(form).getByRole('button', { name: 'Create subscription' }));
    expect(within(form).getByRole('status')).toHaveTextContent('Subscription created');
    expect(within(form).getByLabelText('Name')).toHaveValue('');
    expect(within(form).getByLabelText('Signing secret')).toHaveValue('');
    expect(screen.getByTestId('state-probe')).toHaveAttribute('data-created', '2');
    const list = screen.getByRole('region', { name: 'Subscriptions' });
    expect(within(list).getByRole('heading', { name: 'Payroll sync receipts' })).toBeVisible();
    expect(within(list).getAllByLabelText('Status: Active')).toHaveLength(4);
    expect(screen.queryByText(/whsec_typed_value_only/)).not.toBeInTheDocument();
  });

  it('selecting All events clears the specific event types', async () => {
    const user = userEvent.setup();
    renderWebhooks();
    const form = screen.getByRole('region', { name: 'Create subscription' });
    await user.click(within(form).getByRole('checkbox', { name: 'sync.completed' }));
    await user.click(within(form).getByRole('checkbox', { name: 'All events' }));
    expect(within(form).getByRole('checkbox', { name: 'sync.completed' })).not.toBeChecked();
    expect(within(form).getByRole('checkbox', { name: 'All events' })).toBeChecked();
    await user.click(within(form).getByRole('checkbox', { name: 'member.invited' }));
    expect(within(form).getByRole('checkbox', { name: 'All events' })).not.toBeChecked();
  });

  it('pauses and resumes a subscription', async () => {
    const user = userEvent.setup();
    renderWebhooks();
    const panel = screen.getByRole('region', { name: 'Subscriptions' });
    await user.click(within(panel).getByRole('button', { name: 'Pause Operations event stream' }));
    expect(within(panel).getAllByLabelText('Status: Paused')).toHaveLength(2);
    await user.click(within(panel).getByRole('button', { name: 'Resume Operations event stream' }));
    expect(within(panel).getAllByLabelText('Status: Paused')).toHaveLength(1);
    expect(within(panel).getByRole('button', { name: 'Pause Operations event stream' })).toBeVisible();
  });
});

describe('WebhooksPage deliveries', () => {
  it('filters the deliveries table by status and pages fifteen at a time', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderWebhooks(state);
    const deliveries = selectDeliveries(state);
    const failed = deliveries.filter(({ status }) => status === 'failed');
    const table = screen.getByRole('table', { name: 'Webhook deliveries' });
    expect(within(table).getAllByRole('row')).toHaveLength(Math.min(15, deliveries.length) + 1);
    expect(screen.getByText(`Showing 1–${Math.min(15, deliveries.length)} of ${deliveries.length}`)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^Failed/ }));
    expect(within(table).getAllByLabelText('Status: Failed')).toHaveLength(failed.length);
    expect(within(table).queryByLabelText('Status: Success')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Retrying/ }));
    expect(within(table).getByText('No retrying deliveries in this window.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^All/ }));
    if (deliveries.length > 15) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText(`Showing 16–${Math.min(30, deliveries.length)} of ${deliveries.length}`)).toBeVisible();
    }
  });

  it('shows the event action, attempt count, and last sanitized response per delivery', () => {
    const state = buildState();
    renderWebhooks(state);
    const deadLetter = seededDeadLetter(state);
    const delivery = state.deliveries[deadLetter.deliveryId];
    const row = screen.getByRole('button', { name: `View ${delivery.id}` }).closest('tr');
    expect(within(row).getByText(state.auditEvents[delivery.eventId].action)).toBeVisible();
    expect(within(row).getByText(String(delivery.attemptIds.length))).toBeVisible();
    expect(within(row).getByText('HTTP 503')).toBeVisible();
    expect(within(row).getByLabelText('Status: Failed')).toBeVisible();
  });

  it('opens the delivery drawer with every identity in the chain', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderWebhooks(state);
    const delivery = selectDeliveries(state).find(({ status }) => status === 'success');
    await user.click(screen.getByRole('button', { name: `View ${delivery.id}` }));
    const drawer = screen.getByRole('dialog', { name: delivery.id });
    for (const id of [delivery.requestId, delivery.runId, delivery.eventId, delivery.id, delivery.payloadId, delivery.subscriptionId]) {
      expect(within(drawer).getAllByText(id).length).toBeGreaterThan(0);
    }
    expect(within(drawer).getByRole('link', { name: delivery.eventId })).toHaveAttribute('href', `/app/audit?records=${delivery.eventId}`);
    expect(within(drawer).getByRole('link', { name: delivery.runId })).toHaveAttribute('href', `/app/runs/${delivery.runId}`);
    expect(within(drawer).getByText(/signature: hmac-sha256 over timestamp \+ payload/i)).toBeVisible();
    expect(within(drawer).getByText(/signing material never enters this console/i)).toBeVisible();
    expect(within(drawer).getByText('HTTP 202 · sanitized')).toBeVisible();
    expect(within(drawer).queryByRole('button', { name: /simulated|advance|move exhausted/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `View ${delivery.id}` })).toHaveFocus();
  });

  it('opens the drawer from a ?records= deep link', () => {
    const state = buildState();
    const delivery = state.deliveries[seededDeadLetter(state).deliveryId];
    renderWebhooks(state, `/app/webhooks?records=${delivery.id}`);
    expect(screen.getByRole('dialog', { name: delivery.id })).toBeVisible();
  });
});

describe('WebhooksPage recovery', () => {
  it('replays the seeded dead letter, clears the queue, and records audit, metering, and health', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderWebhooks(state);
    const deadLetter = seededDeadLetter(state);
    expect(screen.getByText('items in DLQ').previousSibling).toHaveTextContent('1');
    const queue = screen.getByRole('region', { name: 'Dead letters' });
    expect(within(queue).getByText(deadLetter.reason)).toBeVisible();
    await user.click(within(queue).getByRole('button', { name: `Inspect ${deadLetter.deliveryId}` }));
    const drawer = screen.getByRole('dialog', { name: deadLetter.deliveryId });
    expect(within(drawer).getByText(deadLetter.id)).toBeVisible();
    expect(within(drawer).getAllByText('HTTP 503 · sanitized')).toHaveLength(3);

    await user.click(within(drawer).getByRole('button', { name: 'Replay dead letter' }));
    expect(within(drawer).queryByText(deadLetter.id)).not.toBeInTheDocument();
    expect(within(drawer).getByText('Recovery recorded')).toBeVisible();
    expect(within(drawer).getByText(`evt_replay_${deadLetter.id}`)).toBeVisible();
    expect(within(drawer).getByText(`meter_replay_${deadLetter.id}`)).toBeVisible();
    expect(within(drawer).getByText('Event delivery: healthy')).toBeVisible();
    expect(within(drawer).getByText('HTTP 202 · sanitized')).toBeVisible();
    expect(within(drawer).getByRole('link', { name: 'Review recovered overview' })).toHaveAttribute('href', '/app/overview');
    expect(screen.getByTestId('state-probe')).toHaveAttribute('data-replayed', '1');
    expect(screen.getByTestId('state-probe')).toHaveTextContent('');

    await user.keyboard('{Escape}');
    expect(screen.getByText('items in DLQ').previousSibling).toHaveTextContent('0');
    expect(within(screen.getByRole('region', { name: 'Dead letters' })).getByText(/every delivery in the window reached its subscriber/i)).toBeVisible();
  });

  it('replays inline from the recovery queue', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderWebhooks(state);
    const deadLetter = seededDeadLetter(state);
    await user.click(screen.getByRole('button', { name: `Replay dead letter ${deadLetter.id}` }));
    expect(screen.getByTestId('state-probe')).toHaveAttribute('data-replayed', '1');
    expect(screen.queryByText(deadLetter.reason)).not.toBeInTheDocument();
  });

  it('shows the auditor the exact permission instead of replay and manage controls', () => {
    const state = buildState((draft) => { draft.activePersonaId = 'auditor'; });
    const deadLetter = seededDeadLetter(state);
    renderWebhooks(state, `/app/webhooks?records=${deadLetter.deliveryId}`);
    const drawer = screen.getByRole('dialog', { name: deadLetter.deliveryId });
    expect(within(drawer).queryByRole('button', { name: 'Replay dead letter' })).not.toBeInTheDocument();
    expect(within(drawer).getByText(/delivery:replay permission/i)).toBeVisible();
    expect(within(drawer).getByText(deadLetter.id)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Pause |^Resume / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create subscription' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/webhook:manage permission/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: `Inspect ${deadLetter.deliveryId}` })).toBeVisible();
    expect(screen.queryByRole('button', { name: `Replay dead letter ${deadLetter.id}` })).not.toBeInTheDocument();
  });
});
