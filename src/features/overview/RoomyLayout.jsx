import { Link } from 'react-router-dom';
import DataState from '../../components/DataState';
import { ThroughputChart } from '../../components/charts';
import { RANGES } from '../../demo/selectors';
import { plural } from './format';
import { ActivityList, HealthList, RunsTable } from './panels';

const PEAK_UNIT = { '24h': 'hour', '7d': 'day', '30d': 'day' };
const RECENT_RUNS = 6;
const RECENT_EVENTS = 6;

function KpiStrip({ metrics, connectors }) {
  return (
    <section className="kpi-strip" aria-label="Operational metrics">
      <Link className="kpi kpi--link" to="/app/integrations">
        <span>Active integrations</span>
        <strong data-testid="active-integrations-value">{metrics.integrations.value.toLocaleString()}</strong>
        <small>{metrics.integrations.value.toLocaleString()} of {plural(connectors.length, 'connector')} active</small>
      </Link>
      <Link className="kpi kpi--link" to="/app/runs?status=success">
        <span>Run success</span>
        <strong data-testid="success-rate-value">{metrics.successRate}%</strong>
        <small>{metrics.success.value.toLocaleString()} of {plural(metrics.runs.value, 'run')}</small>
      </Link>
      <Link className="kpi kpi--link" to="/app/runs">
        <span>Entities processed</span>
        <strong data-testid="entities-processed-value">{metrics.entities.value.toLocaleString()}</strong>
        <small>{plural(metrics.entities.recordIds.length, 'successful run')}</small>
      </Link>
      <Link className={`kpi kpi--link ${metrics.failed.value > 0 ? 'kpi--danger' : ''}`.trim()} to="/app/runs?status=failed">
        <span>Needs attention</span>
        <strong data-testid="needs-attention-value">{metrics.failed.value.toLocaleString()}</strong>
        <small>{plural(metrics.failed.value, 'failed run')} · {RANGES[metrics.range].label.toLowerCase()}</small>
      </Link>
    </section>
  );
}

function Delta({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return <p className={`delta ${up ? 'delta--up' : 'delta--down'}`}>{up ? '▲' : '▼'} {Math.abs(value)}% vs previous period</p>;
}

function Hero({ metrics, series, range, onSelectBucket }) {
  const peak = Math.max(0, ...series.map(({ value }) => value));
  const rangeLabel = RANGES[range].label;
  return (
    <article className="panel panel--dark overview-hero">
      <header className="overview-hero__head">
        <div>
          <p className="overview-hero__label">Entities synced · {rangeLabel}</p>
          <p className="overview-hero__value num" data-testid="entities-synced-value">{metrics.entities.value.toLocaleString()}</p>
          <Delta value={metrics.entitiesDelta} />
        </div>
      </header>
      {metrics.runs.value ? (
        <ThroughputChart series={series} range={range} onSelect={onSelectBucket} ariaLabel={`Entities synced per ${PEAK_UNIT[range]}, ${rangeLabel.toLowerCase()}`} />
      ) : (
        <DataState state="empty" title="No runs in this window" detail={`Nothing started in the ${rangeLabel.toLowerCase()} for this persona's connectors. Widen the range or start a governed sync.`} />
      )}
      <dl className="overview-hero__foot">
        <div><dt>Peak / {PEAK_UNIT[range]}</dt><dd className="num">{peak.toLocaleString()}</dd></div>
        <div><dt>p95 latency</dt><dd className="num">{metrics.latency.p95.toLocaleString()}<small>ms</small></dd></div>
        <div><dt>Success rate</dt><dd className="num overview-hero__accent">{metrics.successRate}%</dd></div>
        <div><dt>Failed runs</dt><dd className="num">{metrics.failed.value.toLocaleString()}</dd></div>
      </dl>
    </article>
  );
}

export default function RoomyLayout({ data, range, onSelectBucket }) {
  const { metrics, series, runs, connectors, audits } = data;
  return (
    <>
      <KpiStrip metrics={metrics} connectors={connectors} />
      <div className="grid-main-rail">
        <div className="page-stack">
          <Hero metrics={metrics} series={series} range={range} onSelectBucket={onSelectBucket} />
          <article className="panel panel--flush">
            <header className="panel__header overview-panel-head"><h2>Recent sync runs</h2><Link className="panel__link" to="/app/runs">View all →</Link></header>
            <RunsTable runs={runs.slice(0, RECENT_RUNS)} variant="recent" ariaLabel="Recent sync runs" />
          </article>
        </div>
        <div className="page-stack">
          <article className="panel">
            <header className="panel__header"><h2>Integration health</h2><Link className="panel__link" to="/app/integrations">All →</Link></header>
            <HealthList connectors={connectors} />
          </article>
          <article className="panel">
            <header className="panel__header"><h2>Activity</h2><Link className="panel__link" to="/app/audit">Audit log →</Link></header>
            <ActivityList events={audits.slice(0, RECENT_EVENTS)} />
          </article>
        </div>
      </div>
    </>
  );
}
