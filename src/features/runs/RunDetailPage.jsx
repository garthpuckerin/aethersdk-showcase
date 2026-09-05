import { Link, useParams } from 'react-router-dom';
import { can } from '../../access/policy';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { formatDuration } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectTenant } from '../../demo/selectors';
import ProviderMark from './ProviderMark';
import RunTimeline from './RunTimeline';
import { describeRun, samplePayload } from './runDetail';
import { actorLabel, errorCopy, latencyLabel, operationLabel, plural, providerFor } from './runFormat';
import '../../styles/features/runs.css';

function ChainNode({ label, value, placeholder = 'Pending' }) {
  return <div data-pending={value ? undefined : 'true'}><span>{label}</span><code>{value ?? placeholder}</code></div>;
}

function OutcomeRow({ state, outcome, linked }) {
  const connector = state.connectors[outcome.connectorId];
  const provider = providerFor(state, outcome.connectorId);
  return (
    <tr>
      <th scope="row"><span className="table-cell-with-mark"><ProviderMark name={provider?.name ?? connector?.name} /><span>{connector?.name ?? outcome.connectorId}</span></span></th>
      <td><StatusBadge status={outcome.status} /></td>
      <td className="run-outcomes__result">
        {outcome.remoteId && <code>{outcome.remoteId}</code>}
        {!outcome.remoteId && outcome.errorCode && <div className="callout callout--danger run-error"><strong>{outcome.errorCode} · sanitized</strong><p>{errorCopy(outcome.errorCode)}</p></div>}
        {!outcome.remoteId && !outcome.errorCode && <span className="muted">Pending</span>}
      </td>
      <td className="num">{outcome.retryCount ?? 0}</td>
      <td>{linked ? <span className="run-linked">✓ linked</span> : <span className="muted">—</span>}</td>
    </tr>
  );
}

export default function RunDetailPage() {
  const { runId } = useParams();
  const { state, dispatch, now } = useDemo();
  const rel = useRelativeTime();
  const run = state.runs[runId];
  if (!run) return <DataState state="empty" title="Run not found" detail={`No tenant-scoped run matches ${runId}.`} />;

  const { source, targets, entity, outcomes, failed, errorCode, event, delivery, deadLetter, linkedConnectorIds, linkCount } = describeRun(state, run);
  const complete = run.stage === 'complete';
  const mayRetry = can(state.activePersonaId, 'sync:retry');
  const tenant = selectTenant(state);

  return (
    <div className="page-stack run-detail">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{operationLabel(run.operation)} · {run.entityType}</p>
          <h1 className="mono">{run.id}</h1>
          <p>{source?.name ?? run.connectorId} → {targets.map(({ name }) => name).join(', ')}{entity && <> · {entity.displayName} — {entity.subtitle}</>}</p>
        </div>
        <div className="page-heading__actions">
          <StatusBadge status={run.status} />
          {failed && mayRetry && <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.RETRY_FAILED_TARGET, runId: run.id })}>Retry failed target only</button>}
          {failed && !mayRetry && <p className="permission-note">Requires sync:retry permission.</p>}
        </div>
      </section>

      <section className="identity-chain" data-testid="identity-chain" aria-label="Execution identity chain">
        <ChainNode label="Request" value={run.requestId} /><i aria-hidden="true">→</i>
        <ChainNode label="Run" value={run.id} /><i aria-hidden="true">→</i>
        <ChainNode label="Audit event" value={event?.id} /><i aria-hidden="true">→</i>
        <ChainNode label="Delivery" value={delivery?.id} /><i aria-hidden="true">→</i>
        <ChainNode label="Dead letter" value={deadLetter?.id} placeholder="—" />
      </section>

      <section className="panel">
        <header><div><p className="eyebrow">Engine progress</p><h2>Stages</h2></div><span className="muted">{complete ? `Completed ${rel(run.completedAt)}` : failed ? 'Waiting for a human' : 'Advancing on its own'}</span></header>
        <RunTimeline run={run} errorCode={errorCode} />
      </section>

      <section className="grid-main-rail">
        <article className="panel panel--flush run-outcomes">
          <header className="panel__header run-outcomes__header"><div><p className="eyebrow">Provider fan-out</p><h2>Target outcomes</h2></div><span className="muted">{plural(linkCount, 'identity link')}</span></header>
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Target outcomes">
              <thead><tr><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Remote identity / error</th><th scope="col" className="num">Retries</th><th scope="col">Identity link</th></tr></thead>
              <tbody>{outcomes.map((outcome) => <OutcomeRow key={outcome.id} state={state} outcome={outcome} linked={linkedConnectorIds.has(outcome.connectorId)} />)}</tbody>
            </table>
          </div>
          <div className="run-outcomes__foot">
            {failed && <div className="callout callout--warning"><strong>The engine paused at provider write.</strong><p>Retry re-uses idempotency key <code>{run.idempotencyKey}</code>; targets already written are not written twice.</p></div>}
            {complete && <div className="callout callout--positive"><strong>Governed sync complete — {plural(targets.length, 'target')}, {plural(linkCount, 'identity link')}</strong><p>Audit, delivery, and metering were written by the engine under the same request id.</p></div>}
            {complete && <Link className="button button--ghost button-link run-outcomes__cta" to="/app/overview">Review updated overview</Link>}
            {!failed && !complete && <p className="muted">Outcomes fill in as provider writes land; the engine advances this run on its own.</p>}
          </div>
        </article>

        <aside className="panel run-context">
          <header><div><p className="eyebrow">Execution context</p><h2>Traceable by construction</h2></div></header>
          <dl className="detail-grid detail-grid--single">
            <div><dt>Tenant</dt><dd>{tenant?.name ?? run.tenantId}</dd></div>
            <div><dt>Actor</dt><dd>{actorLabel(state, run)}</dd></div>
            {run.agentRunId && <div><dt>Agent run</dt><dd><code>{run.agentRunId}</code><small className="muted"> · previewed before commit</small></dd></div>}
            <div><dt>Canonical entity</dt><dd>{entity?.displayName ?? '—'}<code className="run-context__id">{run.canonicalEntityId}</code></dd></div>
            <div><dt>Entity type</dt><dd><code>{run.entityType}</code></dd></div>
            <div><dt>Entities in batch</dt><dd>{run.entitiesProcessed}</dd></div>
            <div><dt>Idempotency key</dt><dd><code>{run.idempotencyKey}</code></dd></div>
            <div><dt>Started</dt><dd>{rel(run.startedAt)}</dd></div>
            <div><dt>Duration</dt><dd>{formatDuration(run.durationMs)}</dd></div>
            <div><dt>p95</dt><dd>{latencyLabel(run.p95Ms)}</dd></div>
          </dl>
          <details className="run-payload"><summary>Sample payload (fictional)</summary><pre>{JSON.stringify(samplePayload(entity, now), null, 2)}</pre></details>
          <nav className="run-context__links" aria-label="Related records">
            {event && <Link to={`/app/audit?records=${event.id}`}>Open related audit event →</Link>}
            {delivery && <Link to={`/app/webhooks?records=${delivery.id}`}>Open related delivery →</Link>}
            {!event && !delivery && <span className="muted">Audit and delivery records appear once the engine reaches those stages.</span>}
          </nav>
        </aside>
      </section>
    </div>
  );
}
