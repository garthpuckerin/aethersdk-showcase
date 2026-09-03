import { Navigate, Route, Routes } from 'react-router-dom';
import { can } from '../access/policy';
import DataState from '../components/DataState';
import { useDemo } from '../demo/context';
import AppShell from './AppShell';
import { ROUTES } from './routeRegistry';

function AuthorizedPage({ route }) {
  const { state } = useDemo();
  if (!can(state.activePersonaId, route.permission)) {
    return <DataState state="denied" title="Permission required" detail={`This route requires ${route.permission}. Switch persona to continue.`} />;
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
