import { useState } from 'react';
import { PERSONAS } from '../../access/policy';
import { Button } from '../../components/ui';
import { formatRelativeFuture } from '../../demo/clock';
import { useDemo, useRelativeTime } from '../../demo/context';
import { savePreference } from '../../demo/persistence';
import { ACTIONS } from '../../demo/reducer';
import { selectTenant, selectUsageMetric } from '../../demo/selectors';
import '../../styles/features/settings.css';

const PERIOD_DAYS = 30;
const PERIOD_MS = PERIOD_DAYS * 24 * 60 * 60 * 1000;
const THEMES = [['light', 'Light'], ['dark', 'Dark']];
const DENSITIES = [['roomy', 'Roomy'], ['dense', 'Dense']];

const BILLING_NOTICE = 'No billing portal is connected in this demo.';
const DELETE_NOTICE = 'Destructive actions are disabled in this portfolio demo. No tenant data changed.';

/* The billing period is 30 days from tenant creation, rolled forward to the
   first boundary after the ticking clock. Derived, never hand-typed. */
function nextRenewalIso(createdAtIso, nowIso) {
  const created = Date.parse(createdAtIso);
  const elapsed = Math.max(0, Date.parse(nowIso) - created);
  const periods = Math.floor(elapsed / PERIOD_MS) + 1;
  return new Date(created + periods * PERIOD_MS).toISOString();
}

