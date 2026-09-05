import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/* Every test starts from empty browser storage and a real clock. A test that
   installs fake timers should restore them itself; this guard keeps one leak
   from poisoning the next file. */
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
