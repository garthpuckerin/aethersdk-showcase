import { useCallback, useId, useState } from 'react';
import { PERSONAS } from '../../access/policy';
import Dialog from '../../components/Dialog';
import { Button } from '../../components/ui';
import { useDemo } from '../../demo/context';
import { ACTIONS } from '../../demo/reducer';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL_FORM = { name: '', email: '', roleId: 'operator' };

/* Mirrors the reducer's own guard so the form can explain a rejection
   inline instead of silently no-op'ing on dispatch. */
function validate(form, members) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  if (!name) errors.name = 'Enter the person’s name.';
  if (!email) errors.email = 'Enter a work email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  else if (Object.values(members).some((member) => member.email === email)) errors.email = 'A member with this email already exists in the tenant.';
  return errors;
}

export default function InviteMemberDialog({ open, onClose, returnFocusRef }) {
  const { state, dispatch } = useDemo();
  const fieldId = useId();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  function update(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  /* Stable identity: Dialog re-arms its focus trap whenever onClose changes,
     which would steal focus from the field being typed into. */
  const close = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    const nextErrors = validate(form, state.members);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    dispatch({ type: ACTIONS.INVITE_MEMBER, name: form.name.trim(), email: form.email.trim().toLowerCase(), roleId: form.roleId });
    close();
  }

  return (
    <Dialog open={open} onClose={close} title="Invite member" returnFocusRef={returnFocusRef}>
      <form className="form-grid" onSubmit={submit} noValidate>
        <p className="lede">Send a tenant invitation with a starting role. The invitation is recorded as <code>member.invited</code> in the audit trail.</p>
        <div className={`field ${errors.name ? 'field--error' : ''}`.trim()}>
          <label htmlFor={`${fieldId}-name`}>Name</label>
          <input id={`${fieldId}-name`} type="text" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Full name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${fieldId}-name-error` : undefined} />
          {errors.name && <span className="field__error" id={`${fieldId}-name-error`} role="alert">{errors.name}</span>}
        </div>
        <div className={`field ${errors.email ? 'field--error' : ''}`.trim()}>
          <label htmlFor={`${fieldId}-email`}>Work email</label>
          <input id={`${fieldId}-email`} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@harborline.example" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${fieldId}-email-error` : undefined} />
          {errors.email
            ? <span className="field__error" id={`${fieldId}-email-error`} role="alert">{errors.email}</span>
            : <small>Harborline staff use @harborline.example addresses.</small>}
        </div>
        <div className="field">
          <label htmlFor={`${fieldId}-role`}>Role</label>
          <select id={`${fieldId}-role`} value={form.roleId} onChange={(event) => update('roleId', event.target.value)}>
            {Object.values(PERSONAS).map((persona) => <option key={persona.id} value={persona.id}>{persona.label}</option>)}
          </select>
          <small>{PERSONAS[form.roleId]?.description}</small>
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit">Send invite</Button>
        </div>
      </form>
    </Dialog>
  );
}
