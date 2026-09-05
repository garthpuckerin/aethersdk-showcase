import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { nextAutopilotAction } from './autopilot';
import { nowIso } from './clock';
import { DemoContext } from './context';
import { saveWorkflowState } from './persistence';
import { showcaseReducer } from './reducer';
import { createSeedState } from './seed';

/* Hosts the reducer, the autopilot engine, a ticking clock for relative
   labels, and persistence of the workflow state. */
export function DemoProvider({ children, initialState, autopilotEnabled = true }) {
  const [state, dispatch] = useReducer(showcaseReducer, initialState, (value) => value ?? createSeedState());
  const [now, setNow] = useState(() => nowIso());
  const timer = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(nowIso()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!autopilotEnabled || !state.autopilot) return undefined;
    const step = nextAutopilotAction(state);
    if (!step) return undefined;
    timer.current = setTimeout(() => dispatch(step.action), step.delayMs);
    return () => clearTimeout(timer.current);
  }, [autopilotEnabled, state]);

  useEffect(() => {
    saveWorkflowState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, now }), [now, state]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
