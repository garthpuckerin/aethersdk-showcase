import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useDemo } from '../../demo/context';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectVisibleConnectors } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import IntegrationsPage from './IntegrationsPage';
import { providerInitials } from './providerMark';

/* Stand-in for the run detail route: proves navigation landed on the run the
   reducer created, with the fan-out the drawer asked for. */
function RunProbe() {
  const { runId } = useParams();
  const { state } = useDemo();
  const run = state.runs[runId];
  return <p data-testid="run-probe">{runId} · {run ? run.targetConnectorIds.length : 0} targets · {run?.idempotencyKey}</p>;
}

/* Exposes the newest audit event and connector so tests can assert reducer effects. */
function StateProbe() {
  const { state } = useDemo();
  const newest = state.auditEvents[state.auditOrder[0]];
  const lastConnector = state.connectors[state.connectorOrder.at(-1)];
  return (
    <p data-testid="state-probe">
      {newest.action} · {newest.resourceId} · {lastConnector.id} · {lastConnector.status} · {lastConnector.credentialState} · {String(lastConnector.enabled)}
    </p>
  );
}

function renderIntegrations({ path = '/app/integrations', personaId = 'admin' } = {}) {
  const state = buildState((draft) => { draft.activePersonaId = personaId; });
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <Routes>
          <Route path="/app/integrations" element={<IntegrationsPage />} />
          <Route path="/app/runs/:runId" element={<RunProbe />} />
        </Routes>
        <StateProbe />
      </DemoProvider>
    </MemoryRouter>,
  );
  return state;
}

const cards = () => screen.queryAllByRole('button', { name: /^View / });

