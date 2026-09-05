import { Button, Eyebrow } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { LANDING_FLOW, LANDING_TRACE } from '../../demo/presentation';

const PROVIDERS = ['UKG Pro', 'Xperience', 'Docebo', 'LinkedIn Learning', 'Axonify', 'Tableau'];

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
            A fictional credit union moves every new hire from its HR systems of record into three
            learning platforms, and every course completion back out to analytics. AetherSDK is the
            tenant-aware control plane for that typed, multi-provider synchronization—identity,
            execution, audit, delivery, recovery, and usage sharing one context.
          </p>
          <div className="landing__actions">
            <Button onClick={onLaunch}>Launch demo <span aria-hidden="true">↗</span></Button>
            <span>Portfolio demo · mock data</span>
          </div>
          <div className="landing__providers" aria-label="Featured integrations">
            {PROVIDERS.map((provider) => <span key={provider}>{provider}</span>)}
          </div>
        </div>

        <div className="landing__signal" aria-label="Illustrative live sync trace">
          <div className="landing__signal-head">
            <span>{LANDING_TRACE.runId}</span>
            <StatusBadge status="running" />
          </div>
          <div className="landing__signal-number">{LANDING_TRACE.durationMs.toLocaleString('en-US')}<span>ms</span></div>
          <p>{LANDING_TRACE.caption}</p>
          <div className="landing__bars" aria-hidden="true">
            {LANDING_TRACE.bars.map((height, index) => (
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
          {LANDING_FLOW.map(([number, title, detail]) => (
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
