import { useId, useState } from 'react';
import { can, PERMISSION_LABELS } from '../../access/policy';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';
import { CATCH_ALL_EVENT_TYPE, DESTINATION_PATTERN, EVENT_TYPES } from './eventTypes';

const EMPTY_FORM = { name: '', eventTypes: [], destination: '', secret: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Give the subscription a name.';
  if (!form.eventTypes.length) errors.eventTypes = 'Choose at least one event type.';
  if (!DESTINATION_PATTERN.test(form.destination.trim())) errors.destination = 'Destination must be an https:// URL.';
  return errors;
}

function toggleEventType(selected, value) {
  if (value === CATCH_ALL_EVENT_TYPE) return selected.includes(value) ? [] : [CATCH_ALL_EVENT_TYPE];
  const without = selected.filter((item) => item !== value && item !== CATCH_ALL_EVENT_TYPE);
  return selected.includes(value) ? without : [...without, value];
}

function fieldClass(error) {
  return `field ${error ? 'field--error' : ''}`.trim();
}

export default function SubscriptionForm() {
  const { state, dispatch } = useDemo();
  const id = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const mayManage = can(state.activePersonaId, 'webhook:manage');
  const ids = { name: `${id}-name`, destination: `${id}-destination`, secret: `${id}-secret`, title: `${id}-title` };

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  function onSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    // The signing secret never leaves this form: only its reference is kept
    // by the tenant, so the typed value is dropped here and not dispatched.
    dispatch({ type: ACTIONS.CREATE_SUBSCRIPTION, name: form.name.trim(), eventTypes: form.eventTypes, destination: form.destination.trim() });
    setCreated(form.name.trim());
    setForm(EMPTY_FORM);
  }

  return (
    <section className="panel subscription-form" aria-labelledby={ids.title}>
      <header><div><p className="eyebrow">Destinations</p><h2 id={ids.title}>Create subscription</h2></div></header>
      <form className="form-grid" noValidate onSubmit={onSubmit}>
        <div className={fieldClass(errors.name)}>
          <label htmlFor={ids.name}>Name</label>
          <input id={ids.name} name="name" value={form.name} disabled={!mayManage} placeholder="Payroll sync receipts" onChange={(event) => update({ name: event.target.value })} aria-invalid={Boolean(errors.name)} />
          {errors.name && <p className="field__error" role="alert">{errors.name}</p>}
        </div>
        <fieldset className={fieldClass(errors.eventTypes)} disabled={!mayManage}>
          <legend>Event types</legend>
          <div className="check-list">
            {EVENT_TYPES.map((eventType) => (
              <label key={eventType.value} data-catch-all={eventType.value === CATCH_ALL_EVENT_TYPE}>
                <input type="checkbox" name="eventTypes" value={eventType.value} checked={form.eventTypes.includes(eventType.value)} onChange={() => update({ eventTypes: toggleEventType(form.eventTypes, eventType.value) })} />
                {eventType.value === CATCH_ALL_EVENT_TYPE ? <span>{eventType.label}</span> : <code>{eventType.label}</code>}
              </label>
            ))}
          </div>
          {errors.eventTypes && <p className="field__error" role="alert">{errors.eventTypes}</p>}
        </fieldset>
        <div className={fieldClass(errors.destination)}>
          <label htmlFor={ids.destination}>Destination URL</label>
          <input id={ids.destination} name="destination" type="url" inputMode="url" pattern="https://.*" value={form.destination} disabled={!mayManage} placeholder="https://hooks.example.test/aether" onChange={(event) => update({ destination: event.target.value })} aria-invalid={Boolean(errors.destination)} />
          <small>HTTPS only. The tenant signs every delivery to this endpoint.</small>
          {errors.destination && <p className="field__error" role="alert">{errors.destination}</p>}
        </div>
        <div className="field">
          <label htmlFor={ids.secret}>Signing secret</label>
          <input id={ids.secret} name="secret" type="password" autoComplete="off" value={form.secret} disabled={!mayManage} onChange={(event) => update({ secret: event.target.value })} />
          <small>Write-only. The value is stored as a reference; it is never displayed again. This console discards the typed value on submit.</small>
        </div>
        {mayManage
          ? <div className="form-actions"><button className="button button--primary" type="submit">Create subscription</button></div>
          : <p className="permission-note">Requires webhook:manage permission — {PERMISSION_LABELS['webhook:manage']}.</p>}
        {created && <p className="callout callout--positive" role="status"><strong>Subscription created</strong> · {created} is active and will receive signed deliveries.</p>}
      </form>
    </section>
  );
}
