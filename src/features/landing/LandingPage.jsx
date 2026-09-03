import { Button, Eyebrow } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';

const FLOW = [
  ['01', 'Resolve', 'A tenant-owned connector and typed entity enter one governed context.'],
  ['02', 'Synchronize', 'Canonical identity, provider links, and per-target outcomes stay traceable.'],
  ['03', 'Recover', 'Audit, delivery, dead letter, replay, health, and usage resolve as one chain.'],
];

export default function LandingPage({ onLaunch }) {
  return (
    <main className="landing">
      <nav className="landing__nav" aria-label="Showcase header">
        <a className="brand" href="#top" aria-label="AetherSDK home">
          <span className="brand__mark" aria-hidden="true"><span /></span>
          <span>AetherSDK</span>
        </a>
        <div className="landing__nav-actions">
          <StatusBadge status="healthy" />
          <Button onClick={onLaunch}>Launch demo</Button>
        </div>
      </nav>

      <section className="landing__hero" id="top">
        <div className="landing__hero-copy">
          <Eyebrow>Integration substrate · Operator cockpit</Eyebrow>
          <h1>The seams between systems, <em>made operable.</em></h1>
          <p className="landing__lede">
            A tenant-aware control plane for typed, multi-provider synchronization—where
            identity, execution, audit, delivery, recovery, and usage share one context.
          </p>
          <div className="landing__actions">
            <Button onClick={onLaunch}>Launch demo <span aria-hidden="true">↗</span></Button>
            <span>Portfolio demo · mock data</span>
          </div>
        </div>

        <div className="landing__signal" aria-label="Illustrative live sync trace">
          <div className="landing__signal-head">
            <span>run_live_northstar_001</span>
            <StatusBadge status="running" />
          </div>
          <div className="landing__signal-number">1,842<span>ms</span></div>
          <p>request → canonical contact → two provider outcomes</p>
          <div className="landing__bars" aria-hidden="true">
            {[36, 52, 44, 68, 61, 78, 70, 88, 81, 96, 73, 90].map((height, index) => (
              <span key={index} style={{ '--bar-height': `${height}%` }} />
            ))}
          </div>
          <div className="landing__signal-foot">
            <span>Audit linked</span><span>Delivery retrying</span><span>Usage metered</span>
          </div>
        </div>
      </section>

      <section className="landing__flow" aria-labelledby="flow-title">
        <div>
          <Eyebrow>One runtime · one context</Eyebrow>
          <h2 id="flow-title">Follow the consequence, not just the request.</h2>
        </div>
        <div className="landing__flow-grid">
          {FLOW.map(([number, title, detail]) => (
            <article key={number}>
              <span className="mono">{number}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
