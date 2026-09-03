export const RUN_STAGES = ['queued', 'authorization', 'fetch', 'normalization', 'match', 'provider_write', 'identity_link', 'audit', 'webhook', 'metering'];

export function stageLabel(stage) {
  return stage.replaceAll('_', ' ');
}

export function nextStage(stage) {
  const index = RUN_STAGES.indexOf(stage);
  return index >= 0 && index < RUN_STAGES.length - 1 ? RUN_STAGES[index + 1] : null;
}
