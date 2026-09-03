import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { ThroughputChart } from '../../components/charts';
import { useDemo } from '../../demo/context';
import { selectAuditEvents, selectOverviewMetrics, selectVisibleConnectors, selectVisibleRuns } from '../../demo/selectors';

function metricLink(path, recordIds) {
  return `${path}?records=${encodeURIComponent(recordIds.join(','))}`;
}

function chartPoints(runs) {
  const recent = runs.slice(0, 12).reverse();
  return Array.from({ length: Math.ceil(recent.length / 2) }, (_, index) => {
    const records = recent.slice(index * 2, index * 2 + 2);
    return {
      label: `${String(8 + index).padStart(2, '0')}:00`,
      value: records.reduce((sum, run) => sum + run.entitiesProcessed, 0),
      recordIds: records.map(({ id }) => id),
    };
  });
}

export default function OverviewPage() {
  const { state } = useDemo();
  const metrics = selectOverviewMetrics(state);
  const runs = selectVisibleRuns(state);
  const connectors = selectVisibleConnectors(state);
  const audits = selectAuditEvents(state).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const successRate = metrics.runs.value ? Math.round((metrics.success.value / metrics.runs.value) * 100) : 0;
  const exceptions = connectors.filter(({ status }) => ['warning', 'failed'].includes(status));

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split">
        <div><p className="eyebrow">Observe</p><h1>Operational overview</h1><p>One governed path from connector health to canonical activity, delivery, and usage.</p></div>
        <div className="page-heading__status"><StatusBadge status={exceptions.length ? 'warning' : 'healthy'} /><span>{exceptions.length} connector exceptions</span></div>
      </section>

      <section className="metric-strip" aria-label="Operational metrics">
        <article className="metric-card metric-card--primary">
          <span>Active integrations</span><strong data-testid="active-integrations-value">{metrics.integrations.value}</strong>
          <Link aria-label={`Inspect ${metrics.integrations.value} active integrations`} data-record-ids={metrics.integrations.recordIds.join(',')} to={metricLink('/app/integrations', metrics.integrations.recordIds)}>Inspect contributing records →</Link>
        </article>
        <article className="metric-card">
          <span>Run success</span><strong data-testid="success-rate-value">{successRate}%</strong><small>{metrics.success.value} of {metrics.runs.value} runs</small>
        </article>
        <article className="metric-card">
          <span>Entities processed</span><strong>{metrics.entities.value.toLocaleString()}</strong><small>{metrics.entities.recordIds.length} governed runs</small>
        </article>
        <article className="metric-card metric-card--exception">
          <span>Needs attention</span><strong>{metrics.failed.value}</strong><small>{metrics.failed.value} failed runs need attention</small>
        </article>
      </section>

      <section className="overview-grid">
        <ThroughputChart title="Entities processed" points={chartPoints(runs)} />
        <article className="panel exception-panel">
          <header><div><p className="eyebrow">Action queue</p><h2>Connector exceptions</h2></div><Link to="/app/integrations">View all</Link></header>
          <ul className="record-list">
            {exceptions.map((connector) => <li key={connector.id}><div><strong>{connector.name}</strong><small>{connector.id}</small></div><StatusBadge status={connector.status} /></li>)}
          </ul>
        </article>
      </section>

      <section className="overview-grid overview-grid--lower">
        <article className="panel">
          <header><div><p className="eyebrow">Shared journal</p><h2>Recent activity</h2></div><Link to="/app/audit">Audit trail</Link></header>
          <ul className="activity-list">{audits.slice(0, 5).map((event) => <li key={event.id}><span className="activity-list__rail" /><div><strong>{event.action}</strong><small>{event.resourceId} · {event.requestId}</small></div></li>)}</ul>
        </article>
        <article className="panel usage-panel"><p className="eyebrow">Usage projection</p><h2>{metrics.usage.value.toLocaleString()} entities metered</h2><p>Every quantity points back to an auditable source event. No separate dashboard counter.</p><Link to="/app/audit" data-record-ids={metrics.usage.recordIds.join(',')}>Trace metering sources →</Link></article>
      </section>
    </div>
  );
}
