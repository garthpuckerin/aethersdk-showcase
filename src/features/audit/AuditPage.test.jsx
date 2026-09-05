import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { selectAuditEvents, selectDeliveries } from '../../demo/selectors';
import { buildState } from '../../test/fixture-builders';
import AuditPage from './AuditPage';

function renderAudit(state = buildState(), route = '/app/audit') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <DemoProvider initialState={state} autopilotEnabled={false}><AuditPage /></DemoProvider>
    </MemoryRouter>,
  );
}

function rows() {
  return within(screen.getByRole('table', { name: 'Audit events' })).getAllByRole('row').slice(1);
}

describe('AuditPage', () => {
  it('shows the agent actor kind and its run id on agent events', async () => {
    const user = userEvent.setup();
    const state = buildState();
    const preview = selectAuditEvents(state).find(({ action }) => action === 'sync.previewed');
    expect(preview).toBeTruthy();
    renderAudit(state);
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), preview.requestId);
    const agentRows = rows().filter((row) => within(row).queryByText('Provisioning agent'));
    expect(agentRows.length).toBeGreaterThanOrEqual(2);
    for (const row of agentRows) {
      expect(within(row).getByText(/agent/, { selector: 'small' })).toBeVisible();
      expect(within(row).getByText(preview.actorRunId)).toBeVisible();
    }
  });

  it('filters the stream by resource-type chip', async () => {
    const user = userEvent.setup();
    const state = buildState();
    const memberEvents = selectAuditEvents(state).filter(({ resourceType }) => resourceType === 'member');
    renderAudit(state);
    expect(screen.getByRole('heading', { name: 'Audit trail' })).toBeVisible();
    expect(screen.getByText(`Read-only, tamper-evident event stream · ${selectAuditEvents(state).length} events`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'member' }));
    expect(screen.getByRole('button', { name: 'member' })).toHaveAttribute('aria-pressed', 'true');
    expect(rows()).toHaveLength(memberEvents.length);
    for (const row of rows()) expect(within(row).getByRole('link', { name: /actor_/ })).toHaveAttribute('href', '/app/access');
  });

  it('finds a single event by request id', async () => {
    const user = userEvent.setup();
    renderAudit();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'req_gov_04');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('evt_gov_04')).toBeVisible();
    expect(screen.getByText('member.invited')).toBeVisible();
    expect(screen.getByText(/showing 1–1 of 1 events/i)).toBeVisible();
  });

  it('links a delivered event to its delivery and honours ?records=', () => {
    const state = buildState();
    const delivery = selectDeliveries(state).find(({ eventId }) => state.auditEvents[eventId]);
    const expected = selectDeliveries(state).find(({ eventId }) => eventId === delivery.eventId);
    renderAudit(state, `/app/audit?records=${delivery.eventId}`);
    expect(rows()).toHaveLength(1);
    const row = rows()[0];
    expect(within(row).getByRole('link', { name: 'View delivery' })).toHaveAttribute('href', `/app/webhooks?records=${expected.id}`);
    expect(within(row).getByRole('link', { name: state.auditEvents[delivery.eventId].resourceId })).toHaveAttribute('href', `/app/runs/${state.auditEvents[delivery.eventId].resourceId}`);
    expect(screen.getByRole('button', { name: 'Show all events' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /delete|edit/i })).not.toBeInTheDocument();
  });

  it('records an export request as an audit event without producing a file', async () => {
    const user = userEvent.setup();
    renderAudit();
    await user.click(screen.getByRole('button', { name: 'audit' }));
    const before = rows().length;
    await user.click(screen.getByRole('button', { name: 'Export' }));
    const dialog = screen.getByRole('dialog', { name: 'Export audit trail' });
    await user.click(within(dialog).getByRole('button', { name: 'Last 7 days' }));
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Format' }), 'CSV');
    await user.click(within(dialog).getByRole('button', { name: 'Request export' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Export requested — recorded as an audit event');
    expect(screen.getByRole('status')).toHaveTextContent('no file is produced');
    expect(rows()).toHaveLength(before + 1);
    expect(screen.getByText('7-day export · CSV')).toBeVisible();
  });

  it('withholds the export action from a persona without audit permissions', () => {
    renderAudit(buildState((state) => { state.activePersonaId = 'developer'; }));
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.getByText(/needs audit:export or audit:view/i)).toBeVisible();
  });
});
