import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /cockpit is ready/i })).toBeVisible();
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
});
