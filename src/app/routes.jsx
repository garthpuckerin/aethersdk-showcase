import { Navigate, Route, Routes } from 'react-router-dom';
import { can } from '../access/policy';
import DataState from '../components/DataState';
import { useDemo } from '../demo/context';
import AppShell from './AppShell';
import { ROUTES } from './routeRegistry';

const SCENARIOS = {
  loading: { state: 'loading', title: 'Loading simulated data', detail: 'The shared scenario boundary is holding this projection in a deterministic loading state.' },
  empty: { state: 'empty', title: 'No simulated records', detail: 'The route is healthy, but this deterministic scenario contains no matching tenant records.' },
  error: { state: 'error', title: 'Simulated service error', detail: 'A sanitized local failure is active. No network request failed and no production system was contacted.' },
  denied: { state: 'denied', title: 'Permission boundary preview', detail: 'This scenario previews a denied data surface without changing the active persona policy.' },
};

function AuthorizedPage({ route }) {
  const { state } = useDemo();
  if (!can(state.activePersonaId, route.permission)) {
    return <DataState state="denied" title="Permission required" detail={`This route requires ${route.permission}. Switch persona to continue.`} />;
  }
  if (state.scenario !== 'default') {
    const scenario = SCENARIOS[state.scenario] ?? SCENARIOS.empty;
    return <DataState {...scenario} />;
  }
  const PageComponent = route.component;
  return <PageComponent route={route} />;
}

function NotFound() {
  return <DataState state="empty" title="Route not found" detail="Use the navigation or command search to return to an operational surface." />;
}

export function AppRoutes({ onReplayOnboarding, onReset }) {
  return (
    <Routes>
      <Route path="/app" element={<AppShell onReplayOnboarding={onReplayOnboarding} onReset={onReset} />}>
        <Route index element={<Navigate to="/app/overview" replace />} />
        {ROUTES.map((route) => <Route key={route.routePath} path={route.routePath} element={<AuthorizedPage route={route} />} />)}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/overview" replace />} />
    </Routes>
  );
}