function Segmented({ label, options, value, onChange }) {
  const id = `settings-pref-${label.toLowerCase()}`;
  return (
    <div className="settings-pref">
      <span id={id}>{label}</span>
      <div className="segmented" role="group" aria-labelledby={id}>
        {options.map(([option, text]) => (
          <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function DangerZone({ tenant, isAdmin }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [notice, setNotice] = useState('');
  const matches = typed.trim() === tenant.shortName;

  function confirmDeletion(event) {
    event.preventDefault();
    if (!matches) return;
    setNotice(DELETE_NOTICE);
    setConfirming(false);
    setTyped('');
  }

  function cancel() {
    setConfirming(false);
    setTyped('');
  }

  return (
    <section className="panel settings-danger" aria-labelledby="settings-danger-title">
      <header>
        <div><h2 id="settings-danger-title">Danger zone</h2><p className="lede">Removing a tenant deletes its connectors, runs, deliveries, and audit history.</p></div>
        {isAdmin && !confirming && <Button variant="danger" onClick={() => setConfirming(true)}>Delete tenant</Button>}
      </header>
      {!isAdmin && <p className="permission-note">Only a Platform Admin can delete a tenant. Switch persona in Demo controls to preview this action.</p>}
      {isAdmin && confirming && (
        <form className="settings-confirm" onSubmit={confirmDeletion}>
          <label className="field">
            <span>Type <strong>{tenant.shortName}</strong> to confirm</span>
            <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" aria-describedby="settings-confirm-help" />
            <small id="settings-confirm-help">Typed confirmation is required before the control plane accepts a tenant deletion.</small>
          </label>
          <div className="form-actions">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button variant="danger" type="submit" disabled={!matches}>Confirm deletion</Button>
          </div>
        </form>
      )}
      {notice && <output className="simulation-notice" aria-live="polite">{notice}</output>}
    </section>
  );
}

export default function SettingsPage() {
  const { state, dispatch, now } = useDemo();
  const rel = useRelativeTime();
  const tenant = selectTenant(state);
  const usage = selectUsageMetric(state);
  const percentage = tenant.entityLimit ? Math.min(100, Math.round((usage.value / tenant.entityLimit) * 100)) : 0;
  const renewalIso = nextRenewalIso(tenant.createdAt, now);
  const isAdmin = PERSONAS[state.activePersonaId]?.permissions.includes('*') ?? false;
  const [planNotice, setPlanNotice] = useState('');

  function setTheme(theme) {
    savePreference('theme', theme);
    dispatch({ type: ACTIONS.SET_THEME, theme });
  }

  function setDensity(density) {
    savePreference('density', density);
    dispatch({ type: ACTIONS.SET_DENSITY, density });
  }

  function setAutopilot(autopilot) {
    dispatch({ type: ACTIONS.SET_AUTOPILOT, autopilot });
  }

  return (
    <div className="page-stack settings-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">System</p>
          <h1>Tenant settings</h1>
          <p className="lede">Tenant configuration and plan</p>
        </div>
      </section>

      <section className="grid-2">
        <article className="panel" aria-labelledby="settings-tenant-title">
          <header><h2 id="settings-tenant-title">Tenant</h2></header>
          <div className="form-grid">
            <label className="field">
              <span>Tenant name</span>
              <input value={tenant.name} readOnly aria-describedby="settings-tenant-name-help" />
              <small id="settings-tenant-name-help">Tenant identity is managed by the control plane; renaming is outside this demo&apos;s boundary.</small>
            </label>
            <label className="field">
              <span>Tenant ID</span>
              <input className="mono" value={tenant.id} readOnly />
            </label>
            <dl className="detail-list">
              <div><dt>Region</dt><dd><code>{tenant.region}</code></dd></div>
              <div><dt>Created</dt><dd>{rel(tenant.createdAt)}</dd></div>
              <div><dt>Isolation</dt><dd>Row-level tenant scope</dd></div>
            </dl>
          </div>
        </article>

        <article className="panel" aria-labelledby="settings-plan-title">
          <header>
            <div><h2 id="settings-plan-title">Plan &amp; usage</h2><p className="lede">{tenant.plan} · renews {formatRelativeFuture(renewalIso, now)}</p></div>
            <Button variant="ghost" onClick={() => setPlanNotice(BILLING_NOTICE)}>Manage plan</Button>
          </header>
          <p className="settings-usage__headline">
            <strong className="mono" data-testid="usage-value">{usage.value.toLocaleString()}</strong>
            <span> / {tenant.entityLimit.toLocaleString()} entity events this period</span>
          </p>
          <div className="usage-bar">
            <progress aria-label="Entity event usage" aria-valuemin="0" aria-valuemax={tenant.entityLimit} aria-valuenow={usage.value} max={tenant.entityLimit} value={usage.value}>{percentage}%</progress>
            <div><span data-testid="usage-percentage">{percentage}% of plan</span><span>{usage.recordIds.length} metering events · trailing {PERIOD_DAYS}d</span></div>
          </div>
          {planNotice && <output className="simulation-notice" aria-live="polite">{planNotice}</output>}
        </article>
      </section>

      <section className="grid-2">
        <article className="panel" aria-labelledby="settings-prefs-title">
          <header><div><h2 id="settings-prefs-title">Preferences</h2><p className="lede">Saved in this browser. Demo controls in the top bar change the same settings.</p></div></header>
          <div className="settings-prefs">
            <Segmented label="Theme" options={THEMES} value={state.theme} onChange={setTheme} />
            <Segmented label="Density" options={DENSITIES} value={state.density} onChange={setDensity} />
            <div className="settings-pref settings-pref--toggle">
              <label>
                <input type="checkbox" checked={state.autopilot} onChange={(event) => setAutopilot(event.target.checked)} />
                <span>Autopilot</span>
              </label>
              <small>Advances run stages and delivery attempts on their own. When off, use Demo controls → Step workflow.</small>
            </div>
          </div>
        </article>

        <article className="panel panel--muted" aria-labelledby="settings-privacy-title">
          <header><h2 id="settings-privacy-title">Data &amp; privacy</h2></header>
          <ul className="settings-privacy">
            <li>All records are fictional and local to this browser.</li>
            <li>Nothing leaves the browser — no API calls, no telemetry.</li>
            <li>Reset demo clears the persisted workflow state.</li>
          </ul>
          <p className="settings-privacy__hint">Use Demo controls → Sign out / reset demo to start over.</p>
        </article>
      </section>

      <DangerZone tenant={tenant} isAdmin={isAdmin} />
    </div>
  );
}
