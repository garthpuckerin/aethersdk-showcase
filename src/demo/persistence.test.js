import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildState } from '../test/fixture-builders';
import {
  STORAGE_KEYS,
  clearWorkflowState,
  completeOnboarding,
  hasEnteredDemo,
  hasFinishedOnboarding,
  launchDemo,
  loadPreferences,
  loadWorkflowState,
  replayOnboarding,
  resetDemoPersistence,
  savePreference,
  saveWorkflowState,
} from './persistence';
import { SEED_VERSION } from './seed';

const MINUTE = 60_000;

describe('demo persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the landing gate session-scoped', () => {
    expect(hasEnteredDemo()).toBe(false);
    launchDemo();
    expect(hasEnteredDemo()).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEYS.entered)).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.entered)).toBeNull();
  });

  it('keeps onboarding once-per-browser and replayable', () => {
    completeOnboarding();
    expect(hasFinishedOnboarding()).toBe(true);
    launchDemo();
    replayOnboarding();
    expect(hasFinishedOnboarding()).toBe(false);
    expect(hasEnteredDemo()).toBe(true);
  });

  it('round-trips preferences and rejects values outside the allowed sets', () => {
    savePreference('persona', 'operator');
    savePreference('theme', 'dark');
    savePreference('density', 'dense');
    expect(loadPreferences()).toEqual({ persona: 'operator', theme: 'dark', density: 'dense' });

    savePreference('persona', 'superuser');
    savePreference('theme', 'sepia');
    savePreference('density', 'compact');
    savePreference('workflow', 'anything');
    expect(loadPreferences()).toEqual({ persona: 'operator', theme: 'dark', density: 'dense' });
    expect(localStorage.getItem(STORAGE_KEYS.workflow)).toBeNull();

    localStorage.setItem(STORAGE_KEYS.density, '{broken');
    localStorage.setItem(STORAGE_KEYS.persona, 'developer');
    expect(loadPreferences()).toEqual({ persona: 'developer', theme: 'dark', density: 'roomy' });
  });

  it('falls back to defaults when nothing is stored', () => {
    expect(loadPreferences()).toEqual({ persona: 'admin', theme: 'light', density: 'roomy' });
  });

  it('round-trips the workflow state and shifts every timestamp by the time away', () => {
    const savedAt = Date.parse('2030-01-15T12:00:00.000Z');
    vi.useFakeTimers({ now: savedAt });
    const state = buildState(undefined, { now: savedAt - 5_000 });
    saveWorkflowState(state);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.workflow));
    expect(stored).toEqual(expect.objectContaining({ version: SEED_VERSION, savedAt: new Date(savedAt).toISOString() }));

    expect(loadWorkflowState(savedAt)).toEqual(state);

    const later = loadWorkflowState(savedAt + 10 * MINUTE);
    expect(later.anchorTime).toBe(new Date(Date.parse(state.anchorTime) + 10 * MINUTE).toISOString());
    const runId = state.runOrder[0];
    expect(later.runs[runId].startedAt).toBe(new Date(Date.parse(state.runs[runId].startedAt) + 10 * MINUTE).toISOString());
    expect(later.connectors.con_ukg.validatedAt).toBe(new Date(Date.parse(state.connectors.con_ukg.validatedAt) + 10 * MINUTE).toISOString());
    expect(later.runOrder).toEqual(state.runOrder);
    expect(later.liveIds).toEqual(state.liveIds);
    expect(later.connectors.con_ukg.name).toBe(state.connectors.con_ukg.name);
    // A clock that went backwards is not trusted: the state comes back unshifted.
    expect(loadWorkflowState(savedAt - MINUTE)).toEqual(state);
  });

  it('returns null for a missing, malformed, or version-mismatched workflow', () => {
    expect(loadWorkflowState()).toBeNull();
    localStorage.setItem(STORAGE_KEYS.workflow, '{not json');
    expect(loadWorkflowState()).toBeNull();
    localStorage.setItem(STORAGE_KEYS.workflow, JSON.stringify({ version: SEED_VERSION - 1, savedAt: new Date().toISOString(), state: buildState() }));
    expect(loadWorkflowState()).toBeNull();
    localStorage.setItem(STORAGE_KEYS.workflow, JSON.stringify({ version: SEED_VERSION, savedAt: new Date().toISOString(), state: { runs: {} } }));
    expect(loadWorkflowState()).toBeNull();
    clearWorkflowState();
    expect(localStorage.getItem(STORAGE_KEYS.workflow)).toBeNull();
  });

  it('clears entry, desktop-view flag, onboarding, preferences, and the workflow on reset', () => {
    launchDemo();
    sessionStorage.setItem(STORAGE_KEYS.desktopView, 'true');
    completeOnboarding();
    savePreference('persona', 'developer');
    savePreference('theme', 'dark');
    savePreference('density', 'dense');
    saveWorkflowState(buildState());
    expect(localStorage.getItem(STORAGE_KEYS.workflow)).not.toBeNull();

    resetDemoPersistence();
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(localStorage.getItem(key), key).toBeNull();
      expect(sessionStorage.getItem(key), key).toBeNull();
    }
  });
});
