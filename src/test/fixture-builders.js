/* Shared fixture builders for every colocated test. Each one starts from the
   real seed so assertions run against the same graph the cockpit renders.
   The anchor defaults to a few seconds in the past so wall-clock-stamped
   actions land after the seeded history and inside the metering window. */
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { runToQuiescence } from '../demo/autopilot';
import { DemoProvider } from '../demo/DemoProvider';
import { ACTIONS, showcaseReducer } from '../demo/reducer';
import { createSeedState } from '../demo/seed';

const ANCHOR_LAG_MS = 5_000;

export function defaultNow() {
  return Date.now() - ANCHOR_LAG_MS;
}

export function buildState(mutator, { now = defaultNow() } = {}) {
  const state = createSeedState({ now });
  return mutator?.(state) ?? state;
}

/* The live people-out run started and driven by the engine until Axonify
   fails at provider write. The run waits for a human at this point. */
export function buildFaultedLiveState(options) {
  const seed = buildState(undefined, options);
  const ids = seed.liveIds;
  const started = showcaseReducer(seed, { type: ACTIONS.START_SYNC, sourceConnectorId: ids.sourceConnectorId, targetConnectorIds: ids.targetConnectorIds });
  return runToQuiescence(showcaseReducer, started);
}

/* The faulted run retried by an operator, finished by the engine (audit,
   deliveries, the live delivery exhausted into the dead-letter queue), then
   the dead letter replayed by an operator. */
export function buildRecoveredLiveState(options) {
  const faulted = buildFaultedLiveState(options);
  const ids = faulted.liveIds;
  const retried = showcaseReducer(faulted, { type: ACTIONS.RETRY_FAILED_TARGET, runId: ids.runId, personaId: 'operator' });
  const exhausted = runToQuiescence(showcaseReducer, retried);
  return showcaseReducer(exhausted, { type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId: ids.deadLetterId, personaId: 'operator' });
}

/* Render inside the real provider (engine off so assertions are stable) and
   a memory router positioned at `route`. */
export function renderWithProviders(ui, { state = buildState(), route = '/app/overview', autopilotEnabled = false } = {}) {
  const tree = createElement(
    DemoProvider,
    { initialState: state, autopilotEnabled },
    createElement(MemoryRouter, { initialEntries: [route] }, ui),
  );
  return { ...render(tree), state };
}
