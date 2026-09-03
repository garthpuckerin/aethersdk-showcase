import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { can, PERSONAS } from '../access/policy';
import StatusBadge from '../components/StatusBadge';
import { useDemo } from '../demo/context';
import CommandPalette from './CommandPalette';
import DemoControl from './DemoControl';
import { ROUTES } from './routeRegistry';

const GROUPS = ['Observe', 'Operate', 'Govern', 'System'];

export default function AppShell({ onReplayOnboarding, onReset }) {
  const { state } = useDemo();

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.density = state.density;
  }, [state.density, state.theme]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar__brand" href="/" aria-label="AetherSDK home">
          <span className="brand__mark" aria-hidden="true"><span /></span><span>AetherSDK</span>
        </a>
        <div className="tenant-card">
          <span>Tenant</span><strong>Northstar Labs</strong><small>tenant_northstar</small>
        </div>
        <nav aria-label="Primary" className="primary-nav">
          {GROUPS.map((group) => {
            const groupRoutes = ROUTES.filter((route) => route.group === group && route.nav !== false && can(state.activePersonaId, route.permission));
            if (!groupRoutes.length) return null;
            return (
              <section key={group}>
                <h2>{group}</h2>
                {groupRoutes.map((route) => (
                  <NavLink key={route.path} to={route.path} end={route.path !== '/app/runs'}>
                    <span aria-hidden="true">{route.icon}</span>{route.label}
                  </NavLink>
                ))}
              </section>
            );
          })}
        </nav>
        <div className="sidebar__foot">
          <span>Portfolio demo · mock data</span>
          <span>Fictional tenant and records</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <CommandPalette routes={ROUTES} />
          <div className="topbar__context"><StatusBadge status="healthy" /><span className="environment-label">Simulated</span></div>
          <DemoControl onReplayOnboarding={onReplayOnboarding} onReset={onReset} />
        </header>
        <div className="page"><Outlet /></div>
        <span className="sr-only">Current persona: {PERSONAS[state.activePersonaId].label}</span>
      </div>
    </div>
  );
}
