import { createSeedState } from './seed.js';
import { loadPreferences, loadWorkflowState } from './persistence.js';

/* Initial state for the app: a persisted workflow (re-anchored to now) when
   one exists for this seed version, otherwise a fresh graph; appearance and
   persona always come from saved preferences. */
export function buildInitialState() {
  const preferences = loadPreferences();
  const restored = loadWorkflowState();
  const base = restored ?? createSeedState();
  return { ...base, activePersonaId: preferences.persona, theme: preferences.theme, density: preferences.density, scenario: 'default' };
}
