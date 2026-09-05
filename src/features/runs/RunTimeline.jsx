import { useRelativeTime } from '../../demo/context';
import { RUN_STAGES, stageLabel, visibleStages } from './runStages';

/* The stage rail. The engine moves the marker; the rail only reports where it
   is, when it got there, and — at provider write — why it stopped. */
export default function RunTimeline({ run, errorCode = null }) {
  const rel = useRelativeTime();
  const stages = visibleStages(RUN_STAGES);
  const complete = run.stage === 'complete';
  const activeIndex = complete ? stages.length : stages.indexOf(run.stage);
  const failed = run.status === 'failed';
  const last = stages.length - 1;

  function detailFor(status, index) {
    if (status === 'danger') return errorCode ?? 'failed';
    if (status === 'current') return run.stageAt ? rel(run.stageAt) : 'in flight';
    if (status === 'complete') return complete && index === last ? rel(run.completedAt) : 'done';
    return 'pending';
  }

  return (
    <ol className="run-rail" aria-label="Sync stages">
      {stages.map((stage, index) => {
        const status = index < activeIndex ? 'complete' : index === activeIndex ? (failed ? 'danger' : 'current') : 'pending';
        return (
          <li key={stage} className={`run-stage run-stage--${status}`} data-stage-state={status} aria-current={status === 'current' ? 'step' : undefined}>
            <span className="run-stage__index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{stageLabel(stage)}</strong>
            <small>{detailFor(status, index)}</small>
          </li>
        );
      })}
    </ol>
  );
}
