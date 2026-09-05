import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PERMISSION_LABELS, PERSONAS } from '../../access/policy';
import { useDemo } from '../../demo/context';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectMembers } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import AccessPage from './AccessPage';

/* Reads the newest audit event straight from the reducer so tests assert the
   state transition, not just the copy. */
function AuditProbe() {
  const { state } = useDemo();
  const latest = state.auditEvents[state.auditOrder[0]];
  return <span data-testid="latest-audit">{latest ? `${latest.action}:${latest.resourceType}` : ''}</span>;
}

function renderAccess(state = buildState()) {
  return render(
    <MemoryRouter>
      <DemoProvider initialState={state} autopilotEnabled={false}><AccessPage /><AuditProbe /></DemoProvider>
    </MemoryRouter>,
  );
}

function memberRows() {
  return within(screen.getByRole('table', { name: 'Tenant members' })).getAllByRole('row').slice(1);
}

describe('AccessPage', () => {
  it('switches between Members, Roles, and SCIM tabs', async () => {
    const user = userEvent.setup();
    renderAccess();
    expect(screen.getByRole('heading', { name: 'Access control' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Roles' }));
    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Platform Admin' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'SCIM' }));
    expect(screen.getByRole('heading', { name: 'SCIM provisioning' })).toBeVisible();
    expect(screen.queryByRole('table', { name: 'Tenant members' })).not.toBeInTheDocument();
  });

  it('lists every tenant identity with role, status, and a read-only drawer', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderAccess(state);
    expect(memberRows()).toHaveLength(selectMembers(state).length);
    expect(screen.getByText('Amalia Frost')).toBeVisible();
    expect(screen.getAllByText('Service actor').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Status: Invited')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Edit Priya Nair' }));
    const drawer = screen.getByRole('dialog', { name: 'Priya Nair' });
    expect(within(drawer).getByText(/read-only projection/i)).toBeVisible();
    for (const permission of PERSONAS.auditor.permissions) expect(within(drawer).getByText(PERMISSION_LABELS[permission])).toBeVisible();
    expect(within(drawer).queryByRole('button', { name: /save|remove|deprovision/i })).not.toBeInTheDocument();
  });

  it('invites a member, shows them as invited, and records member.invited', async () => {
    const user = userEvent.setup();
    const state = buildState();
    const before = selectMembers(state).length;
    renderAccess(state);
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    const dialog = screen.getByRole('dialog', { name: 'Invite member' });
    await user.type(within(dialog).getByLabelText('Name'), 'Nia Bell');
    await user.type(within(dialog).getByLabelText('Work email'), 'nia.bell@harborline.example');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'auditor');
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(memberRows()).toHaveLength(before + 1);
    const row = screen.getByText('Nia Bell').closest('tr');
    expect(within(row).getByLabelText('Status: Invited')).toBeVisible();
    expect(within(row).getByText('Auditor')).toBeVisible();
    expect(screen.getByTestId('latest-audit')).toHaveTextContent('member.invited:member');
  });

  it('rejects a duplicate email inline without dispatching', async () => {
    const user = userEvent.setup();
    const state = buildState();
    renderAccess(state);
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    const dialog = screen.getByRole('dialog', { name: 'Invite member' });
    await user.type(within(dialog).getByLabelText('Name'), 'Amalia Again');
    await user.type(within(dialog).getByLabelText('Work email'), 'amalia.frost@harborline.example');
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/already exists/i);
    expect(screen.getByRole('dialog', { name: 'Invite member' })).toBeVisible();
    expect(screen.getByTestId('latest-audit')).not.toHaveTextContent('member.invited');
  });

  it('runs a SCIM reconciliation preview locally and records scim.reconciled', async () => {
    const user = userEvent.setup();
    const state = buildState();
    const active = selectMembers(state).filter(({ status }) => status === 'active').length;
    renderAccess(state);
    await user.click(screen.getByRole('tab', { name: 'SCIM' }));
    expect(screen.getByLabelText('Status: Connected')).toBeVisible();
    expect(screen.getByText('Write-only reference · never displayed')).toBeVisible();
    expect(screen.getByRole('table', { name: 'SCIM attribute mapping' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Run reconciliation preview' }));
    expect(screen.getByRole('status')).toHaveTextContent(`${active} identities reconciled locally · no identity provider was contacted`);
    expect(screen.getByTestId('latest-audit')).toHaveTextContent('scim.reconciled:scim');
  });

  it('renders the role comparison matrix on demand', async () => {
    const user = userEvent.setup();
    renderAccess();
    await user.click(screen.getByRole('tab', { name: 'Roles' }));
    expect(screen.queryByRole('table', { name: 'Role permission matrix' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    const matrix = screen.getByRole('table', { name: 'Role permission matrix' });
    const row = within(matrix).getByText('access:manage').closest('tr');
    expect(within(row).getByLabelText('Platform Admin: granted')).toBeVisible();
    expect(within(row).getByLabelText('Auditor: not granted')).toBeVisible();
  });

  it('gates invite and reconciliation behind access:manage', async () => {
    const user = userEvent.setup();
    renderAccess(buildState((state) => { state.activePersonaId = 'operator'; }));
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/requires access:manage/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'SCIM' }));
    expect(screen.queryByRole('button', { name: 'Run reconciliation preview' })).not.toBeInTheDocument();
  });
});
