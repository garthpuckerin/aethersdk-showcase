import { shiftTimestamps } from './clock.js';
import { SEED_VERSION } from './seed.js';

export const STORAGE_KEYS = {
  entered: 'aether-demo-entered',
  onboarding: 'aether-onboarding-complete',
  persona: 'aether-persona',
  theme: 'aether-theme',
  density: 'aether-density',
  desktopView: 'aether-view-desktop',
  workflow: 'aether-workflow-state',
};

const ALLOWED = {
  persona: ['admin', 'operator', 'auditor', 'developer'],
  theme: ['light', 'dark'],
  density: ['roomy', 'dense'],
};

function safeStorage(getter) {
  try {
    return getter();
  } catch {
    return null;
  }
}

const local = () => safeStorage(() => globalThis.localStorage);
const session = () => safeStorage(() => globalThis.sessionStorage);

export function hasEnteredDemo() {
  return session()?.getItem(STORAGE_KEYS.entered) === 'true';
}

export function launchDemo() {
  session()?.setItem(STORAGE_KEYS.entered, 'true');
}

export function hasFinishedOnboarding() {
  return local()?.getItem(STORAGE_KEYS.onboarding) === 'true';
}

export function completeOnboarding() {
  local()?.setItem(STORAGE_KEYS.onboarding, 'true');
}

export function replayOnboarding() {
  local()?.removeItem(STORAGE_KEYS.onboarding);
}

export function savePreference(name, value) {
  if (!ALLOWED[name]?.includes(value)) return;
  local()?.setItem(STORAGE_KEYS[name], value);
}

export function loadPreferences() {
  const storage = local();
  const read = (name, fallback) => {
    const value = storage?.getItem(STORAGE_KEYS[name]);
    return ALLOWED[name].includes(value) ? value : fallback;
  };
  return {
    persona: read('persona', 'admin'),
    theme: read('theme', 'light'),
    density: read('density', 'roomy'),
  };
}

/* Workflow state survives a refresh so a rehearsal never loses its run. On
   load every timestamp is shifted forward by the time the tab was away, so
   "18m ago" is still "18m ago" instead of quietly ageing. */
export function saveWorkflowState(state) {
  const storage = local();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.workflow, JSON.stringify({ version: SEED_VERSION, savedAt: new Date().toISOString(), state }));
  } catch {
    /* quota or private mode: the demo simply reseeds on the next load */
  }
}

export function loadWorkflowState(now = Date.now()) {
  const storage = local();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEYS.workflow);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== SEED_VERSION || !parsed.state?.anchorTime) return null;
    const delta = now - Date.parse(parsed.savedAt ?? parsed.state.anchorTime);
    if (!Number.isFinite(delta) || delta < 0) return parsed.state;
    return shiftTimestamps(parsed.state, delta);
  } catch {
    return null;
  }
}

export function clearWorkflowState() {
  local()?.removeItem(STORAGE_KEYS.workflow);
}

export function resetDemoPersistence() {
  session()?.removeItem(STORAGE_KEYS.entered);
  session()?.removeItem(STORAGE_KEYS.desktopView);
  const storage = local();
  Object.values(STORAGE_KEYS).filter((key) => key !== STORAGE_KEYS.entered && key !== STORAGE_KEYS.desktopView).forEach((key) => storage?.removeItem(key));
}
