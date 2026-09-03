import { useMemo, useReducer } from 'react';
import { DemoContext } from './context';
import { showcaseReducer } from './reducer';
import { createSeedState } from './seed';

export function DemoProvider({ children, initialState }) {
  const [state, dispatch] = useReducer(showcaseReducer, initialState, (value) => value ?? createSeedState());
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
