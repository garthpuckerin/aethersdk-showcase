/* Presentation-only constants for the landing page. These illustrate the
   signature run; they are not metrics and never appear inside the cockpit. */
export const LANDING_TRACE = {
  runId: 'run_live_harborline_001',
  durationMs: 1_842,
  caption: 'request → canonical employee → three learning-platform outcomes',
  bars: [28, 36, 31, 44, 52, 47, 61, 58, 66, 73, 69, 84],
};

export const LANDING_FLOW = [
  ['01', 'Resolve', 'A new hire lands in UKG. The tenant-owned connector turns it into one canonical employee record with a verified execution context.'],
  ['02', 'Synchronize', 'Docebo, LinkedIn Learning, and Axonify each receive a governed write. One can fail without undoing the others; retry reuses the same idempotency key.'],
  ['03', 'Recover', 'The completion event fans out to HR and analytics subscribers. A dead letter is inspectable, replayable, and audited with the same identities.'],
];
