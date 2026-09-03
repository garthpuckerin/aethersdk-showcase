import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('identifies itself as a mock portfolio demo', () => {
    render(<App />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeInTheDocument();
  });

  it('hydrates preferences once without overwriting later persona changes', () => {
    sessionStorage.setItem('aether-demo-entered', 'true');
    localStorage.setItem('aether-onboarding-complete', 'true');
    localStorage.setItem('aether-persona', 'operator');
    render(<App />);
    expect(screen.getByRole('button', { name: 'Demo controls' })).toHaveTextContent('Integration Operator');
  });
});
