import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { can, PERSONAS } from '../access/policy';
import Dialog from '../components/Dialog';
import StatusBadge from '../components/StatusBadge';
import { ToastProvider } from '../components/Toast';
import { useDemo } from '../demo/context';
import { savePreference } from '../demo/persistence';
import { ACTIONS } from '../demo/reducer';
import { selectDeadLetters, selectExceptions, selectRuntimeHealth, selectTenant, selectUsageMetric } from '../demo/selectors';
import CommandPalette from './CommandPalette';
import DemoControl from './DemoControl';
import { ROUTES } from './routeRegistry';

const GROUPS = ['Observe', 'Operate', 'Govern', 'System'];
const DENSITIES = [['roomy', 'Roomy'], ['dense', 'Dense']];
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function navCounts(state) {
  const exceptions = selectExceptions(state);
  const deadLetters = selectDeadLetters(state);
  return {
    '/app/integrations': { value: exceptions.connectors.length, label: 'connectors needing attention' },
    '/app/webhooks': { value: deadLetters.length, label: 'dead letters awaiting replay' },
  };
}

function NavCount({ count }) {
  if (!count?.value) return null;
  return <span className="nav-count" aria-label={`${count.value} ${count.label}`}>{count.value}</span>;
}

function TierCard({ tenant, usage }) {
  const share = tenant.entityLimit ? Math.min(100, Math.round((usage.value / tenant.entityLimit) * 100)) : 0;
  return (
    <div className="sidebar__tier" data-testid="sidebar-tier">
      <span>{tenant.plan} tier</span>
      <strong>{compact.format(usage.value)} / {compact.format(tenant.entityLimit)} entity events this period</strong>
      <div className="usage-bar">
        <progress value={usage.value} max={tenant.entityLimit} aria-label={`Entity events used: ${share}% of the ${tenant.plan} tier`} />
      </div>
    </div>
  );
}

function TenantSwitcher({ state }) {
  const tenant = selectTenant(state);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const tenants = Object.values(state.tenants);
  return (
    <>
      <button ref={triggerRef} type="button" className="tenant-switcher" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Tenant: ${tenant.shortName}`}>
        <span>{tenant.shortName}</span><small className="mono">{tenant.id}</small><span aria-hidden="true">▾</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Switch tenant" returnFocusRef={triggerRef}>
        <p className="lede">Every record in this cockpit is scoped to one tenant. The second tenant exists only to prove isolation.</p>
        <ul className="record-list tenant-list" aria-label="Tenants">
          {tenants.map((item) => {
            const isActive = item.id === state.activeTenantId;
            return (
              <li key={item.id}>
                <div>
                  <span className="avatar" aria-hidden="true">{item.shortName.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.id} · {item.plan} · {item.region}</small>
                  </div>
                </div>
                {isActive
                  ? <StatusBadge status="active" />
                  : <button type="button" className="button button--ghost button--sm" disabled title="Isolation control — not selectable in the demo">Isolation control — not selectable in the demo</button>}
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}

function DensityControl({ density, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Information density">
      {DENSITIES.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={density === value} onClick={() => onChange(value)}>{label}</button>
      ))}
    </div>
  );
}

export default function AppShell({ onReplayOnboarding, onReset }) {
  const { state, dispatch } = useDemo();
  const runtimeHealth = selectRuntimeHealth(state);
  const tenant = selectTenant(state);
  const usage = selectUsageMetric(state);
  const counts = navCounts(state);
  const persona = PERSONAS[state.activePersonaId];

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.density = state.density;
  }, [state.density, state.theme]);

  function setDensity(density) {
    savePreference('density', density);
    dispatch({ type: ACTIONS.SET_DENSITY, density });
  }

  return (
    <ToastProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand sidebar__brand" href="/" aria-label="AetherSDK home">
            <span className="brand__mark" aria-hidden="true"><span /></span><span>AetherSDK</span>
          </a>
          <nav aria-label="Primary" className="primary-nav">
            {GROUPS.map((group) => {
              const groupRoutes = ROUTES.filter((route) => route.group === group && route.nav !== false && can(state.activePersonaId, route.permission));
              if (!groupRoutes.length) return null;
              return (
                <section key={group}>
                  <h2>{group}</h2>
                  {groupRoutes.map((route) => (
                    <NavLink key={route.path} to={route.path} end={route.path !== '/app/runs'}>
                      {route.label}
                      <NavCount count={counts[route.path]} />
                    </NavLink>
                  ))}
                </section>
              );
            })}
          </nav>
          <TierCard tenant={tenant} usage={usage} />
          <div className="sidebar__foot">
            <span>Portfolio demo · mock data</span>
            <span>Fictional tenant and records</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <TenantSwitcher state={state} />
            <CommandPalette routes={ROUTES} />
            <div className="topbar__spacer" />
            <DensityControl density={state.density} onChange={setDensity} />
            <div className="topbar__context"><StatusBadge status={runtimeHealth} /><span className="environment-label">Simulated</span></div>
            <DemoControl onReplayOnboarding={onReplayOnboarding} onReset={onReset} />
          </header>
          <div className="page"><Outlet /></div>
          <span className="sr-only">Current persona: {persona.label}</span>
        </div>
      </div>
    </ToastProvider>
  );
}
