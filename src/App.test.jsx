import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { buildInitialState } from './demo/bootstrap';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('identifies itself as a mock portfolio demo', () => {
    render(<App />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeInTheDocument();
  });

  it('opens onboarding on first launch and lands in the cockpit after it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /launch demo/i })[0]);
    expect(screen.getByRole('dialog', { name: 'What this demo is' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Skip onboarding' }));
    expect(screen.getByRole('button', { name: 'Demo controls' })).toBeVisible();
    expect(localStorage.getItem('aether-onboarding-complete')).toBe('true');
  });

  it('hydrates preferences once without overwriting later persona changes', () => {
    sessionStorage.setItem('aether-demo-entered', 'true');
    localStorage.setItem('aether-onboarding-complete', 'true');
    localStorage.setItem('aether-persona', 'operator');
    render(<App />);
    expect(screen.getByRole('button', { name: 'Demo controls' })).toHaveTextContent('Integration Operator');
  });

  it('builds the initial state from persisted preferences and always starts on the default scenario', () => {
    localStorage.setItem('aether-persona', 'auditor');
    localStorage.setItem('aether-theme', 'dark');
    localStorage.setItem('aether-density', 'dense');
    const state = buildInitialState();
    expect(state.activePersonaId).toBe('auditor');
    expect(state.theme).toBe('dark');
    expect(state.density).toBe('dense');
    expect(state.scenario).toBe('default');
  });
});
