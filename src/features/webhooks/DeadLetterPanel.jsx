import { can, PERMISSION_LABELS } from '../../access/policy';
import DataState from '../../components/DataState';
import { useDemo, useRelativeTime } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectDeadLetters } from '../../demo/selectors';

export default function DeadLetterPanel({ onInspect }) {
  const { state, dispatch } = useDemo();
  const rel = useRelativeTime();
  const deadLetters = selectDeadLetters(state);
  const mayReplay = can(state.activePersonaId, 'delivery:replay');
  const replay = (deadLetterId) => dispatch({ type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId });

  return (
    <section className="panel" aria-labelledby="recovery-queue-title">
      <header><div><p className="eyebrow">Recovery queue</p><h2 id="recovery-queue-title">Dead letters</h2></div><span className="muted">{deadLetters.length} retained</span></header>
      {deadLetters.length
        ? (
          <ul className="dlq-list">
            {deadLetters.map((item) => (
              <li className="dlq-item" key={item.id} data-record-id={item.id}>
                <div className="dlq-item__body">
                  <strong>{item.id}</strong>
                  <p>{item.reason}</p>
                  <small>{item.deliveryId} · retained {rel(item.createdAt)}</small>
                </div>
                <div className="dlq-item__actions">
                  <button className="button button--ghost button--sm" type="button" onClick={() => onInspect(item.deliveryId)} aria-label={`Inspect ${item.deliveryId}`}>Inspect</button>
                  {mayReplay
                    ? <button className="button button--primary button--sm" type="button" onClick={() => replay(item.id)} aria-label={`Replay dead letter ${item.id}`}>Replay dead letter</button>
                    : <p className="permission-note">Requires delivery:replay permission — {PERMISSION_LABELS['delivery:replay']}.</p>}
                </div>
              </li>
            ))}
          </ul>
        )
        : <DataState state="empty" title="No dead letters" detail="No dead letters — every delivery in the window reached its subscriber." />}
    </section>
  );
}
