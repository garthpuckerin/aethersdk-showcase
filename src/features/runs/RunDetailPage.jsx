import { Link, useParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import RunTimeline from './RunTimeline';
import { nextStage, stageLabel } from './runStages';

export default function RunDetailPage() {
  const { runId } = useParams();
  const { state, dispatch } = useDemo();
  const run = state.runs[runId];
  if (!run) return <DataState state="empty" title="Run not found" detail={`No tenant-scoped run matches ${runId}.`} />;
  const outcomes = run.targetOutcomeIds.map((id) => state.targetOutcomes[id]);
  const failed = outcomes.some(({ status }) => status === 'failed');
  const allQueued = outcomes.every(({ status }) => status === 'queued');
  const advance = nextStage(run.stage);
  const event = Object.values(state.auditEvents).find(({ runId: eventRunId }) => eventRunId === run.id && run.id === state.liveIds.runId);
  const delivery = Object.values(state.deliveries).find(({ runId: deliveryRunId }) => deliveryRunId === run.id);
  const targetIds = new Set(outcomes.map(({ connectorId }) => connectorId));
  const linkCount = Object.values(state.entityLinks).filter((link) => link.canonicalEntityId === run.canonicalEntityId && targetIds.has(link.connectorId)).length;
  const mayRetry = can(state.activePersonaId, 'sync:retry');

  function advanceRun() {
    dispatch({ type: ACTIONS.ADVANCE_RUN_STAGE, runId: run.id, stage: advance });
  }

  return (
    <div className="page-stack run-detail">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">Governed sync run</p><h1>{run.id}</h1><p>One canonical entity moving through authorization, normalization, provider writes, identity links, audit, delivery, and metering.</p></div><StatusBadge status={run.status} /></section>
      <section className="identity-chain" data-testid="identity-chain" aria-label="Execution identity chain">
        <div><span>Request</span><code>{run.requestId}</code></div><i>→</i>
        <div><span>Run</span><code>{run.id}</code></div><i>→</i>
        <div><span>Audit event</span><code>{event?.id ?? 'Pending'}</code></div><i>→</i>
        <div><span>Delivery</span><code>{delivery?.id ?? 'Pending'}</code></div>
      </section>
      <RunTimeline currentStage={run.stage} />
      <section className="run-grid">
        <article className="panel">
          <header><div><p className="eyebrow">Provider fan-out</p><h2>Target outcomes</h2></div><span>{linkCount} canonical identity {linkCount === 1 ? 'link' : 'links'}</span></header>
          <table className="outcome-table" aria-label="Target outcomes"><thead><tr><th>Target</th><th>Status</th><th>Remote identity / error</th></tr></thead><tbody>{outcomes.map((outcome) => { const connector = state.connectors[outcome.connectorId]; return <tr key={outcome.id}><th scope="row">{connector.name}</th><td><StatusBadge status={outcome.status} /></td><td><code>{outcome.remoteId ?? (outcome.errorCode ? `${outcome.errorCode} — sanitized` : 'Pending')}</code></td></tr>; })}</tbody></table>
          <div className="run-actions">
            {run.stage === 'provider_write' && allQueued && <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.FAIL_TARGET, runId: run.id, connectorId: 'con_pipedrive' })}>Simulate one target failure</button>}
            {failed && mayRetry && <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.RETRY_FAILED_TARGET, runId: run.id })}>Retry failed target only</button>}
            {advance && run.stage !== 'provider_write' && <button className="button button--primary" type="button" onClick={advanceRun}>Advance to {stageLabel(advance)}</button>}
            {run.stage === 'metering' && <><strong className="completion-note">Governed sync complete</strong><Link className="button button--ghost button-link" to="/app/overview">Review updated overview</Link></>}
          </div>
        </article>
        <aside className="panel run-context">
          <p className="eyebrow">Execution context</p><h2>Traceable by construction</h2>
          <dl className="detail-grid detail-grid--single"><div><dt>Canonical entity</dt><dd><code>{run.canonicalEntityId}</code></dd></div><div><dt>Entity type</dt><dd><code>{run.entityType}</code></dd></div><div><dt>Idempotency key</dt><dd><code>{run.idempotencyKey}</code></dd></div></dl>
          <details><summary>Sample fictional payload</summary><pre>{JSON.stringify({ id: run.canonicalEntityId, type: run.entityType, displayName: 'Ada Moreno', fictional: true }, null, 2)}</pre></details>
          {event && <Link to={`/app/audit?records=${event.id}`}>Open related audit event →</Link>}
          {delivery && <Link to={`/app/webhooks?records=${delivery.id}`}>Open related delivery →</Link>}
        </aside>
      </section>
    </div>
  );
}
