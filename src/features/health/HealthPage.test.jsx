import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import HealthPage from './HealthPage';

function renderHealth(state = createSeedState()) {
  return render(<MemoryRouter><DemoProvider initialState={state}><HealthPage /></DemoProvider></MemoryRouter>);
}

describe('HealthPage', () => {
  it('derives service health from the actual simulated dependency set', () => {
    renderHealth();
    for (const name of ['Control plane', 'Connector registry', 'Operation journal', 'Event delivery', 'Metering bridge']) expect(screen.getByText(name)).toBeVisible();
    expect(screen.getAllByLabelText('Status: Warning').length).toBeGreaterThan(0);
    expect(screen.getByText('184 ms')).toBeVisible();
  });

  it('shows runtime identity and becomes healthy when every dependency recovers', () => {
    const state = createSeedState();
    state.dependencies.dep_event_delivery.status = 'healthy';
    renderHealth(state);
    expect(screen.getByText('showcase-local')).toBeVisible();
    expect(screen.getByText('Deterministic browser simulation')).toBeVisible();
    expect(screen.getByText(state.anchorTime)).toBeVisible();
    expect(screen.getAllByLabelText('Status: Healthy').length).toBeGreaterThanOrEqual(6);
  });
});
