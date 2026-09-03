import { Link, useParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';

export default function MobileRunPage() {
  const { runId } = useParams();
  const { state, dispatch } = useDemo();
  const run = state.runs[runId];
  if (!run) return <DataState state="empty" title="Run not found" detail={runId} />;
  const outcomes = run.targetOutcomeIds.map((id) => state.targetOutcomes[id]);
  const failed = outcomes.some(({ status }) => status === 'failed');
  const mayRetry = can(state.activePersonaId, 'sync:retry');
  return (
    <div className="mobile-stack">
      <section className="mobile-title"><Link to="/mobile/home">← Operations pulse</Link><p className="eyebrow">Run detail</p><h1>{run.id}</h1><StatusBadge status={run.status} /></section>
      <section className="mobile-identity"><span>Request</span><code>{run.requestId}</code><span>Idempotency</span><code>{run.idempotencyKey}</code><span>Stage</span><strong>{run.stage.replaceAll('_', ' ')}</strong></section>
      <section><div className="mobile-section-head"><h2>Target outcomes</h2></div><div className="mobile-card-list">{outcomes.map((outcome) => <article className="mobile-record" key={outcome.id}><div><strong>{state.connectors[outcome.connectorId].name}</strong><small>{outcome.remoteId ?? (outcome.errorCode ? `${outcome.errorCode} · sanitized` : 'Pending')}</small></div><StatusBadge status={outcome.status} /></article>)}</div></section>
      {failed && mayRetry && <button className="button button--primary mobile-action" type="button" onClick={() => dispatch({ type: ACTIONS.RETRY_FAILED_TARGET, runId: run.id })}>Retry failed target only</button>}
      {failed && !mayRetry && <p className="permission-note">Requires sync:retry permission.</p>}
    </div>
  );
}
