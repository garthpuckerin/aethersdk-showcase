import { Link } from 'react-router-dom';
import DataState from '../../components/DataState';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { RANGES } from '../../demo/selectors';
import { plural, providerMark, recordsLink } from './format';

const UNIT_LABEL = { '24h': 'Hour window', '7d': 'Day window', '30d': 'Day window' };

function formatLatency(p95) {
  return p95 == null ? '—' : `${p95.toLocaleString()} ms`;
}

function formatRate(rate) {
  return rate == null ? '—' : `${rate}%`;
}

/* Drill-down for one chart bucket: what ran in that window and how it went. */
export default function BucketDrawer({ bucket, range, onClose }) {
  const { state } = useDemo();
  if (!bucket) return null;

  const runs = bucket.recordIds.map((id) => state.runs[id]).filter(Boolean);
  const systemFor = (run) => state.providerDefinitions[state.connectors[run.connectorId]?.providerDefinitionId]?.name ?? run.connectorId;

  return (
    <Drawer open onClose={onClose} title={`${bucket.label} window`}>
      <div className="drawer-stack bucket-drawer">
        <p className="eyebrow">{UNIT_LABEL[range] ?? 'Window'} · {RANGES[range].label}</p>
        <dl className="detail-grid">
          <div><dt>Entities synced</dt><dd className="num">{bucket.value.toLocaleString()}</dd></div>
          <div><dt>Runs</dt><dd className="num">{bucket.runs.toLocaleString()}</dd></div>
          <div><dt>Failed</dt><dd className={`num ${bucket.failed ? 'bucket-drawer__danger' : ''}`.trim()}>{bucket.failed.toLocaleString()}</dd></div>
          <div><dt>p95 latency</dt><dd className="num">{formatLatency(bucket.p95)}</dd></div>
          <div><dt>Success rate</dt><dd className="num">{formatRate(bucket.successRate)}</dd></div>
        </dl>
        <section>
          <h3>Runs in this window</h3>
          {runs.length ? (
            <ul className="record-list">
              {runs.map((run) => (
                <li key={run.id}>
                  <div>
                    <span className="provider-mark">{providerMark(systemFor(run))}</span>
                    <div>
                      <Link to={`/app/runs/${run.id}`}><strong>{systemFor(run)}</strong></Link>
                      <small>{plural(run.entitiesProcessed, 'entity', 'entities')} · {run.operation}</small>
                    </div>
                  </div>
                  <StatusBadge status={run.status} />
                </li>
              ))}
            </ul>
          ) : (
            <DataState state="empty" title="No runs in this window" detail="Nothing started during this bucket for the active persona's connectors." />
          )}
        </section>
        {runs.length > 0 && (
          <footer className="form-actions">
            <Link className="button button--ghost button-link" to={recordsLink('/app/runs', runs.map(({ id }) => id))}>Open in Sync runs</Link>
          </footer>
        )}
      </div>
    </Drawer>
  );
}
