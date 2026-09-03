import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  completeOnboarding,
  hasEnteredDemo,
  hasFinishedOnboarding,
  launchDemo,
  loadPreferences,
  replayOnboarding,
  resetDemoPersistence,
  savePreference,
} from './persistence';

describe('demo persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps the landing gate session-scoped', () => {
    expect(hasEnteredDemo()).toBe(false);
    launchDemo();
    expect(hasEnteredDemo()).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEYS.entered)).toBe('true');
  });

  it('keeps onboarding once-per-browser and replayable', () => {
    completeOnboarding();
    expect(hasFinishedOnboarding()).toBe(true);
    launchDemo();
    replayOnboarding();
    expect(hasFinishedOnboarding()).toBe(false);
    expect(hasEnteredDemo()).toBe(true);
  });

  it('loads only allowed preferences and ignores malformed values', () => {
    savePreference('persona', 'operator');
    savePreference('theme', 'dark');
    localStorage.setItem(STORAGE_KEYS.density, '{broken');
    expect(loadPreferences()).toEqual({ persona: 'operator', theme: 'dark', density: 'roomy' });
  });

  it('clears entry, onboarding, persona, theme, density, and mutations on reset', () => {
    launchDemo();
    completeOnboarding();
    savePreference('persona', 'developer');
    savePreference('theme', 'dark');
    savePreference('density', 'dense');
    resetDemoPersistence();
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });
});
