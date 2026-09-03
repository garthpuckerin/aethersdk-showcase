import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { can } from '../../access/policy';
import StatusBadge from '../../components/StatusBadge';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { selectDeadLetters } from '../../demo/selectors';

export default function MobileMorePage() {
  const { onReset } = useOutletContext();
  const { state, dispatch } = useDemo();
  const [replayed, setReplayed] = useState(false);
  const deadLetters = selectDeadLetters(state);
  const mayReplay = can(state.activePersonaId, 'delivery:replay');
  function replay(deadLetterId) {
    dispatch({ type: ACTIONS.REPLAY_DEAD_LETTER, deadLetterId });
    setReplayed(true);
  }
  return (
    <div className="mobile-stack">
      <section className="mobile-title"><p className="eyebrow">Companion</p><h1>More</h1><p>Recovery controls and full-console handoff.</p></section>
      <section><div className="mobile-section-head"><h2>Dead-letter queue</h2><span>{deadLetters.length}</span></div><div className="mobile-card-list">{deadLetters.map((item) => <article className="mobile-record mobile-record--stack" data-testid={`mobile-dlq-${item.id}`} key={item.id}><div><strong>{item.id}</strong><small>{item.deliveryId}</small></div><p>{item.reason}</p>{mayReplay ? <button className="button button--primary" type="button" onClick={() => replay(item.id)}>Replay dead letter</button> : <p className="permission-note">Requires delivery:replay permission.</p>}</article>)}</div>{replayed && <output className="recovery-proof">Delivery replayed successfully. Audit and metering records were created.</output>}</section>
      <section className="mobile-link-stack"><Link className="button button--ghost button-link" to="/app/overview?view=desktop">Open full desktop console</Link><button className="button button--ghost" type="button" onClick={onReset}>Return to launch page</button><div><span>Environment</span><StatusBadge status="healthy" /><strong>Simulated</strong></div></section>
    </div>
  );
}
