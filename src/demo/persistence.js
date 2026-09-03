export const STORAGE_KEYS = {
  entered: 'aether-demo-entered',
  onboarding: 'aether-onboarding-complete',
  persona: 'aether-persona',
  theme: 'aether-theme',
  density: 'aether-density',
};

const ALLOWED = {
  persona: ['admin', 'operator', 'auditor', 'developer'],
  theme: ['light', 'dark'],
  density: ['roomy', 'dense'],
};

function safeStorage(storage) {
  try {
    return storage;
  } catch {
    return null;
  }
}

export function hasEnteredDemo() {
  return safeStorage(globalThis.sessionStorage)?.getItem(STORAGE_KEYS.entered) === 'true';
}

export function launchDemo() {
  safeStorage(globalThis.sessionStorage)?.setItem(STORAGE_KEYS.entered, 'true');
}

export function hasFinishedOnboarding() {
  return safeStorage(globalThis.localStorage)?.getItem(STORAGE_KEYS.onboarding) === 'true';
}

export function completeOnboarding() {
  safeStorage(globalThis.localStorage)?.setItem(STORAGE_KEYS.onboarding, 'true');
}

export function replayOnboarding() {
  safeStorage(globalThis.localStorage)?.removeItem(STORAGE_KEYS.onboarding);
}

export function savePreference(name, value) {
  if (!ALLOWED[name]?.includes(value)) return;
  safeStorage(globalThis.localStorage)?.setItem(STORAGE_KEYS[name], value);
}

export function loadPreferences() {
  const storage = safeStorage(globalThis.localStorage);
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

export function resetDemoPersistence() {
  const session = safeStorage(globalThis.sessionStorage);
  const local = safeStorage(globalThis.localStorage);
  session?.removeItem(STORAGE_KEYS.entered);
  Object.values(STORAGE_KEYS).filter((key) => key !== STORAGE_KEYS.entered).forEach((key) => local?.removeItem(key));
}
