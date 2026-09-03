import { Link, useNavigate } from 'react-router-dom';
import { can } from '../../access/policy';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectConnectorHealth, selectVisibleRuns } from '../../demo/selectors';

function humanize(value) {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export default function ConnectorDrawer({ connectorId, onClose }) {
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const connector = state.connectors[connectorId];
  if (!connector) return null;
  const provider = state.providerDefinitions[connector.providerDefinitionId];
  const health = selectConnectorHealth(state, connectorId);
  const recentRuns = selectVisibleRuns(state).filter((run) => run.connectorId === connectorId).slice(0, 4);
  const mayValidate = can(state.activePersonaId, 'connector:validate');
  const mayRun = can(state.activePersonaId, 'sync:run');
  const compatibleTargets = ['con_hubspot', 'con_pipedrive'].filter((id) => id !== connectorId);

  function startSync() {
    dispatch({ type: ACTIONS.START_SYNC, sourceConnectorId: connectorId, targetConnectorIds: compatibleTargets });
    onClose();
    navigate(`/app/runs/${state.liveIds.runId}`);
  }

  return (
    <Drawer open title={connector.name} onClose={onClose}>
      <div className="drawer-stack">
        <div className="connector-identity"><div><p className="eyebrow">{provider.domain} provider</p><h3>{provider.name}</h3><code>{connector.id}</code></div><StatusBadge status={connector.status} /></div>
        <dl className="detail-grid">
          <div><dt>Supported entity types</dt><dd><code>{provider.entityType}</code></dd></div>
          <div><dt>Direction</dt><dd>{humanize(connector.direction)}</dd></div>
          <div><dt>Credential reference</dt><dd>{humanize(connector.credentialState)}</dd></div>
          <div><dt>Last validation</dt><dd>{connector.validatedAt}</dd></div>
          <div><dt>Last run</dt><dd>{health.lastRunId ?? 'No runs yet'}</dd></div>
        </dl>
        <section><p className="eyebrow">Recent runs</p><ul className="compact-list">{recentRuns.map((run) => <li key={run.id}><Link to={`/app/runs/${run.id}`}>{run.id}</Link><StatusBadge status={run.status} /></li>)}</ul></section>
        {mayValidate ? <button className="button button--primary" type="button" onClick={() => dispatch({ type: ACTIONS.VALIDATE_CONNECTOR, connectorId })}>Validate credential reference</button> : <p className="permission-note">Requires connector:validate permission.</p>}
        {mayRun && connector.status === 'healthy' && compatibleTargets.length > 0 && <button className="button button--primary" type="button" onClick={startSync}>Start governed sync</button>}
        <Link className="button button--ghost button-link" to="/app/overview">View updated overview</Link>
      </div>
    </Drawer>
  );
}
