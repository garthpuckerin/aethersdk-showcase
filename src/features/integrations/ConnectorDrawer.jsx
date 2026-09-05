import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { can } from '../../access/policy';
import Drawer from '../../components/Drawer';
import StatusBadge from '../../components/StatusBadge';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS, showcaseReducer } from '../../demo/reducer';
import { selectConnectorHealth, selectConnectorRuns, selectVisibleConnectors, selectVisibleRuns } from '../../demo/selectors';
import { AUTH_LABELS, CREDENTIAL_LABELS, DIRECTION_LABELS, OPERATION_LABELS, ROLE_LABELS, label } from './labels';
import { ProviderMark } from './providerMark';

/* The targets a governed sync from this connector naturally fans out to:
   an HR system of record provisions every learning target, a learning
   platform reports completions to analytics, anything else reuses the
   targets of its last sourced run. */
function naturalTargets(connector, candidates, runs) {
  if (connector.role === 'system_of_record') return candidates.filter(({ role }) => role === 'target');
  if (connector.role === 'target') return candidates.filter(({ role }) => role === 'analytics');
  const lastSourced = runs.find((run) => run.sourceConnectorId === connector.id);
  return candidates.filter(({ id }) => lastSourced?.targetConnectorIds.includes(id));
}

function SyncSection({ connector, provider, sectionRef, onStarted }) {
  const { state, dispatch } = useDemo();
  const candidates = selectVisibleConnectors(state).filter(({ id }) => id !== connector.id);
  const [targetIds, setTargetIds] = useState(() => naturalTargets(connector, candidates, selectVisibleRuns(state)).map(({ id }) => id));
  const [entityType, setEntityType] = useState(provider.entityTypes[0]);

  function toggleTarget(id, checked) {
    setTargetIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  }

  function startSync() {
    const action = { type: ACTIONS.START_SYNC, sourceConnectorId: connector.id, targetConnectorIds: targetIds, entityType };
    /* The reducer is pure, so previewing it tells us the run id it will assign
       (the live story id when this is the signature fan-out, a sequence id otherwise). */
    const runId = showcaseReducer(state, action).runOrder[0];
    if (runId === state.runOrder[0]) return;
    dispatch(action);
    onStarted(runId);
  }

  return (
    <section className="connector-section" ref={sectionRef} aria-labelledby={`${connector.id}-sync`}>
      <h3 className="eyebrow" id={`${connector.id}-sync`}>Start governed sync</h3>
      <p className="muted">Fan one canonical record from this connector out to every checked target under a single idempotency key.</p>
      <div className="form-grid">
        <fieldset className="field">
          <legend>Targets</legend>
          <div className="check-list">
            {candidates.map((candidate) => (
              <label key={candidate.id}>
                <input type="checkbox" checked={targetIds.includes(candidate.id)} onChange={(event) => toggleTarget(candidate.id, event.target.checked)} />
                {candidate.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Entity type</span>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            {provider.entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        {!targetIds.length && <p className="muted">Choose at least one target.</p>}
        <div className="form-actions">
          <button type="button" className="button button--primary" aria-label="Start governed sync" disabled={!targetIds.length} onClick={startSync}>Start governed sync</button>
        </div>
      </div>
    </section>
  );
}

function DisableFooter({ connector, dispatch }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <footer className="connector-footer">
        <button type="button" className="button button--danger" onClick={() => setConfirming(true)}>Disable connector</button>
      </footer>
    );
  }
  return (
    <footer className="connector-footer connector-footer--confirm">
      <p>Scheduled syncs pause until the connector is enabled again. Credential references are kept.</p>
      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={() => setConfirming(false)}>Keep enabled</button>
        <button type="button" className="button button--danger" onClick={() => { dispatch({ type: ACTIONS.SET_CONNECTOR_ENABLED, connectorId: connector.id, enabled: false }); setConfirming(false); }}>Confirm disable</button>
      </div>
    </footer>
  );
}

export default function ConnectorDrawer({ connectorId, onClose, section = null, returnFocusRef }) {
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const rel = useRelativeTime();
  const syncRef = useRef(null);
  const connector = state.connectors[connectorId];

  useEffect(() => {
    if (section === 'sync') syncRef.current?.scrollIntoView?.({ block: 'start' });
  }, [section]);

  if (!connector) return null;
  const provider = state.providerDefinitions[connector.providerDefinitionId];
  const health = selectConnectorHealth(state, connectorId);
  const recentRuns = selectConnectorRuns(state, connectorId, 5);
  const persona = state.activePersonaId;
  const mayValidate = can(persona, 'connector:validate');
  const mayRun = can(persona, 'sync:run');
  const mayManage = can(persona, 'connector:manage');
  const credentialValid = connector.credentialState === 'reference_valid';

  function onStarted(runId) {
    onClose();
    navigate(`/app/runs/${runId}`);
  }

  return (
    <Drawer open title={connector.name} onClose={onClose} returnFocusRef={returnFocusRef}>
      <div className="drawer-stack">
        <div className="connector-identity">
          <ProviderMark name={provider.name} size="lg" />
          <div className="connector-identity__body">
            <div className="connector-identity__row">
              <strong>{provider.name}</strong>
              <StatusBadge status={connector.status} />
            </div>
            <code>{connector.id}</code>
            <p>{provider.description}</p>
          </div>
        </div>

        <dl className="detail-grid">
          <div><dt>Entity types</dt><dd className="connector-entity-types">{provider.entityTypes.map((type) => <code key={type}>{type}</code>)}</dd></div>
          <div><dt>Role</dt><dd>{label(ROLE_LABELS, connector.role)}</dd></div>
          <div><dt>Direction</dt><dd>{label(DIRECTION_LABELS, connector.direction)}</dd></div>
          <div><dt>Auth</dt><dd>{label(AUTH_LABELS, provider.authType)}</dd></div>
          <div><dt>Endpoint</dt><dd><code>{provider.host}</code></dd></div>
          <div><dt>Credential reference</dt><dd>{label(CREDENTIAL_LABELS, connector.credentialState)}{connector.credentialRotatedAt && <small className="muted"> · rotated {rel(connector.credentialRotatedAt)}</small>}</dd></div>
          <div><dt>Schedule</dt><dd>{connector.scheduleMinutes == null ? 'Event-driven' : `Every ${connector.scheduleMinutes} minutes`}</dd></div>
          <div><dt>Last validation</dt><dd>{connector.validatedAt ? rel(connector.validatedAt) : 'Not yet validated'}</dd></div>
          <div><dt>Last run</dt><dd>{health.lastRunId ? <><Link to={`/app/runs/${health.lastRunId}`}>{health.lastRunId}</Link><small className="muted"> · {rel(health.lastRunAt)}</small></> : 'No runs yet'}</dd></div>
        </dl>

        <section className="connector-section" aria-labelledby={`${connector.id}-runs`}>
          <h3 className="eyebrow" id={`${connector.id}-runs`}>Recent runs</h3>
          {recentRuns.length ? (
            <ul className="connector-runs">
              {recentRuns.map((run) => (
                <li key={run.id}>
                  <div>
                    <Link to={`/app/runs/${run.id}`}>{run.id}</Link>
                    <small>{label(OPERATION_LABELS, run.operation)} · {rel(run.startedAt)}</small>
                  </div>
                  <StatusBadge status={run.status} />
                </li>
              ))}
            </ul>
          ) : <p className="muted">No runs yet for this adapter.</p>}
        </section>

        <section className="connector-section" aria-labelledby={`${connector.id}-credential`}>
          <h3 className="eyebrow" id={`${connector.id}-credential`}>Credential reference</h3>
          {mayValidate ? (
            <div className="connector-actions">
              <button type="button" className={`button ${credentialValid ? 'button--ghost' : 'button--primary'}`} onClick={() => dispatch({ type: ACTIONS.VALIDATE_CONNECTOR, connectorId })}>Validate credential reference</button>
              <button type="button" className="button button--ghost" onClick={() => dispatch({ type: ACTIONS.ROTATE_CREDENTIAL, connectorId })}>Rotate credential reference</button>
            </div>
          ) : <p className="permission-note">Validating or rotating a credential reference requires the connector:validate permission.</p>}
        </section>

        {connector.enabled ? (
          mayRun
            ? <SyncSection key={connectorId} connector={connector} provider={provider} sectionRef={syncRef} onStarted={onStarted} />
            : <section className="connector-section" ref={syncRef}><h3 className="eyebrow">Start governed sync</h3><p className="permission-note">Starting a governed sync requires the sync:run permission.</p></section>
        ) : (
          <section className="connector-section" ref={syncRef} aria-labelledby={`${connector.id}-enable`}>
            <h3 className="eyebrow" id={`${connector.id}-enable`}>Connector disabled</h3>
            <p className="muted">Scheduled and governed syncs stay paused until the connector is enabled{credentialValid ? '' : ' and its credential reference validated'}.</p>
            {mayManage
              ? <button type="button" className="button button--primary" onClick={() => dispatch({ type: ACTIONS.SET_CONNECTOR_ENABLED, connectorId, enabled: true })}>Enable connector</button>
              : <p className="permission-note">Enabling a connector requires the connector:manage permission.</p>}
          </section>
        )}

        {connector.enabled && mayManage && <DisableFooter connector={connector} dispatch={dispatch} />}
      </div>
    </Drawer>
  );
}
