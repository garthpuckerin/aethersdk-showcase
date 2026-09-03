import { useRef, useState } from 'react';
import { PERSONAS } from '../access/policy';
import Dialog from '../components/Dialog';
import { Button } from '../components/ui';
import { useDemo } from '../demo/context';
import { savePreference } from '../demo/persistence';
import { ACTIONS } from '../demo/reducer';

export default function DemoControl({ onReplayOnboarding, onReset }) {
  const { state, dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

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
      <Button ref={triggerRef} variant="ghost" className="persona-trigger" onClick={() => setOpen(true)} aria-label="Demo controls">
        <span className="persona-trigger__avatar">{PERSONAS[state.activePersonaId].label.split(' ').map((word) => word[0]).join('')}</span>
        <span>{PERSONAS[state.activePersonaId].label}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Demo controls" returnFocusRef={triggerRef}>
        <div className="control-stack">
          <label>Persona
            <select value={state.activePersonaId} onChange={(event) => setPersona(event.target.value)}>
              {Object.values(PERSONAS).map((persona) => <option key={persona.id} value={persona.id}>{persona.label}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Appearance</legend>
            <div className="control-row">
              <Button variant="ghost" onClick={() => setTheme('light')}>Light theme</Button>
              <Button variant="ghost" onClick={() => setTheme('dark')}>Dark theme</Button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Information density</legend>
            <div className="control-row">
              <Button variant="ghost" onClick={() => setDensity('roomy')}>Roomy display</Button>
              <Button variant="ghost" onClick={() => setDensity('dense')}>Dense display</Button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Data state</legend>
            <select aria-label="Data scenario" value={state.scenario} onChange={(event) => dispatch({ type: ACTIONS.SET_SCENARIO, scenario: event.target.value })}>
              <option value="default">Default</option><option value="loading">Loading</option><option value="empty">Empty</option><option value="error">Error</option><option value="denied">Denied</option>
            </select>
          </fieldset>
          <Button variant="ghost" onClick={onReplayOnboarding}>Replay onboarding</Button>
          <Button variant="ghost" onClick={onReset}>Sign out / reset demo</Button>
        </div>
      </Dialog>
    </>
  );
}
