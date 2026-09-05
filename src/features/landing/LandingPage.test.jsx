import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LANDING_FLOW, LANDING_TRACE } from '../../demo/presentation';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('states the mock boundary and product promise before launch', () => {
    render(<LandingPage onLaunch={() => {}} />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: /seams between systems/i })).toBeVisible();
    expect(screen.getByText(/typed, multi-provider synchronization/i)).toBeVisible();
    expect(screen.getByText(/fictional credit union/i)).toBeVisible();
  });

  it('names the featured integrations of the credit-union story', () => {
    render(<LandingPage onLaunch={() => {}} />);
    const providers = screen.getByLabelText('Featured integrations');
    for (const name of ['UKG Pro', 'Xperience', 'Docebo', 'LinkedIn Learning', 'Axonify', 'Tableau']) {
      expect(within(providers).getByText(name)).toBeVisible();
    }
  });

  it('illustrates the signature run from the shared presentation constants', () => {
    render(<LandingPage onLaunch={() => {}} />);
    const signal = screen.getByLabelText('Illustrative live sync trace');
    expect(signal).toHaveTextContent(LANDING_TRACE.runId);
    expect(signal).toHaveTextContent(LANDING_TRACE.caption);
    for (const [, title] of LANDING_FLOW) expect(screen.getByRole('heading', { name: title })).toBeVisible();
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
