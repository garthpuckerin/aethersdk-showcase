import { useState } from 'react';
import { PERSONAS } from '../../access/policy';
import Dialog from '../../components/Dialog';
import { Button, Eyebrow } from '../../components/ui';

const STEPS = [
  {
    title: 'What this demo is',
    eyebrow: 'Boundary',
    body: 'A frontend-only operator cockpit for a fictional credit union, using deterministic mock data. Every action is local; no provider, customer, or production system is contacted.',
  },
  { title: 'Choose your perspective', eyebrow: 'Persona' },
  {
    title: 'Trace one seam',
    eyebrow: 'Guided task',
    body: 'Validate UKG, run the new-hire provisioning sync to Docebo, LinkedIn Learning and Axonify, retry the one failed target, then follow its audit event into webhook delivery and dead-letter replay.',
  },
  {
    title: 'Your cockpit is ready',
    eyebrow: 'Ready',
    body: 'Metrics, run state, audit, delivery, health, and usage all project from the same fixture graph. Start with the integration needing attention.',
  },
];

export default function OnboardingDialog({ open, onComplete, onSkip, onPersonaChange, activePersonaId = null }) {
  const [step, setStep] = useState(0);
  const [selectedPersonaId, setSelectedPersonaId] = useState(activePersonaId);
  const current = STEPS[step];

  function choosePersona(personaId) {
    setSelectedPersonaId(personaId);
    onPersonaChange(personaId);
  }

  return (
    <Dialog open={open} onClose={onSkip} title={current.title} className="onboarding">
      <Eyebrow>{current.eyebrow} · {step + 1} / {STEPS.length}</Eyebrow>
      {current.body && <p className="onboarding__body">{current.body}</p>}
      {step === 1 && (
        <div className="onboarding__personas" role="group" aria-label="Personas">
          {Object.values(PERSONAS).map((persona) => (
            <Button key={persona.id} variant="ghost" aria-pressed={selectedPersonaId === persona.id} onClick={() => choosePersona(persona.id)}>
              <strong>{persona.label}</strong>
              <span>{persona.description}</span>
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
