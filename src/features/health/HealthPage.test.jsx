import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectDependencies, selectExceptions } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import HealthPage from './HealthPage';

function renderHealth(state = buildState()) {
  return render(
    <MemoryRouter>
      <DemoProvider initialState={state} autopilotEnabled={false}>
        <HealthPage />
      </DemoProvider>
    </MemoryRouter>,
  );
}

function clearIncidents(state) {
  state.deadLetters = {};
  state.deadLetterOrder = [];
  for (const run of Object.values(state.runs)) if (run.status === 'failed') run.status = 'success';
  for (const connector of Object.values(state.connectors)) {
    if (['warning', 'failed'].includes(connector.status)) connector.status = 'healthy';
    if (connector.credentialState === 'reference_expiring') connector.credentialState = 'reference_valid';
  }
}

describe('HealthPage', () => {
  it('derives the overall service status from the dependency set', () => {
    const state = buildState();
    renderHealth(state);
    const heading = screen.getByText('Overall service').closest('.page-heading__status');
    expect(within(heading).getByLabelText('Status: Warning')).toBeVisible();
    expect(screen.getByText('Degraded')).toBeVisible();

    const dependencies = screen.getByLabelText('Runtime dependencies');
    expect(within(dependencies).getAllByRole('listitem')).toHaveLength(selectDependencies(state).length);
    expect(within(dependencies).getAllByLabelText('Status: Warning')).toHaveLength(1);
    expect(within(dependencies).getByText('reconnecting')).toBeVisible();
    for (const dependency of selectDependencies(state)) expect(within(dependencies).getByText(dependency.name)).toBeVisible();
  });

  it('becomes operational when every dependency recovers', () => {
    const state = buildState((draft) => { draft.dependencies.dep_event_delivery.status = 'healthy'; });
    renderHealth(state);
    const heading = screen.getByText('Overall service').closest('.page-heading__status');
    expect(within(heading).getByLabelText('Status: Healthy')).toBeVisible();
    expect(screen.getByText('Operational')).toBeVisible();
    const dependencies = screen.getByLabelText('Runtime dependencies');
    expect(within(dependencies).queryAllByLabelText('Status: Warning')).toHaveLength(0);
    expect(within(dependencies).getAllByLabelText('Status: Healthy')).toHaveLength(selectDependencies(state).length);
    expect(within(dependencies).getByText('184 ms')).toBeVisible();
  });

  it('renders uptime in days and hours from the runtime start and never prints the anchor', () => {
    const state = buildState();
    renderHealth(state);
    expect(screen.getByTestId('uptime-value')).toHaveTextContent(/^\d+d \d+h$/);
    expect(screen.queryByText(state.anchorTime)).not.toBeInTheDocument();
    expect(screen.getByText('showcase-local')).toBeVisible();
    expect(screen.getByText('Deterministic browser simulation')).toBeVisible();
  });

  it('lists the seeded dead letter as an incident linking to webhooks', () => {
    const state = buildState();
    const [deadLetter] = selectExceptions(state).deadLetters;
    expect(deadLetter).toBeDefined();
    renderHealth(state);
    const incidents = screen.getByRole('list', { name: 'Recent incidents' });
    expect(within(incidents).getByText(deadLetter.id)).toBeVisible();
    expect(within(incidents).getAllByRole('link', { name: /open webhooks/i })[0]).toHaveAttribute('href', '/app/webhooks');
  });

  it('shows an empty state when no incidents fall inside the window', () => {
    renderHealth(buildState(clearIncidents));
    expect(screen.getByText('No incidents in the window')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Recent incidents' })).not.toBeInTheDocument();
  });
});
