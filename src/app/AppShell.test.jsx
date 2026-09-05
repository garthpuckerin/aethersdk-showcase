import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { DemoProvider } from '../demo/DemoProvider';
import { ACTIONS, showcaseReducer } from '../demo/reducer';
import { createSeedState } from '../demo/seed';
import { selectDeadLetters, selectExceptions, selectTenant, selectUsageMetric, selectVisibleRuns } from '../demo/selectors';
import { ROUTES } from './routeRegistry';
import { AppRoutes } from './routes';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderRoute(path, personaId = 'admin', mutate) {
  const state = createSeedState();
  state.activePersonaId = personaId;
  const initial = mutate ? mutate(state) : state;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={initial} autopilotEnabled={false}>
        <AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} />
        <LocationProbe />
      </DemoProvider>
    </MemoryRouter>,
  );
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.density = 'roomy';
  });

  it('keeps permissions and page components in the shared route registry', () => {
    expect(ROUTES.every((route) => route.permission && route.component)).toBe(true);
  });

  it('uses one grouped navigation registry and marks the active route', () => {
    renderRoute('/app/integrations');
    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    expect(navigation).toBeVisible();
    expect(within(navigation).getByRole('link', { name: /^Integrations/ })).toHaveAttribute('aria-current', 'page');
    for (const group of ['Observe', 'Operate', 'Govern', 'System']) expect(navigation).toHaveTextContent(group);
  });

  it('badges Integrations and Webhooks with the same exception counts the selectors report', () => {
    const state = createSeedState();
    const exceptions = selectExceptions(state);
    const deadLetters = selectDeadLetters(state);
    renderRoute('/app/overview');
    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(navigation).getByLabelText(`${exceptions.connectors.length} connectors needing attention`)).toHaveTextContent(String(exceptions.connectors.length));
    expect(within(navigation).getByLabelText(`${deadLetters.length} dead letters awaiting replay`)).toHaveTextContent(String(deadLetters.length));
  });

  it('shows the tenant tier card from the usage selector', () => {
    const state = createSeedState();
    const tenant = selectTenant(state);
    const usage = selectUsageMetric(state);
    renderRoute('/app/overview');
    const tier = screen.getByTestId('sidebar-tier');
    expect(tier).toHaveTextContent(`${tenant.plan} tier`);
    expect(tier).toHaveTextContent(`${compact.format(usage.value)} / ${compact.format(tenant.entityLimit)} entity events this period`);
    expect(within(tier).getByRole('progressbar')).toHaveAttribute('max', String(tenant.entityLimit));
  });

  it('shows tenant, environment, mock boundary, and persona', () => {
    renderRoute('/app/overview', 'operator');
    expect(screen.getByRole('button', { name: 'Tenant: Harborline FCU' })).toHaveTextContent('tenant_harborline');
    expect(screen.getByText('Simulated')).toBeVisible();
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Demo controls' })).toHaveTextContent('Integration Operator');
    const topbar = screen.getByRole('button', { name: 'Search and commands' }).closest('header');
    expect(within(topbar).getByLabelText('Status: Warning')).toBeVisible();
  });

  it('explains the isolation control instead of switching tenants', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: 'Tenant: Harborline FCU' }));
    const dialog = screen.getByRole('dialog', { name: 'Switch tenant' });
    expect(within(dialog).getByText('Harborline Federal Credit Union')).toBeVisible();
    expect(within(dialog).getByText('Northstar Labs')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Isolation control — not selectable in the demo' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tenant: Harborline FCU' })).toHaveFocus();
  });

  it('switches density from the top bar and persists the preference', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    const control = screen.getByRole('group', { name: 'Information density' });
    expect(within(control).getByRole('button', { name: 'Roomy' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(control).getByRole('button', { name: 'Dense' }));
    expect(document.documentElement).toHaveAttribute('data-density', 'dense');
    expect(within(control).getByRole('button', { name: 'Dense' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('aether-density')).toBe('dense');
  });

  it('renders a designed denied deep link with its permission', () => {
    renderRoute('/app/access', 'auditor');
    expect(screen.getByRole('heading', { name: 'Permission required' })).toBeVisible();
    expect(screen.getByText(/access:view/i)).toBeVisible();
  });

  it('renders a designed unknown route', () => {
    renderRoute('/app/not-real');
    expect(screen.getByRole('heading', { name: /route not found/i })).toBeVisible();
  });

  it('opens command search and navigates from the shared registry', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /search and commands/i }));
    await user.type(screen.getByRole('searchbox'), 'webhooks');
    await user.click(screen.getByRole('option', { name: /webhooks/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/app/webhooks');
  });

  it('finds records in command search and opens them on their surface', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /search and commands/i }));
    await user.type(screen.getByRole('searchbox'), 'axonify');
    const group = screen.getByRole('group', { name: 'Connectors' });
    await user.click(within(group).getByRole('option', { name: /Axonify Frontline/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/app/integrations?records=con_axonify');
  });

  it('moves through results with the keyboard and chooses with Enter', async () => {
    const user = userEvent.setup();
    const state = createSeedState();
    const [, second] = selectVisibleRuns(state).slice(0, 40).filter((run) => run.id.includes('run_03'));
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /search and commands/i }));
    await user.type(screen.getByRole('searchbox'), 'run_03');
    await user.keyboard('{ArrowDown}');
    const results = screen.getByRole('listbox', { name: 'Results' });
    expect(within(results).getByRole('option', { name: new RegExp(second.id) })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent(`/app/runs/${second.id}`);
  });

  it('hides record groups the persona is not permitted to view', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview', 'auditor');
    await user.click(screen.getByRole('button', { name: /search and commands/i }));
    await user.type(screen.getByRole('searchbox'), 'theo');
    const results = screen.getByRole('listbox', { name: 'Results' });
    expect(within(results).queryByRole('group', { name: 'Members' })).not.toBeInTheDocument();
    expect(results).toHaveTextContent(/No surfaces or records match/);
  });

  it('lets an admin find members by name and opens the access surface', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /search and commands/i }));
    await user.type(screen.getByRole('searchbox'), 'theo');
    await user.click(within(screen.getByRole('group', { name: 'Members' })).getByRole('option', { name: /Theo Park/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/app/access');
  });

  it('changes persona, theme, and density through demo controls', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /demo controls/i }));
    await user.selectOptions(screen.getByLabelText('Persona'), 'developer');
    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    await user.click(screen.getByRole('button', { name: 'Dense display' }));
    expect(screen.getByRole('button', { name: 'Demo controls' })).toHaveTextContent('Developer');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-density', 'dense');
  });

  it('keeps the workflow engine verbs inside demo controls', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview');
    await user.click(screen.getByRole('button', { name: /demo controls/i }));
    const autopilot = screen.getByRole('switch', { name: 'Autopilot on' });
    expect(autopilot).toHaveAttribute('aria-checked', 'true');
    await user.click(autopilot);
    expect(screen.getByRole('switch', { name: 'Autopilot off' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Step workflow' })).toBeDisabled();
    expect(screen.getByText('Nothing to step')).toBeVisible();
  });

  it('steps a live run one stage at a time from demo controls', async () => {
    const user = userEvent.setup();
    renderRoute('/app/overview', 'operator', (state) => showcaseReducer(
      { ...state, autopilot: false },
      { type: ACTIONS.START_SYNC, sourceConnectorId: 'con_ukg', targetConnectorIds: ['con_docebo', 'con_linkedin', 'con_axonify'] },
    ));
    await user.click(screen.getByRole('button', { name: /demo controls/i }));
    expect(screen.getByText('Next: run run_live_harborline_001 → authorization')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Step workflow' }));
    expect(screen.getByText('Next: run run_live_harborline_001 → fetch')).toBeVisible();
  });
});
