import { createContext, useContext } from 'react';
import { formatRelativeTime } from './clock.js';

export const DemoContext = createContext(null);

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used inside DemoProvider');
  return context;
}

export function useDemoSelector(selector) {
  const { state } = useDemo();
  return selector(state);
}

/* Relative-time formatter bound to the provider's ticking clock. */
export function useRelativeTime() {
  const { now } = useDemo();
  return (iso) => formatRelativeTime(iso, now);
}
