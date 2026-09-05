import { Link, useOutletContext } from 'react-router-dom';
import { PERSONAS } from '../../access/policy';
import { useDemo, useRelativeTime } from '../../demo/context';
import { savePreference } from '../../demo/persistence';
import { ACTIONS } from '../../demo/reducer';
import { selectDependencies, selectMembers, selectRuntimeHealth } from '../../demo/selectors';

export default function MobileMorePage() {
  const { onReset } = useOutletContext();
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const persona = PERSONAS[state.activePersonaId];
  const member = selectMembers(state).find(({ id }) => id === persona?.actorId);
  const dependencies = selectDependencies(state);
  const health = selectRuntimeHealth(state);
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';

  function setPersona(personaId) {
    savePreference('persona', personaId);
    dispatch({ type: ACTIONS.SET_PERSONA, personaId });
  }

  function toggleTheme() {
    savePreference('theme', nextTheme);
    dispatch({ type: ACTIONS.SET_THEME, theme: nextTheme });
  }

  return (
    <div className="mobile-stack">
      <section className="mobile-title">
        <p className="eyebrow">Companion</p>
        <h1>More</h1>
        <p>Who you are, how the demo runs, and the console handoff.</p>
      </section>

      <section className="panel mobile-panel">
        <div className="mobile-persona">
          <span className="avatar" aria-hidden="true">{(member?.name ?? persona.label).split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
          <div><strong>{member?.name ?? persona.label}</strong><small>{persona.label}{member?.lastActiveAt ? ` · active ${rel(member.lastActiveAt)}` : ''}</small></div>
        </div>
        <label className="field mobile-field">
          <span>Persona</span>
          <select value={state.activePersonaId} onChange={(event) => setPersona(event.target.value)}>
            {Object.values(PERSONAS).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <p className="mobile-help">{persona.description}. Persona changes scope and actions across every surface.</p>
      </section>

      <section className="panel mobile-panel">
        <div className="mobile-control">
          <div><strong>Theme</strong><small>{state.theme === 'dark' ? 'Dark' : 'Light'}</small></div>
          <button className="button button--ghost button--sm" type="button" onClick={toggleTheme}>Switch to {nextTheme}</button>
        </div>
        <div className="mobile-control">
          <div><strong>Autopilot</strong><small>{state.autopilot ? 'Runs and deliveries advance on their own' : 'Paused · the engine holds its next step'}</small></div>
          <button className="mobile-switch" type="button" role="switch" aria-checked={state.autopilot} aria-label="Autopilot" onClick={() => dispatch({ type: ACTIONS.SET_AUTOPILOT, autopilot: !state.autopilot })}><span aria-hidden="true" /></button>
        </div>
      </section>

      <section>
        <div className="mobile-section-head"><h2>Health summary</h2><span className="mobile-health-word">{health}</span></div>
        <ul className="mobile-dep-list">
          {dependencies.map((dependency) => (
            <li key={dependency.id}>
              <span className={`status-dot status-dot--${dependency.status}`} aria-label={`Status: ${dependency.status}`} />
              <div><strong>{dependency.label}</strong><small>{dependency.detail}</small></div>
              <span className="mono">{dependency.latencyMs} ms</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mobile-link-stack">
        <Link className="button button--ghost button-link" to="/app/overview?view=desktop">Open full desktop console</Link>
        <button className="button button--quiet" type="button" onClick={onReset}>Return to launch page</button>
        <p className="mobile-help">Adding connectors, subscriptions, and members is workstation-only.</p>
      </section>
    </div>
  );
}
