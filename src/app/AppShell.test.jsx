import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../demo/DemoProvider';
import { createSeedState } from '../demo/seed';
import { ROUTES } from './routeRegistry';
import { AppRoutes } from './routes';

function renderRoute(path, personaId = 'admin') {
  const state = createSeedState();
  state.activePersonaId = personaId;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider initialState={state}>
        <AppRoutes onReplayOnboarding={() => {}} onReset={() => {}} />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('keeps permissions and page components in the shared route registry', () => {
    expect(ROUTES.every((route) => route.permission && route.component)).toBe(true);
  });

  it('uses one grouped navigation registry and marks the active route', () => {
    renderRoute('/app/integrations');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute('aria-current', 'page');
    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    expect(navigation).toHaveTextContent('Observe');
    expect(navigation).toHaveTextContent('Operate');
    expect(navigation).toHaveTextContent('Govern');
    expect(navigation).toHaveTextContent('System');
  });

  it('shows tenant, environment, mock boundary, and persona', () => {
    renderRoute('/app/overview', 'operator');
    expect(screen.getByText('Northstar Labs')).toBeVisible();
    expect(screen.getByText('Simulated')).toBeVisible();
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeVisible();
    expect(screen.getByText('Integration Operator')).toBeVisible();
    const topbar = screen.getByRole('button', { name: 'Search and commands' }).closest('header');
    expect(within(topbar).getByLabelText('Status: Warning')).toBeVisible();
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
    expect(screen.getByRole('heading', { name: 'Webhooks & recovery' })).toBeVisible();
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
});
