import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { selectDeadLetters, selectOverviewMetrics, selectVisibleConnectors, selectVisibleRuns } from '../../demo/selectors';

export default function MobileHomePage() {
  const { state } = useDemo();
  const tenant = state.tenants[state.activeTenantId];
  const metrics = selectOverviewMetrics(state);
  const connectors = selectVisibleConnectors(state);
  const runs = selectVisibleRuns(state);
  const activeRun = runs.find(({ status }) => status === 'running');
  const failedRun = runs.find(({ status }) => status === 'failed');
  const exceptions = connectors.filter(({ status }) => ['warning', 'failed'].includes(status));
  const deadLetters = selectDeadLetters(state);
  const dependencies = Object.values(state.dependencies);
  const health = dependencies.some(({ status }) => status === 'failed') ? 'failed' : dependencies.some(({ status }) => status === 'warning') ? 'warning' : 'healthy';
  return (
    <div className="mobile-stack">
      <section className="mobile-title"><p className="eyebrow">{tenant.name}</p><h1>Operations pulse</h1><p>Fast triage over the same governed records as the desktop console.</p></section>
      <section className="mobile-health-card"><div><span>Runtime health</span><strong>{health}</strong></div><StatusBadge status={health} /><dl><div><dt>Active integrations</dt><dd>{metrics.integrations.value}</dd></div><div><dt>Failed runs</dt><dd>{metrics.failed.value}</dd></div><div><dt>DLQ</dt><dd>{deadLetters.length}</dd></div></dl></section>
      <section><div className="mobile-section-head"><h2>Needs attention</h2><Link to="/mobile/more">View queue</Link></div><div className="mobile-card-list">{exceptions.map((connector) => <Link className="mobile-record" key={connector.id} to={`/app/integrations?records=${connector.id}&view=desktop`}><div><strong>{connector.name}</strong><small>{connector.id}</small></div><StatusBadge status={connector.status} /></Link>)}</div></section>
      <section><div className="mobile-section-head"><h2>Runs</h2></div><div className="mobile-card-list">{activeRun && <Link className="mobile-record mobile-record--dark" aria-label={`Open active run ${activeRun.id}`} to={`/mobile/runs/${activeRun.id}`}><div><span>Active run</span><strong>{activeRun.id}</strong></div><StatusBadge status={activeRun.status} /></Link>}{failedRun && <Link className="mobile-record" aria-label={`Open failed run ${failedRun.id}`} to={`/mobile/runs/${failedRun.id}`}><div><span>Latest failure</span><strong>{failedRun.id}</strong></div><StatusBadge status={failedRun.status} /></Link>}</div></section>
      <section><div className="mobile-section-head"><h2>Dead letters</h2><Link to="/mobile/more">Manage</Link></div><div className="mobile-card-list">{deadLetters.map((item) => <Link className="mobile-record" key={item.id} to="/mobile/more"><div><strong>{item.id}</strong><small>{item.deliveryId}</small></div><span>Inspect →</span></Link>)}</div></section>
    </div>
  );
}
