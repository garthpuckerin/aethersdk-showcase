import { RUN_STAGES, stageLabel } from './runStages';

export default function RunTimeline({ currentStage }) {
  const activeIndex = RUN_STAGES.indexOf(currentStage);
  return (
    <ol className="run-timeline" aria-label="Governed sync stages">
      {RUN_STAGES.map((stage, index) => {
        const state = index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'pending';
        return <li key={stage} data-stage-state={state}><span>{String(index + 1).padStart(2, '0')}</span><strong>{stageLabel(stage)}</strong><small>{state}</small></li>;
      })}
    </ol>
  );
}
