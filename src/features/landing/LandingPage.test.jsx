import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('states the mock boundary and product promise before launch', () => {
    render(<LandingPage onLaunch={() => {}} />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: /seams between systems/i })).toBeVisible();
    expect(screen.getByText(/typed, multi-provider synchronization/i)).toBeVisible();
  });

  it('keeps every visible launch action functional', async () => {
    const onLaunch = vi.fn();
    const user = userEvent.setup();
    render(<LandingPage onLaunch={onLaunch} />);
    const launchButtons = screen.getAllByRole('button', { name: /launch demo/i });
    await user.click(launchButtons[0]);
    await user.click(launchButtons[1]);
    expect(onLaunch).toHaveBeenCalledTimes(2);
  });
});
