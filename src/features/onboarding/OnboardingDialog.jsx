import { useState } from 'react';
import { PERSONAS } from '../../access/policy';
import Dialog from '../../components/Dialog';
import { Button, Eyebrow } from '../../components/ui';

const STEPS = [
  {
    title: 'What this demo is',
    eyebrow: 'Boundary',
    body: 'A frontend-only operator cockpit using fictional, deterministic mock data. Every action is local; no provider, customer, or production system is contacted.',
  },
  { title: 'Choose your perspective', eyebrow: 'Persona' },
  {
    title: 'Trace one seam',
    eyebrow: 'Guided task',
    body: 'Validate Salesforce, run a typed contact sync, retry one failed target, then follow its audit event into webhook delivery and dead-letter replay.',
  },
  {
    title: 'Your cockpit is ready',
    eyebrow: 'Ready',
    body: 'Metrics, run state, audit, delivery, health, and usage all project from the same fixture graph. Start with the integration needing attention.',
  },
];

export default function OnboardingDialog({ open, onComplete, onSkip, onPersonaChange }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  return (
    <Dialog open={open} onClose={onSkip} title={current.title} className="onboarding">
      <Eyebrow>{current.eyebrow} · {step + 1} / {STEPS.length}</Eyebrow>
      {current.body && <p className="onboarding__body">{current.body}</p>}
      {step === 1 && (
        <div className="onboarding__personas">
          {Object.values(PERSONAS).map((persona) => (
            <Button key={persona.id} variant="ghost" onClick={() => onPersonaChange(persona.id)}>
              <strong>{persona.label}</strong>
              <span>{persona.id === 'admin' ? 'Operate and govern the whole tenant' : persona.id === 'operator' ? 'Run, diagnose, and recover syncs' : persona.id === 'auditor' ? 'Inspect immutable operational evidence' : 'Work within assigned integrations'}</span>
            </Button>
          ))}
        </div>
      )}
      <footer className="onboarding__actions">
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((value) => value + 1)}>Continue</Button>
        ) : (
          <Button onClick={onComplete}>Enter cockpit</Button>
        )}
        <Button variant="ghost" onClick={onSkip}>Skip onboarding</Button>
      </footer>
    </Dialog>
  );
}
