import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';

function overallStatus(dependencies) {
  if (dependencies.some(({ status }) => status === 'failed')) return 'failed';
  if (dependencies.some(({ status }) => status === 'warning')) return 'warning';
  return 'healthy';
}

export default function HealthPage() {
  const { state } = useDemo();
  const dependencies = Object.values(state.dependencies).filter(({ tenantId }) => tenantId === state.activeTenantId);
  const status = overallStatus(dependencies);
  return (
    <div className="page-stack">
      <section className="page-heading page-heading--split"><div><p className="eyebrow">System</p><h1>Runtime health</h1><p>Readiness follows the actual simulated control-plane dependencies used by connector, journal, delivery, and metering workflows.</p></div><div className="health-hero"><StatusBadge status={status} /><span>Overall service</span></div></section>
      <section className="dependency-grid" aria-label="Runtime dependencies">{dependencies.map((dependency) => <article className="panel dependency-card" key={dependency.id}><div><p className="eyebrow">{dependency.id}</p><h2>{dependency.name}</h2></div><StatusBadge status={dependency.status} /><strong>{dependency.latencyMs} ms</strong><small>simulated response latency</small></article>)}</section>
      <section className="panel runtime-panel"><div><p className="eyebrow">Runtime identity</p><h2>showcase-local</h2><p>Deterministic browser simulation</p></div><dl className="detail-grid"><div><dt>Tenant</dt><dd><code>{state.activeTenantId}</code></dd></div><div><dt>Anchor time</dt><dd><code>{state.anchorTime}</code></dd></div><div><dt>Data boundary</dt><dd>Fictional fixture graph</dd></div><div><dt>Network mode</dt><dd>No API calls</dd></div></dl></section>
    </div>
  );
}