describe('IntegrationsPage', () => {
  it('renders one card per visible connector with the tenant lede', () => {
    const state = renderIntegrations();
    const visible = selectVisibleConnectors(state);
    expect(cards()).toHaveLength(visible.length);
    expect(screen.getByText(`${visible.length} connected adapters across 5 categories`)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add integration' })).toBeVisible();
    const linkedin = screen.getByRole('article', { name: 'LinkedIn Learning' });
    expect(within(linkedin).getByText('Credential reference expires soon')).toBeVisible();
    expect(within(linkedin).getByText('Learning target')).toBeVisible();
  });

  it('filters by category chip, status, and search, and clears back to the full grid', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'Learning' }));
    expect(screen.getByRole('button', { name: 'Learning' })).toHaveAttribute('aria-pressed', 'true');
    expect(cards()).toHaveLength(3);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'failed');
    expect(cards()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'View Axonify Frontline' })).toBeVisible();
    await user.type(screen.getByRole('searchbox', { name: /filter integrations/i }), 'nothing matches this');
    expect(cards()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cards()).toHaveLength(8);
  });

  it('honours record deep links from Overview', async () => {
    const user = userEvent.setup();
    renderIntegrations({ path: '/app/integrations?records=con_ukg,con_docebo' });
    expect(screen.getByText('Showing 2 contributing records')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View UKG Pro · People' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'View Tableau · Readiness' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(cards()).toHaveLength(8);
  });

  it('opens a complete connector drawer and validates through the shared reducer', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'View LinkedIn Learning' }));
    const drawer = screen.getByRole('dialog', { name: 'LinkedIn Learning' });
    expect(within(drawer).getByText('con_linkedin')).toBeVisible();
    const entityTypes = drawer.querySelector('.connector-entity-types');
    expect(within(entityTypes).getByText('corporate.employee.v1')).toBeVisible();
    expect(within(entityTypes).getByText('learning.course.v1')).toBeVisible();
    expect(within(drawer).getByText('Bidirectional')).toBeVisible();
    expect(within(drawer).getByText('OAuth 2.0')).toBeVisible();
    expect(within(drawer).getByText('lil.harborline.example')).toBeVisible();
    expect(within(drawer).getByText('Every 240 minutes')).toBeVisible();
    expect(within(drawer).getByText('Reference expiring')).toBeVisible();
    expect(within(drawer).getByLabelText('Status: Warning')).toBeVisible();
    expect(within(drawer).getAllByRole('link', { name: /^run_/ }).length).toBeGreaterThan(0);
    await user.click(within(drawer).getByRole('button', { name: 'Validate credential reference' }));
    expect(within(drawer).getByLabelText('Status: Healthy')).toBeVisible();
    expect(within(drawer).getByText('Reference valid')).toBeVisible();
    expect(screen.getByTestId('state-probe')).toHaveTextContent('connector.validated · con_linkedin');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts the signature fan-out from UKG and lands on the live run', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'View UKG Pro · People' }));
    const drawer = screen.getByRole('dialog', { name: 'UKG Pro · People' });
    expect(within(drawer).getByText('System of record')).toBeVisible();
    for (const target of ['Docebo LMS', 'LinkedIn Learning', 'Axonify Frontline']) expect(within(drawer).getByRole('checkbox', { name: target })).toBeChecked();
    expect(within(drawer).getByRole('checkbox', { name: 'Tableau · Readiness' })).not.toBeChecked();
    await user.click(within(drawer).getByRole('button', { name: 'Start governed sync' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('run-probe')).toHaveTextContent('run_live_harborline_001 · 3 targets · idem_live_harborline_001');
  });

  it('opens the sync section from the card and creates an operator run for a non-live fan-out', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'Sync Docebo LMS now' }));
    const drawer = screen.getByRole('dialog', { name: 'Docebo LMS' });
    expect(within(drawer).getByRole('checkbox', { name: 'Tableau · Readiness' })).toBeChecked();
    expect(within(drawer).getByRole('checkbox', { name: 'UKG Pro · People' })).not.toBeChecked();
    await user.selectOptions(within(drawer).getByRole('combobox', { name: 'Entity type' }), 'learning.course.v1');
    await user.click(within(drawer).getByRole('button', { name: 'Start governed sync' }));
    expect(screen.getByTestId('run-probe')).toHaveTextContent(/^run_op_\d+ · 1 targets · idem_run_op_/);
  });

  it('adds a catalog adapter as an inactive connector, then validates and enables it', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'Add integration' }));
    const dialog = screen.getByRole('dialog', { name: 'Add integration' });
    expect(within(dialog).queryByText('Docebo')).not.toBeInTheDocument();
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search catalog' }), 'workday');
    expect(within(dialog).getAllByRole('button', { name: /^Add / })).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Add Workday' }));
    const drawer = await screen.findByRole('dialog', { name: 'Workday' });
    expect(screen.getByTestId('state-probe')).toHaveTextContent('connector.added · con_workday · con_workday · inactive · reference_missing · false');
    expect(within(drawer).getByLabelText('Status: Inactive')).toBeVisible();
    expect(within(drawer).getByText('Reference missing')).toBeVisible();
    expect(within(drawer).getByText('Not yet validated')).toBeVisible();
    expect(within(drawer).queryByRole('button', { name: 'Start governed sync' })).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Validate credential reference' }));
    expect(within(drawer).getByText('Reference valid')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Enable connector' }));
    expect(screen.getByTestId('state-probe')).toHaveTextContent('connector.enabled · con_workday · con_workday · healthy · reference_valid · true');
    expect(within(drawer).getByRole('button', { name: 'Start governed sync' })).toBeVisible();
    expect(within(drawer).getByRole('button', { name: 'Disable connector' })).toBeVisible();
    expect(cards()).toHaveLength(9);
  });

  it('disables a connector only after inline confirmation', async () => {
    const user = userEvent.setup();
    renderIntegrations();
    await user.click(screen.getByRole('button', { name: 'View Slack · #lms-ops' }));
    const drawer = screen.getByRole('dialog', { name: 'Slack · #lms-ops' });
    expect(within(drawer).getByText('Event-driven')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Disable connector' }));
    await user.click(within(drawer).getByRole('button', { name: 'Keep enabled' }));
    expect(within(drawer).getByLabelText('Status: Healthy')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Disable connector' }));
    await user.click(within(drawer).getByRole('button', { name: 'Confirm disable' }));
    expect(within(drawer).getByLabelText('Status: Inactive')).toBeVisible();
    expect(within(drawer).getByRole('button', { name: 'Enable connector' })).toBeVisible();
    expect(screen.getByTestId('state-probe')).toHaveTextContent('connector.disabled · con_slack');
  });

  it('scopes the developer persona to the learning connectors without manage verbs', () => {
    renderIntegrations({ personaId: 'developer' });
    expect(cards().map((button) => button.getAttribute('aria-label'))).toEqual(['View Docebo LMS', 'View LinkedIn Learning']);
    expect(screen.queryByRole('button', { name: 'Add integration' })).not.toBeInTheDocument();
    expect(screen.getByText('2 connected adapters across 1 categories')).toBeVisible();
  });

  it('shows permission notes instead of verbs to an auditor', async () => {
    const user = userEvent.setup();
    renderIntegrations({ personaId: 'auditor' });
    expect(screen.queryByRole('button', { name: /^Sync .* now$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View UKG Pro · People' }));
    const drawer = screen.getByRole('dialog', { name: 'UKG Pro · People' });
    expect(within(drawer).queryByRole('button', { name: 'Validate credential reference' })).not.toBeInTheDocument();
    expect(within(drawer).getByText(/connector:validate permission/i)).toBeVisible();
    expect(within(drawer).getByText(/sync:run permission/i)).toBeVisible();
    expect(within(drawer).queryByRole('button', { name: 'Disable connector' })).not.toBeInTheDocument();
  });
});

describe('providerInitials', () => {
  it('derives two-letter marks from provider names', () => {
    expect(providerInitials('UKG Pro')).toBe('UP');
    expect(providerInitials('Docebo')).toBe('DO');
    expect(providerInitials('Jira Service Management')).toBe('JS');
    expect(providerInitials('')).toBe('··');
  });
});
