import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { useDemo } from '../demo/context';
import { selectRuntimeHealth } from '../demo/selectors';
import { recoveryCount } from '../features/mobile/mobileData';
import '../styles/features/mobile.css';

const TABS = [
  { to: '/mobile/home', label: 'Home', glyph: '⌁' },
  { to: '/mobile/runs', label: 'Runs', glyph: '↯' },
  { to: '/mobile/queue', label: 'Queue', glyph: '⟲' },
  { to: '/mobile/more', label: 'More', glyph: '•••' },
];

/* The phone is a companion surface: triage, approvals, monitoring. Bottom
   tabs own the floor; nothing here escapes to the desktop console except the
   explicit affordances on More and on an integration's detail. */
export default function MobileShell({ onReset }) {
  const { state } = useDemo();
  const runtimeHealth = selectRuntimeHealth(state);
  const queueCount = recoveryCount(state);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.density = state.density;
  }, [state.density, state.theme]);

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <div><span className="brand__mark" aria-hidden="true"><span /></span><strong>AetherSDK</strong></div>
        <StatusBadge status={runtimeHealth} />
      </header>
      <main className="mobile-main"><Outlet context={{ onReset }} /></main>
      <p className="mobile-boundary">Portfolio demo · mock data</p>
      <nav className="mobile-nav" aria-label="Companion">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to}>
            <span aria-hidden="true">{tab.glyph}</span>
            {tab.label}
            {tab.label === 'Queue' && queueCount > 0 && <em className="nav-count" data-testid="mobile-queue-count">{queueCount}</em>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
