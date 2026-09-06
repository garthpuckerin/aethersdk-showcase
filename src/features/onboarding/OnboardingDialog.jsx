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
    body: 'Validate UKG, run the new-hire provisioning sync to Docebo, LinkedIn Learning and Axonify, retry the one failed target, then follow its audit event into webhook delivery and dead-letter replay. Then find the provisioning agent in the audit trail: it previewed its write before committing, and every event carries its run id — the same governed path, a different kind of actor.',
  },
  {
    title: 'Your cockpit is ready',
    eyebrow: 'Ready',
    body: 'Metrics, run state, audit, delivery, health, and usage all project from the same fixture graph. Start with the integration needing attention.',
  },
];

const FIRST_STEP = 0;
const LAST_STEP = STEPS.length - 1;

function personaInitials(label) {
  return label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function PersonaCard({ persona, selected, onSelect }) {
  return (
    <Button variant="ghost" className="persona-card" aria-pressed={selected} onClick={() => onSelect(persona.id)}>
      <span className="avatar avatar--lg" aria-hidden="true">{personaInitials(persona.label)}</span>
      <span className="persona-card__text">
        <strong>{persona.label}</strong>
        <span>{persona.description}</span>
      </span>
    </Button>
  );
}

/* Step and selection live in local state, so a replay (open flipping false →
   true) resets them synchronously during render — no last-step flash. */
export default function OnboardingDialog({ open, onComplete, onSkip, onPersonaChange, activePersonaId = null }) {
  const [step, setStep] = useState(FIRST_STEP);
  const [selectedPersonaId, setSelectedPersonaId] = useState(activePersonaId);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(FIRST_STEP);
      setSelectedPersonaId(activePersonaId);
    }
  }

  const current = STEPS[step];
  const isFirst = step === FIRST_STEP;
  const isLast = step === LAST_STEP;

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
            <PersonaCard key={persona.id} persona={persona} selected={selectedPersonaId === persona.id} onSelect={choosePersona} />
          ))}
        </div>
      )}
      <footer className="onboarding__actions">
        <div className="onboarding__actions-group">
          {!isFirst && <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>Back</Button>}
          {isLast ? (
            <Button onClick={onComplete}>Enter cockpit</Button>
          ) : (
            <Button onClick={() => setStep((value) => value + 1)}>Continue</Button>
          )}
        </div>
        <Button variant="ghost" onClick={onSkip}>Skip onboarding</Button>
      </footer>
    </Dialog>
  );
}
