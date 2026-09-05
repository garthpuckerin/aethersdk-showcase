import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../components/Dialog';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectVisibleConnectors } from '../../demo/selectors';
import { operationLabel, providerFor } from './runFormat';

const BATCH = { min: 1, max: 500, initial: 25 };
const HR_TARGETS = ['con_docebo', 'con_linkedin', 'con_axonify'];
const LEARNING_TARGETS = ['con_tableau'];
const DEFAULT_SOURCE = 'con_ukg';

function operationsFor(entityType = '') {
  if (entityType.includes('employee')) return ['provision', 'deactivate'];
  if (entityType.includes('course')) return ['completion'];
  if (entityType.includes('ticket')) return ['ticket_sync'];
  return ['notify'];
}

function defaultTargets(category, candidates) {
  const preferred = category === 'HRIS' ? HR_TARGETS : category === 'Learning' ? LEARNING_TARGETS : [];
  const chosen = candidates.filter(({ id }) => preferred.includes(id)).map(({ id }) => id);
  return chosen.length ? chosen : candidates.slice(0, 1).map(({ id }) => id);
}

/* "Run a sync": source, entity type, targets, operation, batch. Start
   dispatches START_SYNC and follows the new run once the reducer names it. */
export default function RunSyncDialog({ open, onClose, returnFocusRef }) {
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const connectors = selectVisibleConnectors(state);
  const [sourceId, setSourceId] = useState(() => (connectors.some(({ id }) => id === DEFAULT_SOURCE) ? DEFAULT_SOURCE : connectors[0]?.id));
  const [entityTypeChoice, setEntityTypeChoice] = useState(null);
  const [targetChoice, setTargetChoice] = useState(null);
  const [operationChoice, setOperationChoice] = useState(null);
  const [batch, setBatch] = useState(String(BATCH.initial));
  const awaitingRef = useRef(null);
  const batchId = useId();

  const source = state.connectors[sourceId] ?? connectors[0];
  const provider = source ? providerFor(state, source.id) : null;
  const entityTypes = provider?.entityTypes ?? [];
  const entityType = entityTypes.includes(entityTypeChoice) ? entityTypeChoice : entityTypes[0];
  const candidates = connectors.filter((connector) => connector.id !== source?.id && providerFor(state, connector.id)?.entityTypes.includes(entityType));
  const selected = (targetChoice ?? defaultTargets(provider?.category, candidates)).filter((id) => candidates.some((connector) => connector.id === id));
  const operations = operationsFor(entityType);
  const operation = operations.includes(operationChoice) ? operationChoice : operations[0];
  const batchSize = Number(batch);
  const batchValid = Number.isInteger(batchSize) && batchSize >= BATCH.min && batchSize <= BATCH.max;
  const topRunId = state.runOrder[0];

  useEffect(() => {
    if (awaitingRef.current === null || topRunId === awaitingRef.current) return;
    awaitingRef.current = null;
    onClose();
    navigate(`/app/runs/${topRunId}`);
  }, [navigate, onClose, topRunId]);

  function chooseSource(id) {
    setSourceId(id);
    setEntityTypeChoice(null);
    setTargetChoice(null);
    setOperationChoice(null);
  }

  function chooseEntityType(type) {
    setEntityTypeChoice(type);
    setTargetChoice(null);
    setOperationChoice(null);
  }

  function toggleTarget(id) {
    setTargetChoice(selected.includes(id) ? selected.filter((target) => target !== id) : [...selected, id]);
  }

  function start(event) {
    event.preventDefault();
    if (!source || !batchValid || !selected.length) return;
    awaitingRef.current = topRunId ?? '';
    dispatch({ type: ACTIONS.START_SYNC, sourceConnectorId: source.id, targetConnectorIds: selected, entityType, entitiesProcessed: batchSize, operation });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Run a sync" returnFocusRef={returnFocusRef}>
      {!source && <p className="permission-note">No connectors are visible to this persona.</p>}
      {source && (
        <form className="form-grid" onSubmit={start}>
          <div className="callout"><strong>Executes locally under the demo engine.</strong><p>No provider is contacted. Stages advance on their own and the run lands in the table, the audit trail, and metering like any other.</p></div>
          <label className="field"><span>Source</span>
            <select value={source.id} onChange={(event) => chooseSource(event.target.value)}>{connectors.map((connector) => <option key={connector.id} value={connector.id}>{connector.name}</option>)}</select>
          </label>
          <label className="field"><span>Entity type</span>
            <select value={entityType} onChange={(event) => chooseEntityType(event.target.value)}>{entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          </label>
          <fieldset className="run-targets"><legend>Targets</legend>
            <div className="check-list">
              {candidates.map((connector) => <label key={connector.id}><input type="checkbox" checked={selected.includes(connector.id)} onChange={() => toggleTarget(connector.id)} />{connector.name}</label>)}
            </div>
            {!candidates.length && <small className="muted">No visible connector accepts {entityType}.</small>}
          </fieldset>
          <div className="form-grid form-grid--pair">
            <label className="field"><span>Operation</span>
              <select value={operation} onChange={(event) => setOperationChoice(event.target.value)}>{operations.map((value) => <option key={value} value={value}>{operationLabel(value)}</option>)}</select>
            </label>
            <div className={`field${batchValid ? '' : ' field--error'}`}>
              <label htmlFor={batchId}>Batch size</label>
              <input id={batchId} type="number" inputMode="numeric" min={BATCH.min} max={BATCH.max} value={batch} onChange={(event) => setBatch(event.target.value)} />
              {batchValid ? <small>Entities processed in this run ({BATCH.min}–{BATCH.max}).</small> : <small className="field__error">Enter a whole number between {BATCH.min} and {BATCH.max}.</small>}
            </div>
          </div>
          <div className="form-actions">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={!batchValid || !selected.length}>Start sync</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
