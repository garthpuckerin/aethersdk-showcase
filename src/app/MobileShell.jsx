import { NavLink, Outlet } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { useDemo } from '../demo/context';
import { selectRuntimeHealth, selectVisibleRuns } from '../demo/selectors';

export default function MobileShell({ onReset }) {
  const { state } = useDemo();
  const runs = selectVisibleRuns(state);
  const activeRun = runs.find(({ status }) => status === 'running') ?? runs[0];
  const runtimeHealth = selectRuntimeHealth(state);
  return (
    <div className="mobile-shell">
      <header className="mobile-header"><div><span className="brand__mark" aria-hidden="true"><span /></span><strong>AetherSDK</strong></div><StatusBadge status={runtimeHealth} /></header>
      <main className="mobile-main"><Outlet context={{ onReset }} /></main>
      <p className="mobile-boundary">Portfolio demo · mock data</p>
      <nav className="mobile-nav" aria-label="Companion">
        <NavLink to="/mobile/home"><span aria-hidden="true">⌁</span>Home</NavLink>
        <NavLink to={`/mobile/runs/${activeRun.id}`}><span aria-hidden="true">↯</span>Active</NavLink>
        <NavLink to="/mobile/more"><span aria-hidden="true">•••</span>More</NavLink>
      </nav>
    </div>
  );
}
