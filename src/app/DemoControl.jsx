import { useRef, useState } from 'react';
import { PERSONAS } from '../access/policy';
import Dialog from '../components/Dialog';
import { Button } from '../components/ui';
import { nextAutopilotAction } from '../demo/autopilot';
import { useDemo } from '../demo/context';
import { savePreference } from '../demo/persistence';
import { ACTIONS } from '../demo/reducer';

/* The only place engine verbs live. Product screens expose human verbs; the
   workflow engine (autopilot) is inspected and stepped from here. */
const THEMES = [['light', 'Light theme'], ['dark', 'Dark theme']];
const DENSITIES = [['roomy', 'Roomy display'], ['dense', 'Dense display']];
const SCENARIOS = [['default', 'Default'], ['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error'], ['denied', 'Denied']];

function initials(label) {
  return label.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

export default function DemoControl({ onReplayOnboarding, onReset }) {
  const { state, dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const persona = PERSONAS[state.activePersonaId];
  const step = nextAutopilotAction(state);

  function setPersona(personaId) {
    savePreference('persona', personaId);
    dispatch({ type: ACTIONS.SET_PERSONA, personaId });
  }

  function setTheme(theme) {
    savePreference('theme', theme);
    dispatch({ type: ACTIONS.SET_THEME, theme });
  }

  function setDensity(density) {
    savePreference('density', density);
    dispatch({ type: ACTIONS.SET_DENSITY, density });
  }

  return (
    <>
      <Button ref={triggerRef} variant="quiet" className="persona-trigger" onClick={() => setOpen(true)} aria-label="Demo controls">
        <span className="avatar" aria-hidden="true">{initials(persona.label)}</span>
        <span>{persona.label}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Demo controls" returnFocusRef={triggerRef}>
        <div className="control-stack">
          <label>Persona
            <select aria-label="Persona" value={state.activePersonaId} onChange={(event) => setPersona(event.target.value)}>
              {Object.values(PERSONAS).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <p className="control-stack__note">{persona.description}.</p>
          <fieldset>
            <legend>Appearance</legend>
            <div className="control-row">
              {THEMES.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={state.theme === value} onClick={() => setTheme(value)}>{label}</Button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Information density</legend>
            <div className="control-row">
              {DENSITIES.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={state.density === value} onClick={() => setDensity(value)}>{label}</Button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Data state</legend>
            <select aria-label="Data scenario" value={state.scenario} onChange={(event) => dispatch({ type: ACTIONS.SET_SCENARIO, scenario: event.target.value })}>
              {SCENARIOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Workflow engine</legend>
            <div className="control-row">
              <Button
                variant="ghost"
                role="switch"
                aria-checked={state.autopilot}
                onClick={() => dispatch({ type: ACTIONS.SET_AUTOPILOT, autopilot: !state.autopilot })}
              >
                Autopilot {state.autopilot ? 'on' : 'off'}
              </Button>
              <Button variant="ghost" disabled={!step} onClick={() => step && dispatch(step.action)}>Step workflow</Button>
            </div>
            <p className="control-stack__note">{step ? `Next: ${step.reason}` : 'Nothing to step'}</p>
          </fieldset>
          <div className="control-row">
            <Button variant="ghost" onClick={onReplayOnboarding}>Replay onboarding</Button>
            <Button variant="ghost" onClick={onReset}>Sign out / reset demo</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
