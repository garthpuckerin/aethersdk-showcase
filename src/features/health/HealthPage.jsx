import { Link } from 'react-router-dom';
import DataState from '../../components/DataState';
import StatusBadge from '../../components/StatusBadge';
import { formatUptime } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import {
  RANGES,
  selectDependencies,
  selectExceptions,
  selectLatencyStats,
  selectOverviewMetrics,
  selectRuntimeHealth,
} from '../../demo/selectors';
import '../../styles/features/health.css';

const WINDOW = '24h';
const LIVENESS_PATH = '/v1/health';
const LIVENESS_LABEL = { healthy: 'Operational', warning: 'Degraded', failed: 'Degraded' };

/* Incidents are the same exception queue the overview and the phone show,
   flattened into one relative-time list with a link to the owning surface. */
function buildIncidents(state, exceptions) {
  const runs = exceptions.failedRuns.map((run) => ({
    id: `incident_run_${run.id}`,
    tone: 'failed',
    title: run.id,
    detail: `${state.connectors[run.connectorId]?.name ?? run.connectorId} · ${run.operation} run failed`,
    at: run.completedAt ?? run.startedAt,
    to: `/app/runs/${run.id}`,
    linkLabel: 'Open run',
  }));
  const connectors = exceptions.connectors.map((connector) => ({
    id: `incident_connector_${connector.id}`,
    tone: connector.status === 'failed' ? 'failed' : 'secure',
    title: connector.name,
    detail: connector.credentialState === 'reference_expiring' ? 'Credential reference expiring' : `Connector ${connector.status}`,
    at: connector.validatedAt,
    to: '/app/integrations',
    linkLabel: 'Open integrations',
  }));
  const deadLetters = exceptions.deadLetters.map((deadLetter) => ({
    id: `incident_dlq_${deadLetter.id}`,
    tone: 'webhook',
    title: deadLetter.id,
    detail: deadLetter.reason,
    at: deadLetter.createdAt,
    to: '/app/webhooks',
    linkLabel: 'Open webhooks',
  }));
  return [...runs, ...connectors, ...deadLetters].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function DependencyRow({ dependency }) {
  const latency = dependency.status === 'warning' ? 'reconnecting' : `${dependency.latencyMs} ms`;
  return (
    <li>
      <div className="health-deps__id">
        <span className={`status-dot status-dot--${dependency.status}`} aria-hidden="true" />
        <strong>{dependency.name}</strong>
        <span>{dependency.label}</span>
        <small>{dependency.detail}</small>
      </div>
      <div className="health-deps__meta">
        <code>{latency}</code>
        <StatusBadge status={dependency.status} />
      </div>
    </li>
  );
}

export default function HealthPage() {
  const { state, now } = useDemo();
  const rel = useRelativeTime();
  const status = selectRuntimeHealth(state);
  const dependencies = selectDependencies(state);
  const metrics = selectOverviewMetrics(state, state.activePersonaId, WINDOW);
  const latency = selectLatencyStats(state, WINDOW);
  const incidents = buildIncidents(state, selectExceptions(state));
  const { runtime } = state;
  const uptimeMs = Math.max(0, Date.parse(now) - Date.parse(runtime.startedAt));
  const entitiesPerHour = Math.round(metrics.entities.value / RANGES[WINDOW].hours);

  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">System</p>
          <h1>Runtime health</h1>
          <p className="lede">Liveness, dependency readiness, and deployment identity</p>
        </div>
        <div className="page-heading__status"><StatusBadge status={status} /><span>Overall service</span></div>
      </section>

      <section className="grid-3" aria-label="Runtime vitals">
        <article className="panel health-stat">
          <span>Liveness</span>
          <div className={`health-liveness health-liveness--${status}`}>
            <span className="health-liveness__mark" aria-hidden="true"><span className={`status-dot status-dot--${status}`} /></span>
            <div>
              <strong>{LIVENESS_LABEL[status] ?? 'Degraded'}</strong>
              <code>{LIVENESS_PATH} · 200</code>
            </div>
          </div>
        </article>
        <article className="panel health-stat">
          <span>Uptime</span>
          <strong data-testid="uptime-value">{formatUptime(uptimeMs)}</strong>
          <small>since {rel(runtime.startedAt)}</small>
        </article>
        <article className="panel health-stat">
          <span>Throughput</span>
          <strong data-testid="throughput-value">{entitiesPerHour}<small>entities/hour</small></strong>
          <small>trailing {RANGES[WINDOW].hours}h · p95 {latency.p95} ms · p99 {latency.p99} ms</small>
        </article>
      </section>

      <section className="grid-main-rail">
        <article className="panel">
          <header>
            <div><h2>Dependency readiness</h2><p className="lede">Readiness follows the simulated control-plane dependencies the workflows use.</p></div>
          </header>
          <ul className="health-deps" aria-label="Runtime dependencies">
            {dependencies.map((dependency) => <DependencyRow key={dependency.id} dependency={dependency} />)}
          </ul>
        </article>
        <article className="panel">
          <header><h2>Deployment identity</h2></header>
          <dl className="detail-list">
            <div><dt>Service</dt><dd><code>{runtime.service}</code></dd></div>
            <div><dt>Engine</dt><dd>{runtime.engine}</dd></div>
            <div><dt>Region</dt><dd><code>{runtime.region}</code></dd></div>
            <div><dt>Build</dt><dd><code>{runtime.buildLabel}</code></dd></div>
            <div><dt>Runtime mode</dt><dd>Deterministic browser simulation</dd></div>
            <div><dt>Network mode</dt><dd>No API calls</dd></div>
            <div><dt>Tenant</dt><dd><code>{state.activeTenantId}</code></dd></div>
            <div><dt>Data boundary</dt><dd>Fictional fixture graph</dd></div>
          </dl>
        </article>
      </section>

      <section className="panel" aria-labelledby="health-incidents-title">
        <header>
          <div><h2 id="health-incidents-title">Recent incidents</h2><p className="lede">Failed runs in the last {RANGES[WINDOW].hours}h, connectors needing attention, and dead letters awaiting replay.</p></div>
          <span className="mono">{incidents.length} open</span>
        </header>
        {incidents.length ? (
          <ul className="activity-list health-incidents" aria-label="Recent incidents">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <span className={`activity-list__dot activity-list__dot--${incident.tone}`} aria-hidden="true" />
                <div>
                  <strong>{incident.title}</strong>
                  <small>{incident.detail}</small>
                  <Link className="health-incidents__link" to={incident.to}>{incident.linkLabel} →</Link>
                </div>
                <time>{rel(incident.at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <DataState state="empty" title="No incidents in the window" detail="Every run, connector, and delivery in the trailing window completed cleanly." />
        )}
      </section>
    </div>
  );
}
