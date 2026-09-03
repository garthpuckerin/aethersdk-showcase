import { createSeedState } from '../demo/seed';

export function buildState(mutator) {
  const state = createSeedState();
  mutator?.(state);
  return state;
}
