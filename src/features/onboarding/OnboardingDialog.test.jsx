import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PERSONAS } from '../../access/policy';
import OnboardingDialog from './OnboardingDialog';

describe('OnboardingDialog', () => {
  it('walks boundary, persona, guided task, and completion steps', async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog open onComplete={() => {}} onSkip={() => {}} onPersonaChange={() => {}} />);
    expect(screen.getByRole('heading', { name: /what this demo is/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /choose your perspective/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /integration operator/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /trace one seam/i })).toBeVisible();
    expect(screen.getByText(/Validate UKG, run the new-hire provisioning sync to Docebo, LinkedIn Learning and Axonify/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /cockpit is ready/i })).toBeVisible();
  });

  it('describes each persona from the access policy and marks the chosen one', async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog open onComplete={() => {}} onSkip={() => {}} onPersonaChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    for (const persona of Object.values(PERSONAS)) expect(screen.getByText(persona.description)).toBeVisible();
    const auditor = screen.getByRole('button', { name: /auditor/i });
    expect(auditor).toHaveAttribute('aria-pressed', 'false');
    await user.click(auditor);
    expect(auditor).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /platform admin/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists the selected persona and completes', async () => {
    const onPersonaChange = vi.fn();
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OnboardingDialog open onComplete={onComplete} onSkip={() => {}} onPersonaChange={onPersonaChange} />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /auditor/i }));
    expect(onPersonaChange).toHaveBeenCalledWith('auditor');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /enter cockpit/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('supports an explicit skip path', async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<OnboardingDialog open onComplete={() => {}} onSkip={onSkip} onPersonaChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /skip onboarding/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('offers Back on every step after the first and never on the first', async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog open onComplete={() => {}} onSkip={() => {}} onPersonaChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /trace one seam/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('heading', { name: /choose your perspective/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('heading', { name: /what this demo is/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull();
  });

  it('restarts at step 1 when replayed after reaching the last step', async () => {
    const user = userEvent.setup();
    const props = { onComplete: () => {}, onSkip: () => {}, onPersonaChange: () => {} };
    const { rerender } = render(<OnboardingDialog open {...props} />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /cockpit is ready/i })).toBeVisible();
    rerender(<OnboardingDialog open={false} {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<OnboardingDialog open {...props} />);
    expect(screen.getByRole('heading', { name: /what this demo is/i })).toBeVisible();
    expect(screen.getByText(/1 \/ 4/)).toBeVisible();
  });

  it('pre-selects the active persona and shows an initials mark on each card', async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog open activePersonaId="developer" onComplete={() => {}} onSkip={() => {}} onPersonaChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('button', { name: /developer/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /integration operator/i }).querySelector('.avatar')).toHaveTextContent('IO');
  });
});
