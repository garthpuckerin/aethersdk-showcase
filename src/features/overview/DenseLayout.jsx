import { Link } from 'react-router-dom';
import { Sparkline } from '../../components/charts';
import { RANGES } from '../../demo/selectors';
import { IntegrationMatrix, RunsTable } from './panels';

const POWER_TABLE_ROWS = 12;
const KPI_COLUMNS = 6;

function KpiBar({ metrics, series, range }) {
  const rangeKey = range.toUpperCase();
  return (
    <section className="kpi-strip kpi-strip--bar" aria-label="Operational metrics" style={{ '--kpi-columns': KPI_COLUMNS }}>
      <Link className="kpi kpi--link" to="/app/integrations">
        <span>Integrations</span>
        <strong data-testid="active-integrations-value">{metrics.integrations.value.toLocaleString()}</strong>
      </Link>
      <Link className="kpi kpi--link" to="/app/runs">
        <span>Runs · {rangeKey}</span>
        <strong>{metrics.runs.value.toLocaleString()}</strong>
      </Link>
      <Link className="kpi kpi--link kpi--positive" to="/app/runs?status=success">
        <span>Success</span>
        <strong data-testid="success-rate-value">{metrics.successRate}%</strong>
      </Link>
      <Link className="kpi kpi--link" to="/app/runs">
        <span>Entities</span>
        <strong data-testid="entities-synced-value">{metrics.entities.value.toLocaleString()}</strong>
      </Link>
      <Link className={`kpi kpi--link ${metrics.failed.value > 0 ? 'kpi--danger' : ''}`.trim()} to="/app/runs?status=failed">
        <span>Failed</span>
        <strong data-testid="needs-attention-value">{metrics.failed.value.toLocaleString()}</strong>
      </Link>
      <div className="kpi kpi--sparkline">
        <span>Volume · {rangeKey}</span>
        <Sparkline series={series} label={`Volume, ${metrics.entities.value.toLocaleString()} entities ${RANGES[range].label.toLowerCase()}`} />
      </div>
    </section>
  );
}

export default function DenseLayout({ data, range }) {
  const { metrics, series, runs, connectors } = data;
  return (
    <>
      <KpiBar metrics={metrics} series={series} range={range} />
      <article className="panel">
        <header className="panel__header"><h2>Integrations</h2><Link className="panel__link" to="/app/integrations">Catalog →</Link></header>
        <IntegrationMatrix connectors={connectors} />
      </article>
      <article className="panel panel--flush">
        <header className="panel__header overview-panel-head"><h2>Sync runs</h2><Link className="panel__link" to="/app/runs">View all →</Link></header>
        <RunsTable runs={runs.slice(0, POWER_TABLE_ROWS)} variant="power" ariaLabel="Sync runs" />
      </article>
    </>
  );
}
