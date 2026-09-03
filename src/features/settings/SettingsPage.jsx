import { useState } from 'react';
import { useDemo } from '../../demo/context';
import { selectUsageMetric } from '../../demo/selectors';

export default function SettingsPage() {
  const { state } = useDemo();
  const tenant = state.tenants[state.activeTenantId];
  const usage = selectUsageMetric(state);
  const percentage = Math.min(100, Math.round((usage.value / tenant.entityLimit) * 100));
  const [notice, setNotice] = useState('');
  return (
    <div className="page-stack">
      <section className="page-heading"><p className="eyebrow">System</p><h1>Tenant settings</h1><p>Plan and usage are projections of the active tenant and metering graph. External account operations remain explicitly simulated.</p></section>
      <section className="settings-grid">
        <article className="panel plan-card"><p className="eyebrow">Current plan</p><h2>{tenant.plan}</h2><strong>{tenant.entityLimit.toLocaleString()} entity events</strong><span>per showcase billing period</span><div className="usage-bar"><progress aria-label="Entity event usage" aria-valuemin="0" aria-valuemax={tenant.entityLimit} aria-valuenow={usage.value} max={tenant.entityLimit} value={usage.value}>{percentage}%</progress><div><span>{usage.value.toLocaleString()} used</span><span>{percentage}%</span></div></div><button className="button button--ghost" type="button" onClick={() => setNotice('No billing portal is connected. This control only demonstrates the production handoff.')}>Open billing portal</button></article>
        <article className="panel"><p className="eyebrow">Tenant boundary</p><h2>{tenant.name}</h2><dl className="detail-grid detail-grid--single"><div><dt>Tenant ID</dt><dd><code>{tenant.id}</code></dd></div><div><dt>Credential storage</dt><dd>References only</dd></div><div><dt>Runtime</dt><dd>Simulated</dd></div></dl></article>
        <article className="panel danger-card"><p className="eyebrow">Protected operation</p><h2>Delete tenant</h2><p>Production deletion requires reauthentication, typed confirmation, and a server-side audit event.</p><button className="button button--ghost" type="button" onClick={() => setNotice('Destructive actions are disabled in this portfolio demo. No tenant data changed.')}>Delete tenant</button></article>
      </section>
      {notice && <output className="simulation-notice" aria-live="polite">{notice}</output>}
    </div>
  );
}
