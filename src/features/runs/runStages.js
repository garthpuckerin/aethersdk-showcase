/* Stage vocabulary is owned by the reducer; this module only adds the labels
   the rail renders. The autopilot advances stages — the UI never does. */
export { RUN_STAGES, nextStage } from '../../demo/reducer';

const STAGE_LABELS = {
  queued: 'Queued',
  authorization: 'Authorization',
  fetch: 'Fetch',
  normalization: 'Normalization',
  match: 'Match',
  provider_write: 'Provider write',
  identity_link: 'Identity link',
  audit: 'Audit',
  webhook: 'Webhook',
  metering: 'Metering',
  complete: 'Complete',
};

export function stageLabel(stage) {
  return STAGE_LABELS[stage] ?? String(stage).replaceAll('_', ' ');
}

/* `complete` is a terminal marker the engine sets, not a step a human watches. */
export function visibleStages(stages) {
  return stages.filter((stage) => stage !== 'complete');
}
